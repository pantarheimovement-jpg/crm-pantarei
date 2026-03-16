import React from 'react';
import { GraduationCap, Calendar, MapPin, DollarSign, Users, Clock } from 'lucide-react';

export default function CourseHeader({ course, registeredCount, leadsCount }) {
  const getStatusColor = (status) => {
    const colors = {
      'פתוח להרשמה': '#297058',
      'מלא': '#D29486',
      'בתהליך': '#FAD980',
      'הסתיים': '#9E9E9E'
    };
    return colors[status] || '#6D436D';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-[var(--crm-primary)]" />
          <div>
            <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
              {course.name}
            </h1>
            {course.description && (
              <p className="text-sm text-[var(--crm-text)] opacity-70 mt-1">{course.description}</p>
            )}
          </div>
        </div>
        <span
          className="px-4 py-1 rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: getStatusColor(course.status) }}
        >
          {course.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {course.schedule && (
          <div className="flex items-center gap-2 text-sm text-[var(--crm-text)] opacity-80">
            <Clock className="w-4 h-4" />
            {course.schedule}
          </div>
        )}
        {course.location && (
          <div className="flex items-center gap-2 text-sm text-[var(--crm-text)] opacity-80">
            <MapPin className="w-4 h-4" />
            {course.location}
          </div>
        )}
        {course.price && (
          <div className="flex items-center gap-2 text-sm text-[var(--crm-text)] opacity-80">
            <DollarSign className="w-4 h-4" />
            ₪{course.price}
          </div>
        )}
        {(course.start_date || course.end_date) && (
          <div className="flex items-center gap-2 text-sm text-[var(--crm-text)] opacity-80">
            <Calendar className="w-4 h-4" />
            {course.start_date && new Date(course.start_date).toLocaleDateString('he-IL')}
            {course.start_date && course.end_date && ' - '}
            {course.end_date && new Date(course.end_date).toLocaleDateString('he-IL')}
          </div>
        )}
      </div>

      <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-[var(--crm-text)]">
            {registeredCount} רשומים
          </span>
          {course.max_students && (
            <span className="text-sm text-gray-400">/ {course.max_students}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--crm-primary)]" />
          <span className="text-sm font-medium text-[var(--crm-text)]">
            {leadsCount} לידים משויכים
          </span>
        </div>
      </div>
    </div>
  );
}