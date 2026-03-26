import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function CourseCombobox({ courses, value, onChange, placeholder = 'חפש קורס...' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedCourse = courses.find(c => c.id === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = courses.filter(c =>
    !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedCourse ? 'text-gray-900' : 'text-gray-400'}>
          {selectedCourse ? selectedCourse.name : 'בחר קורס'}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange('', ''); setSearchTerm(''); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full pr-8 pl-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--crm-primary)]"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            <button
              type="button"
              onClick={() => { onChange('', ''); setIsOpen(false); setSearchTerm(''); }}
              className="w-full text-right px-4 py-2 text-sm text-gray-400 hover:bg-gray-50"
            >
              ללא קורס
            </button>
            {filtered.map(course => (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  onChange(course.id, course.name);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full text-right px-4 py-2 text-sm hover:bg-gray-50 ${
                  course.id === value ? 'bg-[var(--crm-primary)]/10 font-medium' : ''
                }`}
              >
                {course.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400 text-center">לא נמצאו קורסים</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}