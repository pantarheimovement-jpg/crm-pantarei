import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APP_BASE_URL = 'https://crm-pantarei-4738bca7.base44.app';
const BATCH_SIZE = 14;
const DELAY_MS = 200;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    // === TEST MODE: send directly to a test email, don't touch queue ===
    if (body.test_mode === true && body.send_test_to && body.batch_id) {
      const logs = await base44.asServiceRole.entities.NewsletterLogs.filter({ error_message: body.batch_id });
      const log = logs && logs[0];
      if (!log) return Response.json({ error: 'No log found for batch_id ' + body.batch_id }, { status: 404 });

      const unsubscribeUrl = `${APP_BASE_URL}/functions/unsubscribeHandler?token=test-preview-token`;
      const personalizedHtml = log.content
        .replace(/\{\{unsubscribe_link\}\}/g, unsubscribeUrl)
        .replace(/\{\{name\}\}/g, 'איינת');

      await base44.asServiceRole.functions.invoke('sendEmailSES', {
        to: body.send_test_to,
        subject: log.subject,
        html_content: personalizedHtml,
        from_name: 'פנטהריי',
        unsubscribe_token: 'test-preview-token',
        app_base_url: APP_BASE_URL,
      });

      return Response.json({ success: true, sent_to: body.send_test_to, subject: log.subject });
    }

    // === NORMAL MODE: process pending queue items ===
    const pending = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { status: 'pending' }, 'created_date', BATCH_SIZE
    );

    if (!pending || pending.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No pending items' });
    }

    const batchId = pending[0].batch_id;
    const logs = await base44.asServiceRole.entities.NewsletterLogs.filter({ error_message: batchId });
    const logHtmlTemplate = logs && logs.length > 0 ? logs[0].content : null;

    let sent = 0, failed = 0;

    for (const item of pending) {
      try {
        const htmlTemplate = logHtmlTemplate || item.html_content;
        if (!htmlTemplate) throw new Error('No HTML content found for item ' + item.id);

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
        await sleep(DELAY_MS);
      } catch (err) {
        await base44.asServiceRole.entities.NewsletterQueue.update(item.id, {
          status: 'failed',
          error_message: err.message
        });
        failed++;
      }
    }

    // Check if batch is fully complete
    const remaining = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { batch_id: batchId, status: 'pending' }, 'created_date', 1
    );

    if (!remaining || remaining.length === 0) {
      const totalSent = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'sent' });
      const totalFailed = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'failed' });
      const totalSentCount = totalSent ? totalSent.length : 0;
      const totalFailedCount = totalFailed ? totalFailed.length : 0;
      const batchSubject = pending[0].subject || 'ניוזלטר';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'pantarhei.movement@gmail.com',
        subject: `✅ שליחת הניוזלטר הושלמה`,
        body: `שליחת הניוזלטר "${batchSubject}" הושלמה!\n\n📧 נשלח: ${totalSentCount}\n❌ נכשל: ${totalFailedCount}\n\nקמפיין: ${batchId}`
      });

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