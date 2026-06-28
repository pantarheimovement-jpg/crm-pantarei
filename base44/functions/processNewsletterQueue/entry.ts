import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APP_BASE_URL = 'https://crm-pantarei-4738bca7.base44.app';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support test_mode: process only 1 item and don't mark as sent
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const testMode = body.test_mode === true;
    const limit = testMode ? 1 : 200;

    // Load pending items
    const pending = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { status: 'pending' }, 'created_date', limit
    );

    if (!pending || pending.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No pending items' });
    }

    const batchId = pending[0].batch_id;

    // Try to load HTML from NewsletterLogs (fallback: use html_content from item itself)
    const logs = await base44.asServiceRole.entities.NewsletterLogs.filter({ error_message: batchId });
    const logHtmlTemplate = logs && logs.length > 0 ? logs[0].content : null;

    let sent = 0, failed = 0;

    for (const item of pending) {
      try {
        // Use log template if available, otherwise fall back to item's own html_content
        const htmlTemplate = logHtmlTemplate || item.html_content;

        if (!htmlTemplate) {
          throw new Error('No HTML content found for item ' + item.id);
        }

        const unsubscribeUrl = `${APP_BASE_URL}/functions/unsubscribeHandler?token=${item.unsubscribe_token}`;
        const personalizedHtml = htmlTemplate
          .replace(/\{\{unsubscribe_link\}\}/g, unsubscribeUrl)
          .replace(/\{\{name\}\}/g, item.name || '');

        if (testMode) {
          // In test mode, just return the first item's details without sending
          return Response.json({
            test_mode: true,
            item_id: item.id,
            email: item.email,
            subject: item.subject,
            html_source: logHtmlTemplate ? 'NewsletterLogs' : 'item.html_content',
            html_length: htmlTemplate.length,
            has_unsubscribe_token: !!item.unsubscribe_token,
            message: 'Test mode: no email sent'
          });
        }

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

    if (!remaining || remaining.length === 0) {
      const totalSent = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'sent' });
      const totalFailed = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'failed' });
      const totalSentCount = totalSent ? totalSent.length : 0;
      const totalFailedCount = totalFailed ? totalFailed.length : 0;
      const batchSubject = pending[0].subject || 'ניוזלטר';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'pantarhei.movement@gmail.com',
        subject: `✅ שליחת הניוזלטר הושלמה`,
        body: `שליחת הניוזלטר "${batchSubject}" הושלמה בהצלחה!\n\n📧 נשלח ל-${totalSentCount} נמענים\n❌ נכשל: ${totalFailedCount}\n\nקמפיין: ${batchId}`
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