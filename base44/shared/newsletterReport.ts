// Shared newsletter report helpers — used by processNewsletterQueue and sendNewsletterReport

export async function countByStatus(base44, batchId, status) {
  let total = 0;
  let skip = 0;
  const PAGE = 500;
  while (true) {
    const rows = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status }, 'created_date', PAGE, skip);
    if (!rows || rows.length === 0) break;
    total += rows.length;
    if (rows.length < PAGE) break;
    skip += rows.length;
    if (skip > 20000) break;
  }
  return total;
}

export async function countEmailEvents(base44, subject, eventType) {
  let total = 0;
  let skip = 0;
  const PAGE = 500;
  while (true) {
    const rows = await base44.asServiceRole.entities.EmailEvents.filter(
      { newsletter_subject: subject, event_type: eventType },
      'created_date', PAGE, skip
    );
    if (!rows || rows.length === 0) break;
    total += rows.length;
    if (rows.length < PAGE) break;
    skip += rows.length;
    if (skip > 20000) break;
  }
  return total;
}

export function buildReportHtml(subject, sent, failed, cancelled, batchId, opens, clicks) {
  const total = sent + failed + cancelled;
  const openRate = sent > 0 ? ((opens / sent) * 100).toFixed(1) : '0.0';
  const clickRate = sent > 0 ? ((clicks / sent) * 100).toFixed(1) : '0.0';
  return `<div style="background:#FDF8F0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#6D436D;padding:22px 20px;text-align:center;">
      <h1 style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;">דוח שליחת ניוזלטר</h1>
    </div>
    <div style="padding:24px;color:#5E4B35;">
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">השליחה של <strong>"${subject}"</strong> הושלמה.</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">✅ נשלחו בהצלחה</td><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:bold;color:#1D9E75;font-size:18px;">${sent}</td></tr>
        <tr><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">⚠️ נכשלו</td><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:bold;color:#D85A30;font-size:18px;">${failed}</td></tr>
        <tr><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">🚫 הוחרגו (כתובות שחזרו)</td><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:bold;color:#999999;font-size:18px;">${cancelled}</td></tr>
        <tr><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">📋 סך הכל ברשימה</td><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:bold;font-size:18px;">${total}</td></tr>
        <tr><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">👁 פתיחות</td><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:bold;color:#6D436D;font-size:18px;">${opens} <span style="font-size:13px;color:#999;">(${openRate}%)</span></td></tr>
        <tr><td style="padding:12px 8px;">🖱 קליקים</td><td style="padding:12px 8px;text-align:left;font-weight:bold;color:#D29486;font-size:18px;">${clicks} <span style="font-size:13px;color:#999;">(${clickRate}%)</span></td></tr>
      </table>
      <div style="background:#FDF8F0;border-radius:8px;padding:12px 14px;margin-top:18px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#7a6a52;">"הוחרגו" = כתובות שחזרו בעבר (bounce) והוסרו אוטומטית כדי להגן על מוניטין השליחה. פתיחות וקליקים נספרו 48 שעות לאחר השליחה.</p>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#aaaaaa;">קמפיין: ${batchId}</p>
    </div>
  </div>
</div>`;
}