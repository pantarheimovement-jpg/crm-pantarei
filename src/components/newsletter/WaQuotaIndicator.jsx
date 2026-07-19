import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const DAILY_TEMPLATE_CAP = 200;

export default function WaQuotaIndicator({ plannedCount = 0 }) {
  const [sent24h, setSent24h] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await base44.entities.WhatsappQueue.filter({ status: 'sent' }, '-sent_at', 500);
        const dayAgo = Date.now() - 24 * 3600 * 1000;
        setSent24h((rows || []).filter(r => r.template_name && r.sent_at && new Date(r.sent_at).getTime() > dayAgo).length);
      } catch { setSent24h(0); }
    })();
  }, []);

  if (sent24h === null) return null;
  const remaining = Math.max(0, DAILY_TEMPLATE_CAP - sent24h);
  const overQuota = plannedCount > remaining;
  const days = overQuota ? Math.ceil((plannedCount - remaining) / DAILY_TEMPLATE_CAP) + 1 : 1;

  return (
    <div className={`rounded-lg p-3 mb-4 text-sm ${overQuota ? 'bg-amber-50 border border-amber-300 text-amber-800' : 'bg-white/60 border border-green-200 text-gray-700'}`}>
      <p>
        📊 מכסת מטא היומית: נשלחו <b>{sent24h}</b> תבניות ב-24 השעות האחרונות • נותרו <b>{remaining}</b> מתוך {DAILY_TEMPLATE_CAP}
      </p>
      {overQuota && (
        <p className="mt-1 font-semibold">
          ⚠️ קבוצת היעד ({plannedCount} נמענים) גדולה מהיתרה — הדיוור יתפרס אוטומטית על כ-{days} ימים.
        </p>
      )}
      <p className="mt-1 text-xs opacity-70">"נשלח" = התקבל אצל הספק; מסירה אמיתית נבדקת ב-uChat (Error Logs + ✓✓ בשיחה).</p>
    </div>
  );
}