import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Edit, Check, X, GripVertical, AlertCircle } from 'lucide-react';

export default function SourceManager({ items, onReload, protectedNames = [] }) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const sorted = [...items].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await base44.entities.LeadSources.create({
      name: newName.trim(),
      order_index: items.length,
      is_active: true
    });
    setNewName('');
    onReload();
  };

  const handleDelete = async (id, name) => {
    if (protectedNames.includes(name)) {
      return alert(`המקור "${name}" בשימוש אוטומציות ולא ניתן למחיקה.`);
    }
    if (!confirm(`האם למחוק "${name}"?`)) return;
    await base44.entities.LeadSources.delete(id);
    onReload();
  };

  const saveEdit = async (id, originalName) => {
    if (protectedNames.includes(originalName) && editName !== originalName) {
      return alert(`לא ניתן לשנות את שם המקור "${originalName}" כי הוא בשימוש אוטומציות.`);
    }
    await base44.entities.LeadSources.update(id, { name: editName });
    setEditingId(null);
    onReload();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">מקורות ליד</h3>
        <p className="text-sm text-gray-500 mb-4">ניהול מקורות הכניסה של לידים (אתר, וואטסאפ, ידני...)</p>
      </div>

      <div className="space-y-2">
        {sorted.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <GripVertical className="w-4 h-4 text-gray-400" />
            {editingId === item.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                />
                <button onClick={() => saveEdit(item.id, item.name)} className="text-green-600 p-1"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="text-gray-400 p-1"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium text-gray-900 text-sm">{item.name}</span>
                {protectedNames.includes(item.name) && (
                  <span className="text-xs text-orange-500 font-medium">🔒</span>
                )}
                <button onClick={() => { setEditingId(item.id); setEditName(item.name); }} className="text-[#6D436D] p-1"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(item.id, item.name)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>

      {protectedNames.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>מקורות המסומנים ב-🔒 משמשים אוטומציות (וואטסאפ, Elementor). שינוי שמם עלול לשבור אוטומציות.</span>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="מקור חדש..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="px-4 py-2 bg-[#6D436D] text-white rounded-lg font-medium hover:bg-[#5a365a] flex items-center gap-1 text-sm">
          <Plus className="w-4 h-4" />הוסף
        </button>
      </div>
    </div>
  );
}