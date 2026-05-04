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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const to = 'pantarhei.movement@gmail.com';
    const subject = `בדיקת SES טקסט בלבד ${new Date().toISOString()}`;
    const textContent = 'שלום, זה מייל ניסיון מפנטהריי';

    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'eu-north-1';
    const configSet = Deno.env.get('SES_CONFIGURATION_SET') || 'pantarhei-tracking';

    const client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const rawMessage = [
      `From: פנטהריי <newsletter@pantarhei-studio.co.il>`,
      `To: ${to}`,
      `Reply-To: info@pantarhei-studio.co.il`,
      `Subject: =?UTF-8?B?${encodeBase64Utf8(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      encodeBase64Utf8(textContent),
    ].join('\r\n');

    await client.send(new SendRawEmailCommand({
      RawMessage: { Data: new TextEncoder().encode(rawMessage) },
      ConfigurationSetName: configSet,
    }));

    await new Promise((resolve) => setTimeout(resolve, 15000));

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const query = encodeURIComponent(`to:${to} subject:"${subject}" newer_than:1d in:anywhere`);
    const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const listData = await listResponse.json();
    const messageId = listData.messages?.[0]?.id;

    if (!messageId) {
      return Response.json({ sent: true, found: false, subject, verdict: 'נשלח דרך SES, אבל לא נמצא עדיין בג׳ימייל אחרי 15 שניות' });
    }

    const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const messageData = await messageResponse.json();
    const labelIds = messageData.labelIds || [];

    const placement = labelIds.includes('SPAM')
      ? 'spam'
      : labelIds.includes('INBOX') && labelIds.includes('CATEGORY_PERSONAL')
        ? 'primary'
        : labelIds.includes('INBOX')
          ? 'inbox'
          : 'unknown';

    return Response.json({
      sent: true,
      found: true,
      to,
      subject,
      labelIds,
      placement,
      verdict: placement === 'spam'
        ? 'המייל הגיע לספאם'
        : placement === 'primary'
          ? 'המייל הגיע לתיבה הראשית'
          : placement === 'inbox'
            ? 'המייל הגיע לאינבוקס, אך לא זוהתה קטגוריית Primary'
            : 'המייל נמצא, אך לא ניתן לזהות בוודאות את התיקייה'
    });
  } catch (error) {
    console.error('sendPlainSesTest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});