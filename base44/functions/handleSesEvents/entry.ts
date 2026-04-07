import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Clone request body since we need it for parsing
    const body = await req.text();
    console.log('handleSesEvents: Received request, body length:', body.length);
    
    let message;
    try {
      message = JSON.parse(body);
    } catch (parseErr) {
      console.error('handleSesEvents: Failed to parse JSON body:', parseErr.message);
      console.error('handleSesEvents: Body preview:', body.substring(0, 500));
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('handleSesEvents: Message Type:', message.Type);

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
      console.log('handleSesEvents: SES eventType:', eventType);

      if (!eventType) {
        console.log('No event type found in message');
        return Response.json({ skipped: true });
      }

      const mail = sesEvent.mail || {};
      const recipients = mail.destination || [];
      const subject = mail.commonHeaders?.subject || '';
      const now = new Date();
      console.log(`handleSesEvents: Processing ${eventType} for ${recipients.length} recipients, subject: "${subject}"`);

      for (const email of recipients) {
        try {
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
            try {
              const subs = await base44.asServiceRole.entities.Subscribers.filter({ email });
              if (subs?.[0]) {
                await base44.asServiceRole.entities.Subscribers.update(subs[0].id, {
                  last_opened_at: now.toISOString()
                });
              }
            } catch (subErr) {
              console.warn(`Failed to update subscriber ${email}:`, subErr.message);
            }
            console.log(`✅ Open event recorded for ${email}`);

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
            console.log(`✅ Click event recorded for ${email}`);

          } else if (eventType === 'Bounce') {
            await base44.asServiceRole.entities.EmailEvents.create({
              subscriber_email: email,
              newsletter_subject: subject,
              event_type: 'bounce',
              opened_at: now.toISOString(),
              hour_of_day: now.getHours(),
              day_of_week: now.getDay()
            });

            try {
              const subs = await base44.asServiceRole.entities.Subscribers.filter({ email });
              if (subs?.[0]) {
                await base44.asServiceRole.entities.Subscribers.update(subs[0].id, {
                  bounce_count: (subs[0].bounce_count || 0) + 1
                });
              }
            } catch (subErr) {
              console.warn(`Failed to update bounce for ${email}:`, subErr.message);
            }
            console.log(`✅ Bounce event recorded for ${email}`);

          } else if (eventType === 'Complaint') {
            await base44.asServiceRole.entities.EmailEvents.create({
              subscriber_email: email,
              newsletter_subject: subject,
              event_type: 'complaint',
              opened_at: now.toISOString(),
              hour_of_day: now.getHours(),
              day_of_week: now.getDay()
            });
            console.log(`✅ Complaint event recorded for ${email}`);
          } else {
            console.log(`⏭️ Ignoring event type: ${eventType}`);
          }
        } catch (entityErr) {
          console.error(`❌ Failed to record ${eventType} for ${email}:`, entityErr.message);
        }
      }

      return Response.json({ success: true, eventType, recipients: recipients.length });
    }

    console.log('Unknown SNS message type:', message.Type);
    return Response.json({ skipped: true });

  } catch (error) {
    console.error('❌ Error handling SES event:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});