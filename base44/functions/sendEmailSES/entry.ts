import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { SESClient, SendRawEmailCommand } from 'npm:@aws-sdk/client-ses@^3';

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // אבטחה: רק משתמש מחובר עם הרשאת אדמין רשאי לשלוח מייל דרך הפונקציה הזו.
    // (פונקציות רקע כמו processNewsletterQueue שולחות SES ישירות ולא דרך כאן.)
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { /* not logged in */ }
    if (!user || user.role !== 'admin') {
      return new Response('Forbidden', { status: 403 });
    }

    const { to, subject, html_content, from_name, unsubscribe_token, app_base_url, text_only } = await req.json();

    if (!to || !subject || !html_content) {
      return Response.json({ error: 'Missing required fields: to, subject, html_content' }, { status: 400 });
    }

    const automationSettingsList = await base44.asServiceRole.entities.AutomationSettings.list();
    const automationSettings = automationSettingsList?.[0] ?? null;
    if (!automationSettings?.newsletter_sending_enabled) {
      return Response.json({
        error: 'מערכת הדיוור מושבתת. ניתן להפעיל בהגדרות CRM → אוטומציה',
        disabled: true
      }, { status: 403 });
    }

    const senderName = from_name || 'פנטהריי';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'eu-north-1';

    // --- Try Amazon SES first ---
    if (accessKeyId && secretAccessKey) {
      try {
        const client = new SESClient({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });

        const configSet = Deno.env.get('SES_CONFIGURATION_SET') || 'pantarhei-tracking';

        const encoder2 = new TextEncoder();
        const subjectB64 = encodeBase64Utf8(subject);
        const htmlB64 = encodeBase64Utf8(html_content);
        const textB64 = encodeBase64Utf8(htmlToPlainText(html_content));
        const boundary = `pantarhei_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const unsubUrl = unsubscribe_token && app_base_url
          ? `<mailto:pantarhei.movement@gmail.com?subject=unsubscribe>, <${app_base_url}/functions/unsubscribeHandler?token=${unsubscribe_token}>`
          : `<mailto:pantarhei.movement@gmail.com?subject=unsubscribe>`;

        const rawMessage = text_only ? [
          `From: ${senderName} <newsletter@pantarhei-studio.co.il>`,
          `To: ${to}`,
          `Reply-To: info@pantarhei-studio.co.il`,
          `Subject: =?UTF-8?B?${subjectB64}?=`,
          `MIME-Version: 1.0`,
          `List-Unsubscribe: ${unsubUrl}`,
          `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
          `Content-Type: text/plain; charset=UTF-8`,
          `Content-Transfer-Encoding: base64`,
          ``,
          textB64,
        ].join('\r\n') : [
          `From: ${senderName} <newsletter@pantarhei-studio.co.il>`,
          `To: ${to}`,
          `Reply-To: info@pantarhei-studio.co.il`,
          `Subject: =?UTF-8?B?${subjectB64}?=`,
          `MIME-Version: 1.0`,
          `List-Unsubscribe: ${unsubUrl}`,
          `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset=UTF-8`,
          `Content-Transfer-Encoding: base64`,
          ``,
          textB64,
          `--${boundary}`,
          `Content-Type: text/html; charset=UTF-8`,
          `Content-Transfer-Encoding: base64`,
          ``,
          htmlB64,
          `--${boundary}--`,
        ].join('\r\n');

        console.log(`sendEmailSES: Sending via SES to ${to}, ConfigurationSet: ${configSet}`);

        const command = new SendRawEmailCommand({
          RawMessage: { Data: encoder2.encode(rawMessage) },
          ConfigurationSetName: configSet,
        });

        await client.send(command);
        console.log(`✅ Email sent via Amazon SES to ${to} (ConfigSet: ${configSet})`);
        return Response.json({ success: true, sent_via: 'ses' });

      } catch (sesError) {
        console.error(`❌ SES FAILED for ${to}: ${sesError.name} - ${sesError.message}`);
        console.error(`SES Error details: ${JSON.stringify(sesError.$metadata || {})}`);
        console.warn(`Falling back to Gmail for ${to}...`);
      }
    } else {
      console.log('No AWS credentials configured. Using Gmail directly.');
    }

    // --- Fallback: Gmail API ---
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    const encoder = new TextEncoder();
    const gmailSubjectB64 = encodeBase64Utf8(subject);
    const gmailHtmlB64 = encodeBase64Utf8(html_content);
    const gmailTextB64 = encodeBase64Utf8(htmlToPlainText(html_content));

    const gmailUnsubUrl = unsubscribe_token && app_base_url
      ? `<mailto:pantarhei.movement@gmail.com?subject=unsubscribe>, <${app_base_url}/functions/unsubscribeHandler?token=${unsubscribe_token}>`
      : `<mailto:pantarhei.movement@gmail.com?subject=unsubscribe>`;

    const boundary = 'boundary_' + Date.now();
    const mimeLines = [
      `From: ${senderName} <me>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${gmailSubjectB64}?=`,
      'MIME-Version: 1.0',
      `List-Unsubscribe: ${gmailUnsubUrl}`,
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      gmailTextB64,
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      gmailHtmlB64,
      `--${boundary}--`,
    ];
    const raw = btoa(String.fromCharCode(...encoder.encode(mimeLines.join('\r\n'))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

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
      return Response.json({ error: 'Both SES and Gmail failed', details: errorData }, { status: response.status });
    }

    const result = await response.json();
    return Response.json({ success: true, sent_via: 'gmail', messageId: result.id });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});