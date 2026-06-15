import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { GraduationCap, Calendar, MapPin, DollarSign, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const NANA_PRICE_ROWS = [
  { label: 'שבוע ראשון', earlyKey: 'price_early_week1', lateKey: 'price_late_week1' },
  { label: 'שבוע שני', earlyKey: 'price_early_week2', lateKey: 'price_late_week2' },
  { label: 'שבועיים מלאים', earlyKey: 'price_early_two_weeks', lateKey: 'price_late_two_weeks' },
  { label: '3 ימים שבוע א׳', earlyKey: 'price_early_3days_week1', lateKey: 'price_late_3days_week1' },
  { label: '3 ימים שבוע ב׳', earlyKey: 'price_early_3days_week2', lateKey: 'price_late_3days_week2' },
];

function NanaPriceAccordion({ course }) {
  const [open, setOpen] = useState(false);
  const hasAnyPrice = NANA_PRICE_ROWS.some(r => course[r.earlyKey] || course[r.lateKey]);
  if (!hasAnyPrice) return null;

  return (
    <div className="mt-4 border border-purple-100 rounded-xl overflow-hidden text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 bg-purple-50 hover:bg-purple-100 transition-colors text-purple-800 font-medium"
      >
        <span className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          מחירון סמסטר קיץ נענע
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-purple-100 bg-white">
          <div className="p-3 space-y-2">
            <div className="text-center font-semibold text-green-700 pb-1 border-b border-green-100">🟢 הרשמה מוקדמת</div>
            {NANA_PRICE_ROWS.map(r => course[r.earlyKey] ? (
              <div key={r.earlyKey} className="flex justify-between text-gray-700">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-medium">₪{course[r.earlyKey]}</span>
              </div>
            ) : null)}
          </div>
          <div className="p-3 space-y-2">
            <div className="text-center font-semibold text-red-700 pb-1 border-b border-red-100">🔴 הרשמה מאוחרת</div>
            {NANA_PRICE_ROWS.map(r => course[r.lateKey] ? (
              <div key={r.lateKey} className="flex justify-between text-gray-700">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-medium">₪{course[r.lateKey]}</span>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseHeader({ course, registeredCount, leadsCount }) {
  const getStatusColor = (status) => {
    const colors = {
      'לא פתוח להרשמה': '#7B8794',
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
        {!course.name?.includes('סמסטר קיץ נענע') && (course.price_early || course.price_late) && (
          <div className="flex flex-col gap-1 text-sm text-[var(--crm-text)] opacity-80">
            {course.price_early && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>מוקדם: ₪{course.price_early}</span>
              </div>
            )}
            {course.price_late && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>מאוחר: ₪{course.price_late}</span>
              </div>
            )}
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

      {course.name?.includes('סמסטר קיץ נענע') && <NanaPriceAccordion course={course} />}

      <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
        <Link to={createPageUrl('Students') + '?course=' + course.id + '&status=רשום'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Users className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-[var(--crm-text)] underline cursor-pointer">
            {registeredCount} רשומים
          </span>
          {course.max_students && (
            <span className="text-sm text-gray-400">/ {course.max_students}</span>
          )}
        </Link>
        <Link to={createPageUrl('Students') + '?course=' + course.id} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Users className="w-5 h-5 text-[var(--crm-primary)]" />
          <span className="text-sm font-medium text-[var(--crm-text)] underline cursor-pointer">
            {leadsCount} לידים משויכים
          </span>
        </Link>
      </div>
    </div>
  );
}