import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, RefreshCw, Send, Loader2, Link as LinkIcon } from 'lucide-react';

const FUNCTIONS_BASE = 'https://crm-pantarei-4738bca7.base44.app/functions/teacherCoursePage';

export default function TeacherLinkManager({ course }) {
  const [token, setToken] = useState(course.teacher_token || '');
  const [emails, setEmails] = useState(course.teacher_email || '');
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const [sending, setSending] = useState(false);

  const link = token ? `${FUNCTIONS_BASE}?token=${token}` : '';

  const generateToken = async (isRegenerate = false) => {
    if (isRegenerate && !confirm('לחדש את הקישור? הקישור הישן יפסיק לעבוד.')) return;
    setWorking(true);
    try {
      const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      await base44.entities.Course.update(course.id, { teacher_token: newToken });
      setToken(newToken);
    } catch (e) {
      alert('שגיאה ביצירת הקישור: ' + e.message);
    } finally {
      setWorking(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('העתיקי את הקישור:', link);
    }
  };

  const sendEmails = async () => {
    const list = emails.split(/[,;\n]+/).map(e => e.trim()).filter(e => e.includes('@'));
    if (!list.length) { alert('נא להזין לפחות כתובת מייל אחת תקינה'); return; }
    if (!confirm(`לשלוח את הקישור ל-${list.length} כתובות?\n${list.join('\n')}`)) return;
    setSending(true);
    const errors = [];
    for (const email of list) {
      try {
        await base44.functions.invoke('sendEmailSES', {
          to: email,
          subject: `דף הקורס שלך — ${course.name} | פנטהריי`,
          from_name: 'פנטהריי',
          html_content: `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;background:#FDF8F0;font-family:Arial,sans-serif;color:#5E4B35;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:12px;padding:28px;text-align:right;">
<h2 style="color:#6D436D;margin:0 0 12px;">שלום! 💜</h2>
<p style="font-size:15px;line-height:1.7;">מצורף הקישור האישי לדף הקורס <b>${course.name}</b>.<br>
דרך הדף ניתן לצפות ברשימת המשתתפים ולמלא נוכחות בכל מפגש — בלי צורך בהתחברות.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto;"><tr><td style="background:#6D436D;border-radius:50px;">
<a href="${link}" target="_blank" style="display:inline-block;padding:13px 34px;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">לפתיחת דף הקורס</a>
</td></tr></table>
<p style="font-size:12px;color:#999;">אם הכפתור לא עובד, אפשר להעתיק את הקישור: <br><a href="${link}" style="color:#6D436D;word-break:break-all;">${link}</a></p>
<p style="font-size:12px;color:#999;margin-top:16px;">הקישור אישי — נא לא להעביר הלאה. סטודיו פנטהריי</p>
</div></div></body></html>`
        });
      } catch (e) {
        errors.push(`${email}: ${e.response?.data?.error || e.response?.data?.message || e.message}`);
      }
    }
    setSending(false);
    if (errors.length) alert(`נשלח ל-${list.length - errors.length} כתובות.\nשגיאות:\n${errors.join('\n')}`);
    else alert(`✅ הקישור נשלח בהצלחה ל-${list.length} כתובות`);
  };

  return (
    <div className="mt-3 border border-purple-200 bg-purple-50/50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-purple-900 flex items-center gap-2">
        <LinkIcon className="w-4 h-4" /> קישור ציבורי לדף המורה (נוכחות ומשתתפים — ללא התחברות)
      </p>

      {token ? (
        <>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white px-2 py-2 rounded border select-all break-all">{link}</code>
            <Button type="button" variant="outline" size="sm" onClick={copyLink} style={{ borderRadius: 'var(--crm-button-radius)' }}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <button type="button" onClick={() => generateToken(true)} disabled={working}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${working ? 'animate-spin' : ''}`} /> חידוש קישור (הישן יתבטל)
          </button>
        </>
      ) : (
        <Button type="button" onClick={() => generateToken(false)} disabled={working}
          className="bg-[var(--crm-primary)] text-white" style={{ borderRadius: 'var(--crm-button-radius)' }}>
          {working ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <LinkIcon className="w-4 h-4 ml-2" />}
          צרי קישור לדף המורה
        </Button>
      )}

      {token && (
        <div className="pt-2 border-t border-purple-100">
          <label className="block text-xs font-medium text-gray-600 mb-1">שליחת הקישור במייל (אפשר כמה כתובות, מופרדות בפסיק)</label>
          <div className="flex gap-2">
            <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="teacher1@email.com, teacher2@email.com" className="text-sm" dir="ltr" />
            <Button type="button" onClick={sendEmails} disabled={sending}
              className="bg-[var(--crm-action)] text-[var(--crm-text)] whitespace-nowrap" style={{ borderRadius: 'var(--crm-button-radius)' }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Send className="w-4 h-4 ml-1" />}
              שלחי
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}