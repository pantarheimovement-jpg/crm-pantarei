import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    const message = JSON.parse(body);

    // Handle SNS SubscriptionConfirmation
    if (message.Type === 'SubscriptionConfirmation') {
      console.log('SNS SubscriptionConfirmation received, confirming...');
      const confirmResponse = await fetch(message.SubscribeURL);
      if (confirmResponse.ok) {
        console.log('SNS Subscription confirmed successfully');
        return Response.json({ confirmed: true });
      }
      console.error('Failed to confirm SNS subscription');
      return Response.json({ error: 'Failed to confirm' }, { status: 500 });
    }

    // Handle SNS Notification (actual SES events)
    if (message.Type === 'Notification') {
      const sesEvent = JSON.parse(message.Message);
      const eventType = sesEvent.eventType || sesEvent.notificationType;

      if (!eventType) {
        console.log('No event type found in message');
        return Response.json({ skipped: true });
      }

      const mail = sesEvent.mail || {};
      const recipients = mail.destination || [];
      const subject = mail.commonHeaders?.subject || '';
      const now = new Date();

      for (const email of recipients) {
        if (eventType === 'Open') {
          const openData = sesEvent.open || {};
          await base44.asServiceRole.entities.EmailEvents.create({
            subscriber_email: email,
            newsletter_subject: subject,
            event_type: 'open',
            opened_at: now.toISOString(),
            hour_of_day: now.getHours(),
            day_of_week: now.getDay(),
            user_agent: openData.userAgent || '',
            ip_address: openData.ipAddress || ''
          });

          // Update last_opened_at on subscriber
          const subs = await base44.asServiceRole.entities.Subscribers.filter({ email });
          if (subs?.[0]) {
            await base44.asServiceRole.entities.Subscribers.update(subs[0].id, {
              last_opened_at: now.toISOString()
            });
          }
          console.log(`Open event recorded for ${email}`);

        } else if (eventType === 'Click') {
          const clickData = sesEvent.click || {};
          await base44.asServiceRole.entities.EmailEvents.create({
            subscriber_email: email,
            newsletter_subject: subject,
            event_type: 'click',
            opened_at: now.toISOString(),
            hour_of_day: now.getHours(),
            day_of_week: now.getDay(),
            user_agent: clickData.userAgent || '',
            ip_address: clickData.ipAddress || ''
          });
          console.log(`Click event recorded for ${email}`);

        } else if (eventType === 'Bounce') {
          await base44.asServiceRole.entities.EmailEvents.create({
            subscriber_email: email,
            newsletter_subject: subject,
            event_type: 'bounce',
            opened_at: now.toISOString(),
            hour_of_day: now.getHours(),
            day_of_week: now.getDay()
          });

          // Increment bounce_count on subscriber
          const subs = await base44.asServiceRole.entities.Subscribers.filter({ email });
          if (subs?.[0]) {
            await base44.asServiceRole.entities.Subscribers.update(subs[0].id, {
              bounce_count: (subs[0].bounce_count || 0) + 1
            });
          }
          console.log(`Bounce event recorded for ${email}`);

        } else if (eventType === 'Complaint') {
          await base44.asServiceRole.entities.EmailEvents.create({
            subscriber_email: email,
            newsletter_subject: subject,
            event_type: 'complaint',
            opened_at: now.toISOString(),
            hour_of_day: now.getHours(),
            day_of_week: now.getDay()
          });
          console.log(`Complaint event recorded for ${email}`);
        }
      }

      return Response.json({ success: true, eventType, recipients: recipients.length });
    }

    console.log('Unknown SNS message type:', message.Type);
    return Response.json({ skipped: true });

  } catch (error) {
    console.error('Error handling SES event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});