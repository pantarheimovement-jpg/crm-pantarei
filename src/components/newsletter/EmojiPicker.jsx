import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'ריקוד ותנועה': ['💃', '🧘', '🧘‍♀️', '🤸‍♀️', '🏋️‍♀️', '🧎‍♀️', '🚶‍♀️', '🙆‍♀️', '🙋‍♀️', '💫', '🌀', '🎶', '🎵', '🪩', '🩰', '✨'],
  'חיוכים': ['😀', '😃', '😄', '😁', '😊', '🥰', '😍', '🤩', '😘', '😗', '😚', '🙂', '🤗', '😌', '😉', '🙃'],
  'לבבות': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💕', '💞', '💓', '💗', '💖', '💝', '💘'],
  'ידיים': ['👋', '🤚', '✋', '🖐️', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '👍', '👏', '🙌', '🤝', '🙏', '💪'],
  'חגיגה': ['🎉', '🎊', '🥳', '✨', '🌟', '⭐', '💫', '🔥', '🎯', '🏆', '🎁', '🎈', '🪩', '🎶', '🕺', '🎵'],
  'טבע': ['🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🍀', '🌿', '🌱', '🦋', '🌈', '☀️', '🌙', '⛅', '🌊', '🍃'],
  'סמלים': ['💡', '📌', '📍', '🔗', '📧', '📱', '💬', '📢', '🔔', '⏰', '📅', '✅', '❌', '⚡', '💰', '🎓'],
};

export default function EmojiPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ריקוד ותנועה');
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="הוסף אמוג'י"
      >
        <Smile className="w-5 h-5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-72">
          {/* Category tabs */}
          <div className="flex overflow-x-auto gap-1 p-2 border-b border-gray-100">
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-[var(--crm-action)] text-[var(--crm-text)]' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-40 overflow-y-auto">
            {EMOJI_CATEGORIES[activeCategory].map((emoji, i) => (
              <button
                key={i}
                onClick={() => { onSelect(emoji); setOpen(false); }}
                className="text-xl p-1 hover:bg-gray-100 rounded-lg transition-colors text-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}