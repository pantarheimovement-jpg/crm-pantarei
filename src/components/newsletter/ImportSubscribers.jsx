import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, FileSpreadsheet, CheckCircle, AlertTriangle, Users, Download } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Known header aliases for auto-detection
const HEADER_MAP = {
  'email': 'email', 'mail': 'email', 'מייל': 'email', 'אימייל': 'email', 'e-mail': 'email', 'כתובת מייל': 'email',
  'whatsapp': 'whatsapp', 'וואטסאפ': 'whatsapp', 'phone': 'whatsapp', 'טלפון': 'whatsapp', 'נייד': 'whatsapp', 'mobile': 'whatsapp', 'tel': 'whatsapp',
  'name': 'name', 'שם': 'name', 'full_name': 'name', 'שם מלא': 'name',
  'job_title': 'job_title', 'תפקיד': 'job_title', 'title': 'job_title',
  'company': 'company', 'חברה': 'company', 'ארגון': 'company', 'organization': 'company',
  'notes': 'notes', 'הערות': 'notes', 'note': 'notes',
};

const FIXED_ORDER = ['email', 'whatsapp', 'name', 'job_title', 'company', 'notes'];

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function detectHeaders(firstRow) {
  const mapping = {};
  let detected = false;
  for (let i = 0; i < firstRow.length; i++) {
    const normalized = firstRow[i].toLowerCase().trim();
    if (HEADER_MAP[normalized]) {
      mapping[i] = HEADER_MAP[normalized];
      detected = true;
    }
  }
  return detected ? mapping : null;
}

function parseItems(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const firstRow = parseCSVLine(lines[0]);
  const headerMapping = detectHeaders(firstRow);
  const startIdx = headerMapping ? 1 : 0;

  const items = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const item = {};
    if (headerMapping) {
      for (const [colIdx, field] of Object.entries(headerMapping)) {
        item[field] = cols[parseInt(colIdx)] || '';
      }
    } else {
      for (let j = 0; j < FIXED_ORDER.length; j++) {
        item[FIXED_ORDER[j]] = cols[j] || '';
      }
    }
    if (item.email || item.whatsapp) items.push(item);
  }
  return items;
}

const SAMPLE_CSV = `email,name,whatsapp,תפקיד,חברה,הערות
dana@example.com,דנה כהן,972501111111,מורה ליוגה,סטודיו שמש,מתעניינת בלאבאן
yael@example.com,יעל לוי,972502222222,רקדנית,להקת ארבסק,הגיעה מפייסבוק
michal@example.com,מיכל אברהם,972503333333,מטפלת בתנועה,עצמאית,
sara@example.com,שרה דוד,972504444444,,סטודיו פנטהריי,חברה קיימת
noa@example.com,נועה פרידמן,972505555555,מנהלת,אורגני בע״מ,רוצה ניוזלטר חודשי
tamar@example.com,תמר רוזן,,פסיכולוגית,,רק מייל בלי וואטסאפ
,רונית שפירא,972506666666,,,רק וואטסאפ בלי מייל
avital@example.com,אביטל מזרחי,972507777777,יועצת ארגונית,קונסלט בע״מ,VIP
shira@example.com,שירה גולן,972508888888,מעצבת,סטודיו 5,מעוניינת בסדנאות
rivka@example.com,רבקה בן דוד,972509999999,מורה לפילאטיס,סטודיו גוף ונפש,הפניה מדנה כהן`;

function downloadSampleCSV() {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_subscribers.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportSubscribers({ onImportDone }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState('csv'); // 'csv' or 'paste'
  const [csvFile, setCsvFile] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [existingGroups, setExistingGroups] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const subs = await base44.entities.Subscribers.list('-created_date', 500);
    const groups = new Set();
    (subs || []).forEach(s => {
      if (s.group) groups.add(s.group);
      if (s.groups && Array.isArray(s.groups)) s.groups.forEach(g => groups.add(g));
    });
    setExistingGroups([...groups].sort());
  };

  const getSelectedGroup = () => {
    if (targetGroup === '__new__') return newGroupName.trim();
    return targetGroup;
  };

  const handleImport = async () => {
    const group = getSelectedGroup();
    if (!group) {
      alert('אנא בחרי קבוצה או הזיני שם קבוצה חדשה');
      return;
    }

    let rawText = '';
    if (mode === 'paste') {
      if (!pasteText.trim()) { alert('אנא הדביקי נתונים'); return; }
      rawText = pasteText;
    } else {
      if (!csvFile) { alert('אנא בחרי קובץ CSV'); return; }
      rawText = await csvFile.text();
    }

    setImporting(true);
    setResult(null);
    setProgress('קורא נתונים...');
    setProgressPct(0);

    const items = parseItems(rawText);
    if (items.length === 0) {
      alert('לא נמצאו רשומות תקינות (עם מייל או וואטסאפ)');
      setImporting(false);
      setProgress('');
      return;
    }

    setProgress(`נמצאו ${items.length} רשומות. טוען מנויים קיימים...`);
    setProgressPct(5);

    // Load ALL existing subscribers for dedup
    let allExisting = [];
    let hasMore = true;
    let skip = 0;
    while (hasMore) {
      const batch = await base44.entities.Subscribers.list('-created_date', 500, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allExisting = allExisting.concat(batch);
      skip += batch.length;
      if (batch.length < 500) hasMore = false;
    }

    setProgress(`בודק כפילויות מול ${allExisting.length} מנויים קיימים...`);
    setProgressPct(15);

    // Build lookup maps
    const emailMap = new Map(); // email -> subscriber
    const whatsappMap = new Map(); // whatsapp -> subscriber
    for (const s of allExisting) {
      if (s.email) emailMap.set(s.email.toLowerCase(), s);
      if (s.whatsapp) whatsappMap.set(s.whatsapp, s);
    }

    const toCreate = [];
    const toUpdateGroups = []; // {id, newGroups}
    let skipCount = 0;
    let mergeCount = 0;
    const seenEmails = new Set();
    const seenWhatsapps = new Set();

    for (const item of items) {
      const emailLower = item.email?.toLowerCase() || '';
      const whatsapp = item.whatsapp || '';

      // Dedup within import itself
      if (emailLower && seenEmails.has(emailLower)) { skipCount++; continue; }
      if (whatsapp && seenWhatsapps.has(whatsapp)) { skipCount++; continue; }

      // Check existing
      const existingByEmail = emailLower ? emailMap.get(emailLower) : null;
      const existingByWhatsapp = whatsapp ? whatsappMap.get(whatsapp) : null;
      const existing = existingByEmail || existingByWhatsapp;

      if (existing) {
        // Check if group needs to be added
        const currentGroups = existing.groups || (existing.group ? [existing.group] : []);
        if (!currentGroups.includes(group)) {
          const updatedGroups = [...currentGroups, group];
          toUpdateGroups.push({ id: existing.id, groups: updatedGroups });
          mergeCount++;
        } else {
          skipCount++;
        }
      } else {
        toCreate.push({
          email: item.email || '',
          whatsapp: whatsapp,
          name: item.name || '',
          job_title: item.job_title || '',
          company: item.company || '',
          notes: item.notes || '',
          subscribed: true,
          unsubscribe_token: generateToken(),
          source: mode === 'paste' ? 'הדבקה ידנית' : 'ייבוא CSV',
          group: group,
          groups: [group],
          marketing_consent: false,
        });
      }

      if (emailLower) seenEmails.add(emailLower);
      if (whatsapp) seenWhatsapps.add(whatsapp);
    }

    // Execute creates in batches
    const totalOps = toCreate.length + toUpdateGroups.length;
    let completed = 0;
    const BATCH_SIZE = 50;

    setProgress(`מייבא ${toCreate.length} מנויים חדשים, מעדכן ${mergeCount} קיימים...`);
    setProgressPct(20);

    // Bulk create
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);
      await base44.entities.Subscribers.bulkCreate(batch);
      completed += batch.length;
      const pct = 20 + Math.round((completed / Math.max(totalOps, 1)) * 70);
      setProgressPct(pct);
      setProgress(`נוצרו ${Math.min(i + BATCH_SIZE, toCreate.length)} מתוך ${toCreate.length} חדשים...`);
    }

    // Update groups for existing subscribers
    for (let i = 0; i < toUpdateGroups.length; i++) {
      const { id, groups } = toUpdateGroups[i];
      await base44.entities.Subscribers.update(id, { groups });
      completed++;
      if (i % 20 === 0) {
        const pct = 20 + Math.round((completed / Math.max(totalOps, 1)) * 70);
        setProgressPct(pct);
        setProgress(`מעדכן קבוצות: ${i + 1} מתוך ${toUpdateGroups.length}...`);
      }
    }

    setProgressPct(100);
    setProgress('');
    setImporting(false);
    setResult({
      total: items.length,
      created: toCreate.length,
      merged: mergeCount,
      skipped: skipCount,
      group: group,
    });
    onImportDone();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Group selection */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
          <Users className="w-5 h-5" />
          שיוך לקבוצה
        </h3>
        <p className="text-sm text-purple-700 mb-3">כל המנויים שייובאו ישויכו לקבוצה שתבחרי. אם המנוי כבר קיים — הקבוצה תתווסף אליו.</p>
        <select
          value={targetGroup}
          onChange={e => setTargetGroup(e.target.value)}
          className="w-full px-4 py-2 border border-purple-300 rounded-lg bg-white mb-2"
        >
          <option value="">-- בחרי קבוצה --</option>
          {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
          <option value="__new__">+ קבוצה חדשה...</option>
        </select>
        {targetGroup === '__new__' && (
          <input
            type="text"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="שם הקבוצה החדשה"
            className="w-full px-4 py-2 border border-purple-300 rounded-lg mt-2"
          />
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-gray-50 p-1 rounded-full">
        <button
          onClick={() => setMode('csv')}
          className={`flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'csv' ? 'bg-[#6D436D] text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          העלאת קובץ CSV
        </button>
        <button
          onClick={() => setMode('paste')}
          className={`flex-1 px-4 py-2.5 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'paste' ? 'bg-[#6D436D] text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          ✨ העתק והדבק
        </button>
      </div>

      {/* CSV file mode */}
      {mode === 'csv' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>פורמט CSV:</strong> השורה הראשונה יכולה להיות כותרות (email, name, phone, וכו׳ — גם בעברית) או ישר נתונים בסדר: מייל, וואטסאפ, שם, תפקיד, חברה, הערות.
            </p>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#6D436D] transition-colors">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 mb-3">
              {csvFile ? `📄 ${csvFile.name}` : 'גררי קובץ CSV לכאן או לחצי לבחירה'}
            </p>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={e => setCsvFile(e.target.files[0])}
              className="w-full"
            />
            </div>
            <button
            type="button"
            onClick={downloadSampleCSV}
            className="flex items-center gap-2 text-sm text-[#6D436D] hover:text-[#5a365a] font-medium transition-colors"
            >
            <Download className="w-4 h-4" />
            הורידי CSV לדוגמה לבדיקה
            </button>
            </div>
      )}

      {/* Paste mode */}
      {mode === 'paste' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>פורמט:</strong> מייל,וואטסאפ,שם,תפקיד,חברה,הערות (שורה לכל מנוי)
            </p>
            <code className="text-xs bg-white p-2 rounded block mt-2 text-gray-600" dir="ltr">
              email1@example.com,972501234567,שם<br />
              email2@example.com,,שם אחר
            </code>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="הדביקי כאן את רשימת המנויים..."
            rows="10"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
            dir="ltr"
          />
        </div>
      )}

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={importing || !getSelectedGroup() || (mode === 'csv' ? !csvFile : !pasteText.trim())}
        className="w-full bg-[#6D436D] text-white py-3 rounded-full font-bold hover:bg-[#5a365a] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
      >
        {importing ? (
          <><Loader2 className="w-5 h-5 animate-spin" />{progress || 'מייבא...'}</>
        ) : (
          <><Upload className="w-5 h-5" />ייבא מנויים לקבוצה &quot;{getSelectedGroup() || '...'}&quot;</>
        )}
      </button>

      {/* Progress bar */}
      {importing && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-[#6D436D] h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 text-center">{progress}</p>
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="font-bold text-green-900 text-lg">הייבוא הושלם!</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{result.total}</p>
              <p className="text-xs text-gray-500">סה״כ רשומות</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-xs text-gray-500">מנויים חדשים</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{result.merged}</p>
              <p className="text-xs text-gray-500">קבוצה נוספה</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-400">{result.skipped}</p>
              <p className="text-xs text-gray-500">כפילויות/דולגו</p>
            </div>
          </div>
          <p className="text-sm text-green-700">קבוצה: <strong>{result.group}</strong></p>
          {result.merged > 0 && (
            <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">{result.merged} מנויים קיימים קיבלו את הקבוצה &quot;{result.group}&quot; בנוסף לקבוצות שכבר היו להם.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}