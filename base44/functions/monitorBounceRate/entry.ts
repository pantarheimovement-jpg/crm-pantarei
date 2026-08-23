import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALERT_TO = 'pantarhei.movement@gmail.com';
const BOUNCE_THRESHOLD = 0.03;
const MIN_SENT = 100;

async function countAll(base44, entity, filterQuery) {
  let total = 0;
  let skip = 0;
  const PAGE = 500;
  while (true) {
    const batch = await base44.asServiceRole.entities[entity].filter(filterQuery, 'created_date', PAGE, skip);
    if (!batch || batch.length === 0) break;
    total += batch.length;
    if (batch.length < PAGE) break;
    skip += batch.length;
    if (skip > 10000) break;
  }
  return total;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // הקמפיין האחרון בפועל — לא מזהה מקובע שנשאר מיוני
    const latest = await base44.asServiceRole.entities.NewsletterQueue.list('-created_date', 1);
    const BATCH_ID = latest && latest[0] ? latest[0].batch_id : null;
    if (!BATCH_ID) return Response.json({ success: true, message: 'no campaigns yet' });

    const newBounces = await countAll(base44, 'Subscribers', { subscribed: true, bounce_count: { $gte: 1 } });
    const sent = await countAll(base44, 'NewsletterQueue', { batch_id: BATCH_ID, status: 'sent' });
    const rate = sent > 0 ? newBounces / sent : 0;
    const ratePct = (rate * 100).toFixed(1);
    const over = sent >= MIN_SENT && rate > BOUNCE_THRESHOLD;

    if (over) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: ALERT_TO,
        subject: `⚠️ אזהרה: שיעור bounce גבוה בשליחת הניוזלטר (${ratePct}%)`,
        body: `שיעור ה-bounce בשליחה הנוכחית עלה ל-${ratePct}% — מעל הסף של 3%.\n\nנשלחו עד כה: ${sent}\nכתובות שחזרו (bounce חדש): ${newBounces}\n\nמומלץ לעצור את אוטומציית processNewsletterQueue ולבדוק את הרשימה לפני שממשיכים, כדי להגן על מוניטין ה-SES.`
      });
    }

    return Response.json({ success: true, batch_id: BATCH_ID, sent, newBounces, rate_percent: Number(ratePct), alerted: over });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});