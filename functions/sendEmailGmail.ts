import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const senderName = from_name || 'פנטהריי';
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    let sent_via = null;

    // --- Try Brevo first ---
    if (BREVO_API_KEY && BREVO_API_KEY.length > 10) {
      try {
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: senderName, email: 'pantarhei.movement@gmail.com' },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html_content,
          }),
        });

        if (brevoResponse.ok) {
          sent_via = 'brevo';
          console.log(`Email sent via Brevo to ${to}`);
          return Response.json({ success: true, sent_via: 'brevo' });
        } else {
          const errorData = await brevoResponse.text();
          console.warn(`Brevo failed for ${to}: ${errorData}. Falling back to Gmail.`);
        }
      } catch (brevoError) {
        console.warn(`Brevo error for ${to}: ${brevoError.message}. Falling back to Gmail.`);
      }
    } else {
      console.log('No Brevo API key configured. Using Gmail directly.');
    }

    // --- Fallback: Gmail API ---
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    // Encode subject in UTF-8 base64 for MIME
    const encoder = new TextEncoder();
    const subjectBytes = encoder.encode(subject);
    const subjectB64 = btoa(String.fromCharCode(...subjectBytes));

    // Encode HTML content in base64 (raw bytes, no double encoding)
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

    // Encode the full MIME message to base64url for Gmail API
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
      return Response.json({ error: 'Both Brevo and Gmail failed', details: errorData }, { status: response.status });
    }

    const result = await response.json();
    console.log(`Email sent via Gmail to ${to}`);
    return Response.json({ success: true, sent_via: 'gmail', messageId: result.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});