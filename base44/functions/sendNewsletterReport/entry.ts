import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendViaSES } from '../../shared/sesEmail.ts';
import { buildReportHtml, countByStatus, countEmailEvents } from '../../shared/newsletterReport.ts';

const REPORT_DELAY_HOURS = 48;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const cutoff = new Date(now.getTime() - REPORT_DELAY_HOURS * 60 * 60 * 1000);

    // Find logs waiting for a delayed report
    const logs = await base44.asServiceRole.entities.NewsletterLogs.filter(
      { status: 'נשלח - ממתין לדוח' },
      'created_date', 50, 0
    );

    if (!logs || logs.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No logs awaiting report' });
    }

    let processed = 0;
    for (const log of logs) {
      // Check sent_date is older than 48h
      const sentDate = log.sent_date ? new Date(log.sent_date) : null;
      if (!sentDate || sentDate > cutoff) continue;

      try {
        const batchId = log.error_message || log.subject;
        const subject = log.subject || 'ניוזלטר';
        const sentCount = await countByStatus(base44, batchId, 'sent');
        const failedCount = await countByStatus(base44, batchId, 'failed');
        const cancelledCount = await countByStatus(base44, batchId, 'cancelled');
        const opens = await countEmailEvents(base44, subject, 'open');
        const clicks = await countEmailEvents(base44, subject, 'click');

        await sendViaSES(
          'pantarhei.movement@gmail.com',
          `דוח שליחת הניוזלטר "${subject}"`,
          buildReportHtml(subject, sentCount, failedCount, cancelledCount, batchId, opens, clicks),
          null
        );

        await base44.asServiceRole.entities.NewsletterLogs.update(log.id, {
          recipients_count: sentCount,
          status: failedCount > 0 ? `נשלח בהצלחה (${failedCount} נכשלו)` : 'נשלח בהצלחה'
        });
        processed++;
      } catch (err) {
        console.error(`Failed to send report for log ${log.id}:`, err.message);
      }
    }

    return Response.json({ success: true, processed, checked: logs.length });
  } catch (error) {
    console.error('sendNewsletterReport error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}