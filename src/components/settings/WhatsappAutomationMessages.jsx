import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Send } from 'lucide-react';

const TRY_CALL_DEFAULT = 'היי {{name}}, ניסיתי ליצור איתך קשר, מתי יהיה לך נוח לדבר?';
const LBMS_DEFAULT = 'הודעות לפי סטטוס לקורסי LBMS — כתבי כאן את נוסחי ההודעות לפי סטטוס.';
const NANA_DEFAULT = 'הודעות לפי סטטוס לקורסי נענע — כתבי כאן את נוסחי ההודעות לפי סטטוס.';

export default function WhatsappAutomationMessages({ automationSettings, setAutomationSettings }) {
  const [testNumber, setTestNumber] = useState('');
  const [selectedMessageKey, setSelectedMessageKey] = useState('whatsapp_task_try_call_message');
  const [testing, setTesting] = useState(false);

  const messages = useMemo(() => [
    {
      key: 'whatsapp_task_try_call_message',
      title: 'סטטוס שיחה: ניסיון לשיחה',
      description: 'נשלחת כשהסטטוס של שיחה/משימה משתנה ל־“ניסיון לשיחה”.',
      fallback: TRY_CALL_DEFAULT,
      rows: 3,
    },
    {
      key: 'whatsapp_lbms_status_messages',
      title: 'קורסי LBMS — הודעות לפי סטטוס',
      description: 'כל נוסחי הודעות הוואטסאפ האוטומטיות לקורסי LBMS, לפי סטטוס.',
      fallback: LBMS_DEFAULT,
      rows: 5,
    },
    {
      key: 'whatsapp_nana_status_messages',
      title: 'קורסי נענע — הודעות לפי סטטוס',
      description: 'כל נוסחי הודעות הוואטסאפ האוטומטיות לקורסי נענע, לפי סטטוס.',
      fallback: NANA_DEFAULT,
      rows: 5,
    },
  ], []);

  const updateMessage = (key, value) => {
    setAutomationSettings({ ...automationSettings, [key]: value });
  };

  const getMessageValue = (item) => automationSettings?.[item.key] || item.fallback;

  const handleSendTest = async () => {
    const selected = messages.find((item) => item.key === selectedMessageKey);
    if (!selected || !testNumber.trim()) {
      alert('נא להזין מספר וואטסאפ ולבחור הודעה לבדיקה');
      return;
    }

    setTesting(true);
    try {
      const response = await base44.functions.invoke('testWhatsappAutomationMessage', {
        whatsapp_number: testNumber,
        message_content: getMessageValue(selected),
      });
      alert(response.data?.message || 'הודעת הבדיקה נוספה לתור');
    } catch (error) {
      alert(error.response?.data?.error || error.message || 'שגיאה בשליחת בדיקה');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 הודעות וואטסאפ אוטומטיות של CRM</h3>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 space-y-5">
        <p className="text-sm text-gray-700">
          כאן מרוכזות הודעות הוואטסאפ שנשלחות מאוטומציות ה־CRM, בנפרד ממערכת הדיוור.
        </p>

        {messages.map((item) => (
          <div key={item.key} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <div>
              <h4 className="font-semibold text-gray-900">{item.title}</h4>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
            <textarea
              value={getMessageValue(item)}
              onChange={(e) => updateMessage(item.key, e.target.value)}
              rows={item.rows}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500">💡 אפשר להשתמש ב־{'{{name}}'} לשם הנמען/ת.</p>
          </div>
        ))}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-gray-900">בדיקת ניסיון למספר וואטסאפ אחד</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="0501234567"
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={selectedMessageKey}
              onChange={(e) => setSelectedMessageKey(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {messages.map((item) => (
                <option key={item.key} value={item.key}>{item.title}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              שלח בדיקה לתור
            </button>
          </div>
          <p className="text-xs text-gray-600">
            הודעת הבדיקה תיכנס לתור ותישלח רק לפי מגבלות הבטיחות: 09:00–20:00, עד 10 ביום, וכל 10 דקות.
          </p>
        </div>
      </div>
    </div>
  );
}