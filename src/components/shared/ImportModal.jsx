import React, { useState } from 'react';
import { X, Upload, FileText, Loader2 } from 'lucide-react';

export default function ImportModal({ isOpen, onClose, onImport, entityName, columns }) {
  const [mode, setMode] = useState('paste'); // 'paste' or 'file'
  const [pastedData, setPastedData] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      processCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const processCSV = (csvText) => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        alert('הקובץ ריק או לא תקין');
        setProcessing(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const items = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const item = {};
        headers.forEach((header, index) => {
          const column = columns.find(col => 
            col.label.toLowerCase() === header.toLowerCase() ||
            col.key.toLowerCase() === header.toLowerCase()
          );
          if (column) {
            item[column.key] = values[index] || '';
          }
        });
        items.push(item);
      }

      onImport(items);
      setProcessing(false);
      onClose();
      setPastedData('');
    } catch (error) {
      console.error('Error processing CSV:', error);
      alert('שגיאה בעיבוד הקובץ');
      setProcessing(false);
    }
  };

  const handlePasteImport = () => {
    if (!pastedData.trim()) {
      alert('אנא הדבק נתונים');
      return;
    }
    processCSV(pastedData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">ייבא {entityName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Selection */}
          <div className="flex gap-4 border-b border-gray-200 pb-4">
            <button
              onClick={() => setMode('paste')}
              className={`px-4 py-2 rounded-lg font-medium ${
                mode === 'paste'
                  ? 'bg-[#005e6c] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-5 h-5 inline-block ml-2" />
              הדבק נתונים
            </button>
            <button
              onClick={() => setMode('file')}
              className={`px-4 py-2 rounded-lg font-medium ${
                mode === 'file'
                  ? 'bg-[#005e6c] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-5 h-5 inline-block ml-2" />
              העלה קובץ CSV
            </button>
          </div>

          {/* Column Reference */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">עמודות נתמכות:</h4>
            <div className="space-y-1 text-sm">
              {columns.map((col, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className={`font-medium ${col.required ? 'text-red-600' : 'text-blue-800'}`}>
                    {col.label} {col.required && '*'}
                  </span>
                  {col.example && (
                    <span className="text-gray-600">- דוגמה: {col.example}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">* שדות חובה</p>
          </div>

          {mode === 'paste' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                הדבק נתוני CSV (כולל שורת כותרות)
              </label>
              <textarea
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                rows="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent font-mono text-sm"
                placeholder="שם,מייל,טלפון
ישראל ישראלי,israel@example.com,050-1234567"
              />
              <button
                onClick={handlePasteImport}
                disabled={processing || !pastedData.trim()}
                className="mt-4 w-full bg-[#005e6c] text-white py-3 rounded-lg font-semibold hover:bg-[#004a54] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    מעבד...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    ייבא נתונים
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                בחר קובץ CSV
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-[#005e6c] hover:underline font-medium">
                    לחץ לבחירת קובץ
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={processing}
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">קובץ CSV בלבד</p>
              </div>
              {processing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[#005e6c]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>מעבד את הקובץ...</span>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
            <h4 className="font-semibold mb-2">הוראות שימוש:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>וודא ששורה ראשונה מכילה את שמות העמודות</li>
              <li>השתמש בשמות העמודות המפורטים למעלה</li>
              <li>אפשר להשתמש בעברית או באנגלית לשמות העמודות</li>
              <li>ערכים עם פסיקים צריכים להיות בתוך מרכאות כפולות</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}