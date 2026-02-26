import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const SUBSCRIBERS_PER_GROUP = 280;

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function ImportSubscribers({ onImportDone }) {
  const { t } = useLanguage();
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const getAvailableGroup = async () => {
    const allSubs = await base44.entities.Subscribers.list();
    const groupCounts = {};
    allSubs.forEach(sub => {
      const group = sub.group || 'קבוצה 1';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });
    let groupNum = 1;
    while (true) {
      const groupName = `קבוצה ${groupNum}`;
      if ((groupCounts[groupName] || 0) < SUBSCRIBERS_PER_GROUP) return groupName;
      groupNum++;
      if (groupNum > 1000) return `קבוצה ${groupNum}`;
    }
  };

  const handleImportCSV = async () => {
    if (!importFile || (!importFile.file && !importFile.text)) {
      alert(t('אנא הדביקי נתונים או בחרי קובץ להעלאה', 'Please paste data or select a file to upload'));
      return;
    }
    setImporting(true);
    try {
      let items = [];
      if (importFile.type === 'text' && importFile.text) {
        const lines = importFile.text.trim().split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          const parts = trimmedLine.split(',').map(p => p.trim());
          const email = parts[0], whatsapp = parts[1] || '', name = parts[2] || '',
            job_title = parts[3] || '', company = parts[4] || '', notes = parts[5] || '';
          if (email || whatsapp) items.push({ email, whatsapp, name, job_title, company, notes });
        }
      } else if (importFile.type === 'file' && importFile.file) {
        const uploadedFile = await base44.integrations.Core.UploadFile({ file: importFile.file });
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: uploadedFile.file_url,
          json_schema: {
            type: "object",
            properties: { items: { type: "array", items: { type: "object", properties: {
              email: { type: "string" }, whatsapp: { type: "string" }, name: { type: "string" },
              job_title: { type: "string" }, company: { type: "string" }, notes: { type: "string" }
            }}}}
          }
        });
        if (extractResult.status === 'success' && extractResult.output?.items) {
          items = extractResult.output.items;
        } else {
          alert(t('שגיאה בקריאת הקובץ. נסי שיטת ההעתקה וההדבקה.', 'Error reading file. Try the copy-paste method.'));
          setImporting(false);
          return;
        }
      }

      if (items.length === 0) {
        alert(t('לא נמצאו כתובות מייל או מספרי וואטסאפ תקינים', 'No valid email addresses or WhatsApp numbers found'));
        setImporting(false);
        return;
      }

      let successCount = 0, errorCount = 0, duplicateCount = 0;
      for (const item of items) {
        if (item.email || item.whatsapp) {
          try {
            let existing = [];
            if (item.email) existing = await base44.entities.Subscribers.filter({ email: item.email });
            if (existing.length === 0 && item.whatsapp) existing = await base44.entities.Subscribers.filter({ whatsapp: item.whatsapp });
            if (existing && existing.length > 0) { duplicateCount++; continue; }
            const assignedGroup = await getAvailableGroup();
            await base44.entities.Subscribers.create({
              email: item.email || '', whatsapp: item.whatsapp || '', name: item.name || '',
              job_title: item.job_title || '', company: item.company || '', notes: item.notes || '',
              group: assignedGroup, subscribed: true, unsubscribe_token: generateToken(),
              source: importFile.type === 'text' ? 'הדבקה ידנית' : 'ייבוא CSV'
            });
            successCount++;
          } catch (err) { errorCount++; }
        }
      }

      alert(`✅ הייבוא הושלם!\n\nנוספו: ${successCount} מנויים\nכבר קיימים: ${duplicateCount}\nשגיאות: ${errorCount}`);
      onImportDone();
      setImportFile(null);
    } catch (error) {
      alert(t('שגיאה בייבוא. נסי שיטת ההעתקה וההדבקה.', 'Import error. Try the copy-paste method.'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">{t('שתי דרכים לייבוא מנויים', 'Two ways to import subscribers')}</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>{t('העתק והדבק ישירות (מומלץ!)', 'Copy & Paste directly (Recommended!)')}</li>
          <li>{t('או העלה קובץ CSV', 'Or upload a CSV file')}</li>
        </ul>
        <p className="text-xs text-blue-700 mt-2">{t(`המנויים יחולקו אוטומטית לקבוצות של ${SUBSCRIBERS_PER_GROUP} מנויים`, `Imported subscribers will be automatically divided into groups of ${SUBSCRIBERS_PER_GROUP} members`)}</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-3">✨ {t('דרך 1: העתק והדבק', 'Method 1: Copy & Paste')}</h3>
        <div className="bg-white rounded p-3 mb-4">
          <p className="text-sm text-gray-700 mb-2 font-semibold">{t('פורמט:', 'Format:')}</p>
          <code className="text-xs bg-gray-100 p-2 rounded block" dir="ltr">
            email1@example.com,972501234567,שם,תפקיד,חברה,הערות<br/>
            email2@example.com,972501234568,שם<br/>
            ,972501234569,שם
          </code>
        </div>
        <div className="mt-4">
          <textarea
            value={importFile?.type === 'text' ? importFile.text : ''}
            onChange={(e) => setImportFile({ type: 'text', text: e.target.value })}
            placeholder={t('הדביקי את רשימת המנויים כאן...', 'Paste your subscriber list here...')}
            rows="8"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            dir="ltr"
          />
        </div>
        <button
          onClick={handleImportCSV}
          disabled={importing || !(importFile?.type === 'text' && importFile.text?.trim())}
          className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {importing ? <><Loader2 className="w-5 h-5 animate-spin" />{t('מייבא...', 'Importing...')}</> : <><Upload className="w-5 h-5" />{t('ייבא מנויים', 'Import Subscribers')}</>}
        </button>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-3">{t('דרך 2: העלאת קובץ CSV', 'Method 2: Upload CSV File')}</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">⚠️ {t('העלאת קובץ עלולה לגרום לבעיות קידוד', 'File upload may cause encoding issues')}</p>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setImportFile({ type: 'file', file: e.target.files[0] })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <button
          onClick={handleImportCSV}
          disabled={importing || !(importFile?.type === 'file' && importFile.file)}
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {importing ? <><Loader2 className="w-5 h-5 animate-spin" />{t('מייבא...', 'Importing...')}</> : <><Upload className="w-5 h-5" />{t('ייבא קובץ', 'Import File')}</>}
        </button>
      </div>
    </div>
  );
}