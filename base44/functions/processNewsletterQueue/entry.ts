import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    let sent = 0, failed = 0;

    for (const item of pending) {
      try {
          await base44.asServiceRole.functions.invoke('sendEmailSES', {
          to: item.email,
          subject: item.subject,
          html_content: item.html_content,
          from_name: 'פנטהריי',
          unsubscribe_token: item.unsubscribe_token,
          app_base_url: 'https://crm-pantarei-4738bca7.base44.app',
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
    if (pending.length > 0) {
      const batchId = pending[0].batch_id;
      const remaining = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'pending' }, 'created_date', 1);
      const totalSent = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'sent' });
      const totalFailed = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status: 'failed' });

      if (!remaining || remaining.length === 0) {
        // All done - send summary email + create log
        const totalSentCount = totalSent ? totalSent.length : 0;
        const totalFailedCount = totalFailed ? totalFailed.length : 0;

        // Get subject from batch
        const batchSubject = pending[0].subject || 'ניוזלטר';

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'pantarhei.movement@gmail.com',
          subject: `✅ שליחת הניוזלטר הושלמה`,
          body: `שליחת הניוזלטר "${batchSubject}" הושלמה בהצלחה!\n\n📧 נשלח ל-${totalSentCount} נמענים\n❌ נכשל: ${totalFailedCount}\n\nקמפיין: ${batchId}`
        });

        // Create newsletter log
        await base44.asServiceRole.entities.NewsletterLogs.create({
          subject: batchSubject,
          group: 'queue',
          recipients_count: totalSentCount,
          status: totalFailedCount > 0 ? `נשלח חלקית (${totalFailedCount} שגיאות)` : 'נשלח בהצלחה',
          sent_date: new Date().toISOString(),
          sent_by: 'SES (Queue)'
        });
      }
    }

    return Response.json({ success: true, processed: pending.length, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});