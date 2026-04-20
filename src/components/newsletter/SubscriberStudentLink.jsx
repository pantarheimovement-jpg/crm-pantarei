import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, ExternalLink, Phone, Tag } from 'lucide-react';

export default function SubscriberStudentLink({ email, studentsMap }) {
  const [showPopup, setShowPopup] = useState(false);

  if (!email || !studentsMap) return null;

  const student = studentsMap[email.toLowerCase()];
  if (!student) return null;

  const courseName = student.course_name || 
    (student.courses && student.courses.length > 0 ? student.courses[0].course_name : '');

  return (
    <div className="relative inline-block">
      <Link
        to={`/Students?student_id=${student.id}`}
        className="inline-flex items-center gap-1 text-[var(--crm-primary)] hover:text-[var(--crm-primary)]/80 p-1 hover:bg-[var(--crm-primary)]/10 rounded-lg transition-colors"
        title="צפה בכרטיס משתתף"
        onMouseEnter={() => setShowPopup(true)}
        onMouseLeave={() => setShowPopup(false)}
      >
        <User className="w-4 h-4" />
      </Link>

      {showPopup && (
        <div className="absolute z-50 bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56 text-right"
          onMouseEnter={() => setShowPopup(true)}
          onMouseLeave={() => setShowPopup(false)}
        >
          <p className="font-semibold text-sm text-[var(--crm-text)]">{student.full_name}</p>
          {student.phone && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3" /> {student.phone}
            </p>
          )}
          {courseName && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Tag className="w-3 h-3" /> {courseName}
            </p>
          )}
          <Link
            to={`/Students?student_id=${student.id}`}
            className="mt-2 text-xs text-[var(--crm-primary)] hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> פתח כרטיס
          </Link>
        </div>
      )}
    </div>
  );
}