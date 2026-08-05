import React from 'react';
import { X } from 'lucide-react';
import PendingAssignRow from './PendingAssignRow';
import { assignPendingPayment, revertPendingPayment } from './assignPending';

export default function PendingAssignmentModal({ students, courses, bucketCourseId, onAssigned, onClose }) {
  const fmt = (n) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—';
  const total = students.reduce((s, x) => s + x.pendingAmount, 0);

  const handleAssign = async (row, courseId, amount) => {
    const course = courses.find(c => c.id === courseId);
    const res = await assignPendingPayment({
      studentId: row.id,
      courseId,
      courseName: course?.name || '',
      amount
    });
    onAssigned({ id: row.id, ...res.updated });
    return res;
  };

  const handleRevert = async (undo) => {
    const prev = await revertPendingPayment(undo);
    onAssigned({ id: undo.studentId, ...prev });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 max-w-4xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-bold text-[var(--crm-primary)]">ממתין לשיוך לקורס — {fmt(total)} ({students.length})</h4>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          בוחרים קורס ומשייכים. אפשר לשייך חלק מהסכום — השורה תישאר עד שהממתין יגיע לאפס.
          "נגבה בפועל" לא משתנה, רק הייחוס.
        </p>
        {students.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">אין כספים ממתינים לשיוך</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-50 text-[var(--crm-primary)]">
                <th className="text-right p-2">שם</th>
                <th className="text-center p-2">ממתין</th>
                <th className="text-right p-2">שייך לקורס</th>
                <th className="text-right p-2">סכום</th>
                <th className="text-center p-2"></th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <PendingAssignRow key={s.id} row={s} courses={courses} bucketCourseId={bucketCourseId} onAssign={handleAssign} onRevert={handleRevert} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}