import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, Lock } from 'lucide-react';

const TRY_CALL_DEFAULT = 'היי {{name}}, ניסיתי ליצור איתך קשר, מתי יהיה לך נוח לדבר?';
const LBMS_DEFAULT = 'הודעות לפי סטטוס לקורסי LBMS — כתבי כאן את נוסחי ההודעות לפי סטטוס.';
const NANA_DEFAULT = 'הודעות לפי סטטוס לקורסי נענע — כתבי כאן את נוסחי ההודעות לפי סטטוס.';

const LOCKED_NOTE = 'הנוסח של הודעה זו מנוהל בתבנית מאושרת במטא (followup_1) ולא ניתן לעריכה כאן. לשינוי הנוסח יש להגיש תבנית חדשה במטא. הערך שמוצג משמש רק כגיבוי לטקסט חופשי בתוך חלון 24 שעות.';

export default function WhatsappAutomationMessages({ automationSettings, setAutomationSettings }) {
  const [testNumber, setTestNumber] = useState('');
  const [selectedMessageKey, setSelectedMessageKey] = useState('whatsapp_task_try_call_message');
  const [testing, setTesting] = useState(false);

  const messages = useMemo(() => [
    {
      key: 'whatsapp_task_try_call_message',
      title: 'סטטוס שיחה: ניסיון לשיחה',
      description: 'נשלחת כשהסטטוס של שיחה/משימה משתנה ל־“ניסיון לשיחה”. נשלחת כטקסט חופשי — מגיעה רק למי שכתבה לנו ב־24 השעות האחרונות (חלון וואטסאפ).',
      fallback: TRY_CALL_DEFAULT,
      rows: 3,
      locked: false,
    },
    {
      key: 'whatsapp_lbms_status_messages',
      title: 'קורסי LBMS — הודעות לפי סטטוס',
      description: 'הודעת ההרשמה האוטומטית לקורסי LBMS.',
      fallback: LBMS_DEFAULT,
      rows: 5,
      locked: true,
    },
    {
      key: 'whatsapp_nana_status_messages',
      title: 'קורסי נענע — הודעות לפי סטטוס',
      description: 'הודעת ההרשמה האוטומטית לקורסי נענע.',
      fallback: NANA_DEFAULT,
      rows: 5,
      locked: true,
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
      alert(response.data?.message || 'הודעת הבדיקה נשלחה מיד');
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
            <div className="flex items-center gap-2">
              {item.locked && <Lock className="w-4 h-4 text-amber-600" />}
              <div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </div>
            <textarea
              value={getMessageValue(item)}
              onChange={item.locked ? undefined : (e) => updateMessage(item.key, e.target.value)}
              readOnly={item.locked}
              rows={item.rows}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-sm ${item.locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            />
            {item.locked ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">🔒 {LOCKED_NOTE}</p>
            ) : (
              <p className="text-xs text-gray-500">💡 אפשר להשתמש ב־{'{{name}}'} לשם הנמען/ת.</p>
            )}
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
              {messages.filter((item) => !item.locked).map((item) => (
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
              שלח בדיקה מיד
            </button>
          </div>
          <p className="text-xs text-gray-600">
            הודעת הבדיקה נשלחת מיד כטקסט חופשי (בחלון 24 שעות בלבד). הודעות התבנית המאושרות נבדקות דרך התור.
          </p>
        </div>
      </div>
    </div>
  );
}