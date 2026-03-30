import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const payload = await req.json();
    const { recipients, subject, html_content, from_name } = payload;

    // Check if newsletter sending is enabled
    const automationSettingsList = await base44.asServiceRole.entities.AutomationSettings.list();
    const automationSettings = automationSettingsList && automationSettingsList.length > 0 ? automationSettingsList[0] : null;
    if (!automationSettings || !automationSettings.newsletter_sending_enabled) {
      return Response.json({ 
        error: 'מערכת הדיוור מושבתת. ניתן להפעיל בהגדרות CRM → אוטומציה',
        disabled: true 
      }, { status: 403 });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ error: 'Recipients array is required and must not be empty' }, { status: 400 });
    }

    if (!subject || !html_content) {
      return Response.json({ error: 'Subject and html_content are required' }, { status: 400 });
    }

    const senderName = from_name || 'פנטהריי';

    // Get Gmail access token for sending
    const connection = await base44.asServiceRole.connectors.getConnection("gmail");
    const gmailToken = connection.accessToken;

    const encoder = new TextEncoder();
    let successCount = 0;
    let failedCount = 0;
    const failedDetails = [];

    for (const recipient of recipients) {
      try {
        const personalizedHtml = recipient.html_content || html_content;

        // Encode subject for MIME
        const subjectBytes = encoder.encode(subject);
        const subjectB64 = btoa(String.fromCharCode(...subjectBytes));

        // Encode HTML content
        const htmlBytes = encoder.encode(personalizedHtml);
        const htmlB64 = btoa(String.fromCharCode(...htmlBytes));

        const boundary = 'boundary_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const mimeLines = [
          `From: ${senderName} <me>`,
          `To: ${recipient.email}`,
          `Subject: =?UTF-8?B?${subjectB64}?=`,
          'MIME-Version: 1.0',
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          '',
          htmlB64,
          `--${boundary}--`
        ];
        const mimeMessage = mimeLines.join('\r\n');

        const mimeBytes = encoder.encode(mimeMessage);
        const raw = btoa(String.fromCharCode(...mimeBytes))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gmailToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
        });

        if (gmailResponse.ok) {
          successCount++;
        } else {
          const errorData = await gmailResponse.text();
          failedCount++;
          failedDetails.push({ email: recipient.email, error: errorData });
        }

        // Rate limiting — delay between emails
        if (recipients.indexOf(recipient) < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        failedCount++;
        failedDetails.push({ email: recipient.email, error: error.message });
      }
    }

    // Sync subscribers to MailerLite in background (non-blocking)
    const MAILERLITE_API_KEY = Deno.env.get('mailerlite');
    if (MAILERLITE_API_KEY) {
      try {
        for (const recipient of recipients.slice(0, 50)) {
          fetch('https://connect.mailerlite.com/api/subscribers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
            },
            body: JSON.stringify({
              email: recipient.email,
              fields: { name: recipient.name || '' },
              status: 'active'
            })
          }).catch(() => {}); // fire and forget
        }
      } catch (e) {
        console.warn('MailerLite sync warning (non-critical):', e.message);
      }
    }

    return Response.json({
      success_count: successCount,
      failed_count: failedCount,
      failed_details: failedDetails,
      total: recipients.length,
      sent_via: 'gmail'
    });

  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});