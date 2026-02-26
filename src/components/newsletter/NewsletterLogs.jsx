import React from 'react';
import { Mail, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '../LanguageContext';

export default function NewsletterLogs({ logs, sending, onResend }) {
  const { t } = useLanguage();

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
                    <div className="mt-3">
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
    </div>
  );
}