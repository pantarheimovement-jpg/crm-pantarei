import React, { useState } from 'react';
import { Mail, Send, Loader2, Eye, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '../LanguageContext';

export default function NewsletterLogs({ logs, sending, onResend }) {
  const { t } = useLanguage();
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewIsWhatsapp, setPreviewIsWhatsapp] = useState(false);

  return (
    <div className="space-y-4">
      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {t('עדיין לא נשלחו ניוזלטרים', 'No newsletters sent yet')}
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{log.subject}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      log.status === 'נשלח בהצלחה'
                        ? 'bg-green-100 text-green-800'
                        : log.status?.startsWith('נשלח חלקית')
                        ? 'bg-orange-100 text-orange-800'
                        : log.status === 'נכשל'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{t('קבוצה:', 'Group:')} {log.group}</p>
                    <p>{t('נשלח ל:', 'Sent to:')} {log.recipients_count} {t('מנויים', 'subscribers')}</p>
                    <p>{t('תאריך:', 'Date:')} {new Date(log.sent_date).toLocaleString('he-IL')}</p>
                    <p>{t('נשלח על ידי:', 'Sent by:')} {log.sent_by}</p>
                    {log.error_message && (
                      <p className="text-red-600">{t('שגיאה:', 'Error:')} {log.error_message}</p>
                    )}
                  </div>
                  {log.content && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setPreviewHtml(log.content);
                          setPreviewIsWhatsapp(log.sent_by?.includes('WhatsApp') && !log.sent_by?.includes('SES') && !log.sent_by?.includes('Gmail'));
                        }}
                        className="bg-[#6D436D] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#5a365a] flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        {t('צפייה', 'Preview')}
                      </button>
                      <button
                        onClick={() => onResend(log)}
                        disabled={sending}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('שולח...', 'Sending...')}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            {t('שלח מחדש', 'Resend')}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {previewHtml && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreviewHtml(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
                {previewIsWhatsapp ? t('תצוגה מקדימה של הודעת וואטסאפ', 'WhatsApp Preview') : t('תצוגה מקדימה של המייל', 'Email Preview')}
              </h3>
              <button onClick={() => setPreviewHtml(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {previewIsWhatsapp ? (
              <div className="flex-1 w-full min-h-[300px] p-6 overflow-auto bg-[#e5ddd5]" dir="rtl">
                <div className="max-w-md mr-auto bg-[#dcf8c6] rounded-lg p-4 shadow-sm whitespace-pre-wrap text-sm text-gray-900 leading-relaxed">
                  {previewHtml}
                </div>
              </div>
            ) : (
              <iframe srcDoc={previewHtml} className="flex-1 w-full border-0 min-h-[500px]" title="Email Preview" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}