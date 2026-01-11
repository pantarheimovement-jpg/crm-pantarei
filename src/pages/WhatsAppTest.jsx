import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function WhatsAppTest() {
  const [testPhone, setTestPhone] = useState('');
  const [testName, setTestName] = useState('');
  const [testMessage, setTestMessage] = useState('היי {{name}}, זהו מסר בדיקה מהמערכת! 👋');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState('');

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    setLogs('');

    try {
      setLogs('🔄 שולח בקשה...\n');
      
      const response = await base44.functions.invoke('sendWhatsappNewsletter', {
        recipients: [{
          name: testName,
          whatsapp: testPhone
        }],
        message_template: testMessage
      });

      setLogs(prev => prev + '✅ תגובה התקבלה!\n');
      setLogs(prev => prev + `📊 תוצאה: ${JSON.stringify(response.data, null, 2)}\n`);

      if (response.data.success_count > 0) {
        setResult({ type: 'success', message: '✅ ההודעה נשלחה בהצלחה!' });
      } else {
        setResult({ 
          type: 'error', 
          message: '❌ השליחה נכשלה',
          details: response.data.failed_details 
        });
      }
    } catch (error) {
      setLogs(prev => prev + `❌ שגיאה: ${error.message}\n`);
      setResult({ 
        type: 'error', 
        message: error.message,
        details: error.response?.data 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 בדיקת וואטסאפ
          </h1>
          <p className="text-gray-600 mb-8">
            בדקי את החיבור ל-Green API ושלחי הודעת נסיון
          </p>

          {/* Form */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מספר טלפון (פורמט: 972501234567 או 0501234567)
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="972501234567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם (להחלפה ב-{'{{name}}'})
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="שרה"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                הודעה
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                השתמשי ב-{'{{name}}'} להחלפה דינמית של השם
              </p>
            </div>

            <button
              onClick={handleTest}
              disabled={loading || !testPhone}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  שלח הודעת נסיון
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-4 mb-6 ${
              result.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.type === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    result.type === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {result.message}
                  </p>
                  {result.details && (
                    <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          {logs && (
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
              <pre className="whitespace-pre-wrap">{logs}</pre>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-3">📝 הוראות בדיקה:</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>הזיני מספר טלפון תקין (שלך או של מישהו אחר) בפורמט 972501234567</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>ודאי ש-GREEN_ID ו-GREEN_TOKEN מוגדרים ב-Dashboard → Secrets</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>ודאי שה-Instance ב-Green API מחובר (Authorized) ולא ב-Suspended</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span>לחצי "שלח הודעת נסיון" וצפי בתוצאה</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">5.</span>
                <span>אם יש שגיאה, העתיקי את הלוגים למטה ושלחי לי</span>
              </li>
            </ol>
          </div>

          {/* Links */}
          <div className="mt-6 flex gap-4">
            <a
              href="https://console.green-api.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-medium transition-colors"
            >
              🔗 פתחי Green API Console
            </a>
            <a
              href="https://green-api.com/docs/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-medium transition-colors"
            >
              📚 תיעוד Green API
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}