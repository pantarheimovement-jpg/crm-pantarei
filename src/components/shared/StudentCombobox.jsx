import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

export default function StudentCombobox({ students, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = students.find(s => s.id === value);

  const filtered = students.filter(s => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div ref={ref} className="relative flex-1">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer flex items-center justify-between bg-white hover:border-gray-400 transition-colors"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.full_name : (placeholder || 'בחר משתתף')}
        </span>
        <div className="flex items-center gap-1">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('', '');
                setQuery('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש שם, טלפון, מייל..."
                className="w-full pr-8 pl-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[var(--crm-primary)]"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">לא נמצאו תוצאות</div>
            ) : (
              filtered.map(student => (
                <div
                  key={student.id}
                  onClick={() => {
                    onChange(student.id, student.full_name);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    value === student.id ? 'bg-gray-100 font-medium' : ''
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">{student.full_name}</div>
                  {(student.phone || student.email) && (
                    <div className="text-xs text-gray-500">
                      {student.phone}{student.phone && student.email ? ' · ' : ''}{student.email}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}