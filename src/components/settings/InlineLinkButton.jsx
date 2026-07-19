import React, { useState } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';

export default function InlineLinkButton({ textareaId, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [sel, setSel] = useState({ start: 0, end: 0 });

  const openModal = () => {
    const ta = document.getElementById(textareaId);
    const start = ta ? ta.selectionStart : (value || '').length;
    const end = ta ? ta.selectionEnd : (value || '').length;
    setSel({ start, end });
    setLinkText((value || '').slice(start, end));
    setUrl('');
    setOpen(true);
  };

  const insert = () => {
    if (!linkText.trim() || !url.trim()) { alert('נא למלא גם טקסט וגם קישור'); return; }
    const md = `[${linkText.trim()}](${url.trim()})`;
    onChange((value || '').slice(0, sel.start) + md + (value || '').slice(sel.end));
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={openModal}
        className="px-3 py-1.5 bg-[#6D436D] text-white rounded-full text-xs font-semibold hover:bg-[#5a365a] flex items-center gap-1">
        <LinkIcon className="w-3 h-3" /> קישור 🔗
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800">הוספת קישור בתוך הטקסט</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">הטקסט שיהיה לחיץ</label>
              <input type="text" value={linkText} onChange={e => setLinkText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="למשל: קמפיין פידבק" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">הקישור (URL)</label>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." dir="ltr" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={insert} className="flex-1 py-2 bg-[#6D436D] text-white rounded-full font-semibold text-sm hover:bg-[#5a365a]">הוסף קישור</button>
              <button onClick={() => setOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-full text-sm hover:bg-gray-50">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}