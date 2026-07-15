import React from 'react';
import { Info } from 'lucide-react';

export default function WaTemplateComposer({ templates, selected, onSelectTemplate, course, date, link, onChangeCourse, onChangeDate, onChangeLink }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold flex items-center gap-2 mb-2"><Info className="w-4 h-4" />שליחה במצב תבנית מאושרת 📋</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>בחרי תבנית מהרשימה (למשל: תזכורת יום היכרות).</li>
          <li>מלאי את השדות: שם הקורס, מועד, וקישור. שם הנמען מתווסף אוטומטית לכל אחד.</li>
          <li>בחרי קבוצת תפוצה. אם יש מי שלא רוצה שיקבל — הורידי לו את הסימון ברשימה (הוא נשאר בקבוצה, רק לא מקבל את הדיוור הזה).</li>
          <li>לחצי 'שלח ניוזלטר'.</li>
        </ol>
        <p className="mt-2">💡 במצב תבנית אין צורך לכתוב הודעה — היא בנויה ומאושרת מראש, ומגיעה לכל הנמענות גם אם לא כתבו לנו לאחרונה. תיבת הטקסט החופשי מיועדת רק להודעות רגילות (לא תבנית).</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">בחרי תבנית</label>
        <select value={selected} onChange={(e) => onSelectTemplate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
          {templates.map(tpl => <option key={tpl.value} value={tpl.value}>{tpl.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">שם הקורס</label>
          <input type="text" value={course} onChange={(e) => onChangeCourse(e.target.value)} placeholder="למשל: פאשיה בתנועה" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">מועד</label>
          <input type="text" value={date} onChange={(e) => onChangeDate(e.target.value)} placeholder="למשל: יום ד' 22.7, 9:30" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">קישור</label>
          <input type="text" value={link} onChange={(e) => onChangeLink(e.target.value)} placeholder="https://..." dir="ltr" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <p className="text-xs text-gray-600">השם ({'{{1}}'}) מתמלא אוטומטית לכל נמען משם המנוי.</p>
    </div>
  );
}