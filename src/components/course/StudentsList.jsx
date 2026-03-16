import React from 'react';
import { Users, Phone, Mail } from 'lucide-react';

export default function StudentsList({ students, title }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[var(--crm-primary)]" />
        <h2 className="text-xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
          {title || 'משתתפים רשומים'}
        </h2>
        <span className="text-sm text-gray-400">({students.length})</span>
      </div>

      {students.length === 0 ? (
        <p className="text-center text-gray-400 py-6">אין משתתפים רשומים</p>
      ) : (
        <div className="space-y-2">
          {students.map(student => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="font-medium text-[var(--crm-text)]">{student.full_name}</span>
                {student.courseStatus && (
                  <span className="mr-2 text-xs text-gray-500">({student.courseStatus})</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {student.phone && (
                  <a href={`tel:${student.phone}`} className="flex items-center gap-1 hover:text-[var(--crm-primary)]">
                    <Phone className="w-3.5 h-3.5" />
                    {student.phone}
                  </a>
                )}
                {student.email && (
                  <a href={`mailto:${student.email}`} className="flex items-center gap-1 hover:text-[var(--crm-primary)]">
                    <Mail className="w-3.5 h-3.5" />
                    {student.email}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}