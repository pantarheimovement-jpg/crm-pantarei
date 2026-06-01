import React from 'react';
import { MessageCircle, LinkIcon, Link2Off } from 'lucide-react';

export default function WhatsappUnsubscribeDialog({ open, onConfirm, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-green-100">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">שליחת וואטסאפ</h3>
            <p className="text-sm text-gray-500">האם לצרף קישור הסרה?</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed">
          בחרי אם לצרף קישור הסרה מרשימת התפוצה בסוף כל הודעת וואטסאפ.
          <br />
          <span className="text-gray-500">להודעות עדכון (שינוי שעה, ביטול וכו׳) — אין צורך בקישור הסרה.</span>
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onConfirm(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-white transition-colors"
            style={{ backgroundColor: '#6D436D' }}
          >
            <LinkIcon className="w-4 h-4" />
            כן, צרפי קישור הסרה
          </button>
          <button
            onClick={() => onConfirm(false)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Link2Off className="w-4 h-4" />
            לא, שלחי בלי קישור הסרה
          </button>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 mt-1"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}