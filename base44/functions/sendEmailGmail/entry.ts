import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, html_content, from_name } = await req.json();

    if (!to || !subject || !html_content) {
      return Response.json({ error: 'Missing required fields: to, subject, html_content' }, { status: 400 });
    }

    // Check if newsletter sending is enabled
    const automationSettingsList = await base44.asServiceRole.entities.AutomationSettings.list();
    const automationSettings = automationSettingsList && automationSettingsList.length > 0 ? automationSettingsList[0] : null;
    if (!automationSettings || !automationSettings.newsletter_sending_enabled) {
      console.log('⚠️ Newsletter/email sending is disabled in AutomationSettings');
      return Response.json({ 
        error: 'מערכת הדיוור מושבתת. ניתן להפעיל בהגדרות CRM → אוטומציה',
        disabled: true 
      }, { status: 403 });
    }

    const senderName = from_name || 'פנטהריי';

    // --- Try MailerLite first ---
    const MAILERLITE_API_KEY = Deno.env.get('mailerlite');
    
    if (MAILERLITE_API_KEY && MAILERLITE_API_KEY.length > 10) {
      try {
        // MailerLite doesn't have a transactional email API for single sends.
        // Their API is campaign/subscriber-based.
        // For single emails (automations, test emails), we go directly to Gmail.
        console.log('MailerLite is configured but used for subscriber management only. Sending via Gmail.');
      } catch (mlError) {
        console.warn(`MailerLite error: ${mlError.message}. Using Gmail.`);
      }
    }

    // --- Send via Gmail API ---
    const connection = await base44.asServiceRole.connectors.getConnection("gmail");
    const accessToken = connection.accessToken;

    const encoder = new TextEncoder();

    // Encode subject in UTF-8 base64 for MIME
    const subjectBytes = encoder.encode(subject);
    const subjectB64 = btoa(String.fromCharCode(...subjectBytes));

    // Encode HTML content in base64
    const htmlBytes = encoder.encode(html_content);
    const htmlB64 = btoa(String.fromCharCode(...htmlBytes));

    const boundary = 'boundary_' + Date.now();
    const mimeLines = [
      `From: ${senderName} <me>`,
      `To: ${to}`,
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

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gmail API error:', errorData);
      return Response.json({ error: 'Gmail send failed', details: errorData }, { status: response.status });
    }

    const result = await response.json();
    console.log(`Email sent via Gmail to ${to}`);
    return Response.json({ success: true, sent_via: 'gmail', messageId: result.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});