import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APP_BASE_URL = 'https://crm-pantarei-4738bca7.base44.app';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Load pending items - process 100 per run
    const pending = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { status: 'pending' }, 'created_date', 100
    );

    if (!pending || pending.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No pending items' });
    }

    const batchId = pending[0].batch_id;

    // Load the HTML template from NewsletterLogs (stored once per batch)
    const logs = await base44.asServiceRole.entities.NewsletterLogs.filter({ error_message: batchId });
    const htmlTemplate = logs && logs.length > 0 ? logs[0].content : null;

    if (!htmlTemplate) {
      return Response.json({ error: 'HTML template not found for batch ' + batchId }, { status: 400 });
    }

    let sent = 0, failed = 0;

    for (const item of pending) {
      try {
        // Personalize HTML at send time
        const unsubscribeUrl = `${APP_BASE_URL}/functions/unsubscribeHandler?token=${item.unsubscribe_token}`;
        const personalizedHtml = htmlTemplate
          .replace(/\{\{unsubscribe_link\}\}/g, unsubscribeUrl)
          .replace(/\{\{name\}\}/g, item.name || '');

        await base44.asServiceRole.functions.invoke('sendEmailSES', {
          to: item.email,
          subject: item.subject,
          html_content: personalizedHtml,
          from_name: 'פנטהריי',
          unsubscribe_token: item.unsubscribe_token,
          app_base_url: APP_BASE_URL,
        });

        await base44.asServiceRole.entities.NewsletterQueue.update(item.id, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });
        sent++;
      } catch (err) {
        await base44.asServiceRole.entities.NewsletterQueue.update(item.id, {
          status: 'failed',
          error_message: err.message
        });
        failed++;
      }
    }

    // Check if this batch_id is now fully complete → send summary email
    const remaining = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'pending' }, 'created_date', 1);
    const totalSent = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'sent' });
    const totalFailed = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'failed' });

    if (!remaining || remaining.length === 0) {
      const totalSentCount = totalSent ? totalSent.length : 0;
      const totalFailedCount = totalFailed ? totalFailed.length : 0;
      const batchSubject = pending[0].subject || 'ניוזלטר';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'pantarhei.movement@gmail.com',
        subject: `✅ שליחת הניוזלטר הושלמה`,
        body: `שליחת הניוזלטר "${batchSubject}" הושלמה בהצלחה!\n\n📧 נשלח ל-${totalSentCount} נמענים\n❌ נכשל: ${totalFailedCount}\n\nקמפיין: ${batchId}`
      });

      // Update the log record (find by batch_id stored in error_message)
      if (logs && logs.length > 0) {
        await base44.asServiceRole.entities.NewsletterLogs.update(logs[0].id, {
          recipients_count: totalSentCount,
          status: totalFailedCount > 0 ? `נשלח חלקית (${totalFailedCount} שגיאות)` : 'נשלח בהצלחה',
          error_message: totalFailedCount > 0 ? `${totalFailedCount} כשלונות` : null
        });
      }
    }

    return Response.json({ success: true, processed: pending.length, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});