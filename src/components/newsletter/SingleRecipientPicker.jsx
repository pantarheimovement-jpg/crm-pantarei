import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User, Mail } from 'lucide-react';

export default function SingleRecipientPicker({ subscribers, onSelect, selected, t }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sorted = [...(subscribers || [])]
    .filter(s => s.email && s.subscribed !== false)
    .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '', 'he'));

  const filtered = query.trim()
    ? sorted.filter(s =>
        (s.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(query.toLowerCase())
      )
    : sorted;

  const isEmail = query.includes('@') && query.includes('.');
  const exactMatch = filtered.some(s => s.email?.toLowerCase() === query.toLowerCase());

  const handleSelect = (email, name) => {
    onSelect({ email, name: name || '' });
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
  };

  if (selected) {
    return (
      <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3">
        <User className="w-5 h-5 text-[var(--crm-primary)] shrink-0" />
        <div className="flex-1 min-w-0">
          {selected.name && (
            <p className="text-sm font-medium text-gray-900 truncate">{selected.name}</p>
          )}
          <p className="text-sm text-gray-600 truncate">{selected.email}</p>
        </div>
        <button onClick={handleClear} className="p-1 hover:bg-gray-100 rounded-full shrink-0">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t('חפשי לפי שם או מייל, או הקלידי כתובת חדשה...', 'Search by name or email, or type a new address...')}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent"
        />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Custom email option */}
          {isEmail && !exactMatch && (
            <button
              onClick={() => handleSelect(query.trim(), '')}
              className="w-full text-right px-4 py-3 hover:bg-[var(--crm-action)]/20 flex items-center gap-3 border-b border-gray-100"
            >
              <Mail className="w-5 h-5 text-[var(--crm-primary)] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--crm-primary)]">
                  {t('שלחי ל:', 'Send to:')} {query.trim()}
                </p>
                <p className="text-xs text-gray-500">{t('כתובת חדשה (לא ברשימה)', 'New address (not in list)')}</p>
              </div>
            </button>
          )}

          {filtered.length === 0 && !isEmail && query.trim() && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {t('לא נמצאו מנויים. הקלידי כתובת מייל מלאה לשליחה חד-פעמית', 'No subscribers found. Type a full email to send once')}
            </div>
          )}

          {filtered.slice(0, 50).map((sub) => (
            <button
              key={sub.id}
              onClick={() => handleSelect(sub.email, sub.name)}
              className="w-full text-right px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
            >
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{sub.name || sub.email}</p>
                {sub.name && (
                  <p className="text-xs text-gray-500 truncate">{sub.email}</p>
                )}
              </div>
              {sub.group && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">{sub.group}</span>
              )}
            </button>
          ))}

          {!query.trim() && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {t('אין מנויים פעילים', 'No active subscribers')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}