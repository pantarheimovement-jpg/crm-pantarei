import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Loader2, MessageCircle, Phone } from 'lucide-react';

export default function WhatsappKnownContactsManager() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.WhatsappKnownContacts.list();
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading known contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      alert('אנא מלאי שם ומספר טלפון');
      return;
    }
    setAdding(true);
    try {
      await base44.entities.WhatsappKnownContacts.create({
        name: newName.trim(),
        phone: newPhone.trim().replace(/[\s\-\.\(\)\+]/g, '')
      });
      setNewName('');
      setNewPhone('');
      await loadContacts();
    } catch (error) {
      alert('שגיאה בהוספת איש קשר');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק איש קשר זה?')) return;
    try {
      await base44.entities.WhatsappKnownContacts.delete(id);
      await loadContacts();
    } catch (error) {
      alert('שגיאה במחיקה');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-5">
        <div className="flex items-start gap-3 mb-3">
          <MessageCircle className="w-6 h-6 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">אנשי קשר מוכרים בוואטסאפ</h3>
            <p className="text-sm text-gray-700 mt-1">
              מספרים שמופיעים כאן לא ייחשבו כלידים חדשים כאשר שולחים הודעה בוואטסאפ.
              המערכת תתעלם מהם בבדיקת לידים.
            </p>
          </div>
        </div>
      </div>

      {/* Add new contact */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h4 className="font-semibold text-gray-900 mb-4">הוסף איש קשר חדש</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">שם</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="לדוגמה: תמר"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">מספר טלפון</label>
            <input
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="972512345678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              dir="ltr"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim() || !newPhone.trim()}
              className="px-6 py-2 bg-[#6D436D] text-white rounded-full font-semibold hover:bg-[#5a365a] disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              הוסף
            </button>
          </div>
        </div>
      </div>

      {/* Contacts list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#6D436D]" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          אין אנשי קשר מוכרים עדיין
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">שם</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">מספר טלפון</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 w-20">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{contact.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2" dir="ltr">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {contact.phone}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}