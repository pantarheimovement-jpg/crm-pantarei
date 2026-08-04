import React from 'react';
import { X } from 'lucide-react';

export default function RevenueListModal({ title, rows, subHeader, amountHeader, onClose, emptyMessage }) {
  const fmt = (n) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—';
  const total = rows.reduce((s, x) => s + (x.amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 max-w-2xl w-full max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-[var(--crm-primary)]">{title} — {fmt(total)} ({rows.length})</h4>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        {rows.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">{emptyMessage || 'אין רשומות'}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-50 text-[var(--crm-primary)]">
                <th className="text-right p-2">שם</th>
                <th className="text-right p-2">{subHeader}</th>
                <th className="text-center p-2">{amountHeader}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id || i} className="border-b">
                  <td className="p-2 font-medium">{r.name}</td>
                  <td className="p-2 text-gray-600 text-xs">{r.sub || '—'}</td>
                  <td className="p-2 text-center text-green-700 font-semibold">{fmt(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}