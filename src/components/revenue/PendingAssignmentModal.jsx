import React from 'react';
import { X } from 'lucide-react';

export default function PendingAssignmentModal({ students, onClose }) {
  const fmt = (n) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—';
  const sorted = [...students].sort((a, b) => b.pendingAmount - a.pendingAmount);
  const total = sorted.reduce((s, x) => s + x.pendingAmount, 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-[var(--crm-primary)]">ממתין לשיוך לקורס — {fmt(total)}</h4>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        {sorted.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">אין כספים ממתינים לשיוך</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-50 text-[var(--crm-primary)]">
                <th className="text-right p-2">שם</th>
                <th className="text-right p-2">טלפון</th>
                <th className="text-center p-2">סכום ממתין</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="p-2 font-medium">{s.name}</td>
                  <td className="p-2 text-gray-600">{s.phone || '—'}</td>
                  <td className="p-2 text-center text-orange-700 font-semibold">{fmt(s.pendingAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}