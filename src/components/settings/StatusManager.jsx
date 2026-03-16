import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Edit, Check, X, GripVertical, AlertCircle } from 'lucide-react';

export default function StatusManager({ title, description, items, entityName, onReload, protectedNames = [] }) {
  const [newItem, setNewItem] = useState({ name: '', color: '#6D436D' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const sorted = [...items].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const handleAdd = async () => {
    if (!newItem.name.trim()) return alert('אנא הזיני שם');
    await base44.entities[entityName].create({
      ...newItem,
      order_index: items.length,
      is_active: true
    });
    setNewItem({ name: '', color: '#6D436D' });
    onReload();
  };

  const handleDelete = async (id, name) => {
    if (protectedNames.includes(name)) {
      return alert(`הסטטוס "${name}" בשימוש אוטומציות ולא ניתן למחיקה. ניתן לכבות אותו.`);
    }
    if (!confirm(`האם למחוק "${name}"?`)) return;
    await base44.entities[entityName].delete(id);
    onReload();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ name: item.name, color: item.color, description: item.description || '' });
  };

  const saveEdit = async (id, originalName) => {
    if (protectedNames.includes(originalName) && editData.name !== originalName) {
      return alert(`לא ניתן לשנות את שם הסטטוס "${originalName}" כי הוא בשימוש אוטומציות. ניתן לשנות צבע.`);
    }
    await base44.entities[entityName].update(id, editData);
    setEditingId(null);
    onReload();
  };

  const toggleActive = async (item) => {
    await base44.entities[entityName].update(item.id, { is_active: !item.is_active });
    onReload();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      </div>

      {/* Existing items */}
      <div className="space-y-2">
        {sorted.map(item => (
          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${item.is_active !== false ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            
            {editingId === item.id ? (
              <>
                <input
                  type="color"
                  value={editData.color || '#6D436D'}
                  onChange={(e) => setEditData({...editData, color: e.target.value})}
                  className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                />
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                />
                <button onClick={() => saveEdit(item.id, item.name)} className="text-green-600 hover:text-green-800 p-1">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                  {protectedNames.includes(item.name) && (
                    <span className="mr-2 text-xs text-orange-500 font-medium">🔒 אוטומציה</span>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(item)}
                  className={`text-xs px-2 py-1 rounded-full ${item.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                >
                  {item.is_active !== false ? 'פעיל' : 'כבוי'}
                </button>
                <button onClick={() => startEdit(item)} className="text-[#6D436D] hover:text-[#5a365a] p-1">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id, item.name)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Protected names notice */}
      {protectedNames.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>סטטוסים המסומנים ב-🔒 משמשים אוטומציות (וואטסאפ, Elementor, שינוי סטטוס שיחה). שינוי שמם עלול לשבור אוטומציות.</span>
        </div>
      )}

      {/* Add new */}
      <div className="flex gap-2 pt-2">
        <input
          type="text"
          value={newItem.name}
          onChange={(e) => setNewItem({...newItem, name: e.target.value})}
          placeholder="שם חדש..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        {newItem.color !== undefined && (
          <input
            type="color"
            value={newItem.color}
            onChange={(e) => setNewItem({...newItem, color: e.target.value})}
            className="w-10 h-10 rounded border border-gray-300"
          />
        )}
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-[#6D436D] text-white rounded-lg font-medium hover:bg-[#5a365a] flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" />
          הוסף
        </button>
      </div>
    </div>
  );
}