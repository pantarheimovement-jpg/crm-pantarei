import React, { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '../LanguageContext';

export default function AiSubjectSuggestions({ content, onSelect }) {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const generateSuggestions = async () => {
    if (!content || content.length < 20) {
      alert(t('אנא כתבי תוכן לניוזלטר קודם (לפחות כמה מילים)', 'Please write some newsletter content first'));
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה כותב קופי לניוזלטר של סטודיו לתנועה מודעת בשם פנטהריי.
תוכן הניוזלטר: ${content.substring(0, 600)}

הצע 5 כותרות נושא שונות בעברית לאימייל זה. הכותרות צריכות להיות:
- קצרות (עד 50 תווים)
- מפתות לפתיחה
- בסגנון חם, אנושי, לא שיווקי מדי
- ללא מילות SPAM`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["suggestions"]
        }
      });
      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      alert(t('שגיאה ביצירת הצעות', 'Error generating suggestions'));
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={generateSuggestions}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--crm-primary)] border border-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/10 transition-colors disabled:opacity-50"
        style={{ borderRadius: 'var(--crm-button-radius)' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {t('הצע כותרות', 'Suggest Subjects')}
      </button>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-80">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-[var(--crm-text)]">
              {t('הצעות כותרת', 'Subject Suggestions')}
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => { onSelect(suggestion); setOpen(false); }}
                className="w-full text-right px-3 py-2 text-sm rounded-lg hover:bg-[var(--crm-action)]/30 transition-colors text-[var(--crm-text)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}