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

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    const senderName = from_name || 'פנטהריי';

    // Build the raw MIME message
    const boundary = 'boundary_' + Date.now();
    const mimeMessage = [
      `From: ${senderName} <me>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      btoa(unescape(encodeURIComponent(html_content))),
      `--${boundary}--`
    ].join('\r\n');

    // Encode to base64url
    const raw = btoa(unescape(encodeURIComponent(mimeMessage)))
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
    return Response.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});