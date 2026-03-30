import React, { useState } from 'react';
import { X, Send, Loader2, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TestEmailModal({ htmlContent, subject, onClose }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      alert('אנא הזיני כתובת מייל');
      return;
    }
    if (!htmlContent) {
      alert('אנא הכיני תוכן מייל קודם (בחרי תבנית, HTML, או כתבי תוכן)');
      return;
    }

    setSending(true);
    try {
      await base44.functions.invoke('sendEmailSES', {
        to: email.trim(),
        subject: subject || 'מייל ניסיון מ-Pantarhei CRM',
        html_content: htmlContent,
        from_name: 'פנטהריי'
      });
      alert(`✅ מייל ניסיון נשלח בהצלחה אל ${email}!`);
      onClose();
    } catch (error) {
      alert('שגיאה בשליחת המייל: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6D436D]/10 rounded-full">
              <Mail className="w-5 h-5 text-[#6D436D]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">שלחי מייל ניסיון</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            💡 המייל יישלח דרך המערכת המובנית של Pantarhei. הוא יגיע לתיבת הדואר שלך כדי שתוכלי לבדוק איך הוא נראה.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            כתובת מייל לניסיון
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6D436D] focus:border-transparent"
            dir="ltr"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="flex-1 bg-[#6D436D] text-white py-3 rounded-full font-semibold hover:bg-[#5a365a] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <><Loader2 className="w-5 h-5 animate-spin" />שולח...</>
            ) : (
              <><Send className="w-5 h-5" />שלחי מייל ניסיון</>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-full font-semibold hover:bg-gray-50"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}