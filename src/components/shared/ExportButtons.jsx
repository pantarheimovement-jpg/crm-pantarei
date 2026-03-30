import React, { useState } from 'react';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Shared export buttons component for CSV and Google Sheets export.
 * 
 * Props:
 * - headers: string[] — column headers
 * - rows: (string|number)[][] — data rows matching headers order
 * - fileName: string — file name for CSV download (without extension)
 * - sheetTitle: string — title for the Google Sheets spreadsheet
 */
export default function ExportButtons({ headers, rows, fileName, sheetTitle }) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell ?? ''}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToGoogleSheets = async () => {
    if (rows.length === 0) {
      alert('אין נתונים לייצוא');
      return;
    }
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportToGoogleSheets', {
        headers,
        rows: rows.map(row => row.map(cell => String(cell ?? ''))),
        title: `${sheetTitle} - ${new Date().toLocaleDateString('he-IL')}`
      });
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        alert('שגיאה בייצוא ל-Google Sheets');
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      alert('שגיאה בייצוא ל-Google Sheets: ' + (error.message || ''));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportToCSV}
        className="border border-[var(--crm-primary)] text-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/10 px-3 py-2 text-sm font-medium flex items-center gap-2 bg-white"
        style={{ borderRadius: 'var(--crm-button-radius)' }}
      >
        <Download className="w-4 h-4" />
        CSV
      </button>
      <button
        onClick={exportToGoogleSheets}
        disabled={exporting}
        className="border border-green-600 text-green-700 hover:bg-green-50 px-3 py-2 text-sm font-medium flex items-center gap-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: 'var(--crm-button-radius)' }}
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        Google Sheets
      </button>
    </div>
  );
}