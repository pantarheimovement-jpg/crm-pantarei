import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { SESClient, SendEmailCommand } from 'npm:@aws-sdk/client-ses@^3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Note: Auth is handled by the app's login system.
    // The CRM pages are only accessible to logged-in users.

    const { to, subject, html_content, from_name } = await req.json();

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

        const commandParams = {
          Source: `${senderName} <newsletter@pantarhei-studio.co.il>`,
          Destination: { ToAddresses: [to] },
          ReplyToAddresses: ['pantarhei.movement@gmail.com'],
          Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: html_content, Charset: 'UTF-8' },
            },
          },
        };

        // Add Configuration Set for open/click tracking if configured
        const configSet = Deno.env.get('SES_CONFIGURATION_SET') || 'pantarhei-tracking';
        commandParams.ConfigurationSetName = configSet;
        console.log(`sendEmailSES: Sending via SES to ${to}, ConfigurationSet: ${configSet}`);

        const command = new SendEmailCommand(commandParams);

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
    const subjectB64 = btoa(String.fromCharCode(...encoder.encode(subject)));
    const htmlB64 = btoa(String.fromCharCode(...encoder.encode(html_content)));

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