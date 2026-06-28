import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { SESClient, SendRawEmailCommand } from 'npm:@aws-sdk/client-ses@^3';

const APP_BASE_URL = 'https://crm-pantarei-4738bca7.base44.app';
const BATCH_SIZE = 14;
const DELAY_MS = 200;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

async function sendViaSES(to, subject, htmlContent, unsubscribeToken) {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const region = Deno.env.get('AWS_REGION') || 'eu-north-1';
  const configSet = Deno.env.get('SES_CONFIGURATION_SET') || 'pantarhei-tracking';

  const client = new SESClient({ region, credentials: { accessKeyId, secretAccessKey } });

  const subjectB64 = encodeBase64Utf8(subject);
  const htmlB64 = encodeBase64Utf8(htmlContent);
  const textB64 = encodeBase64Utf8(htmlToPlainText(htmlContent));
  const boundary = `pantarhei_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const unsubUrl = unsubscribeToken
    ? `<mailto:pantarhei.movement@gmail.com?subject=unsubscribe>, <${APP_BASE_URL}/functions/unsubscribeHandler?token=${unsubscribeToken}>`
    : `<mailto:pantarhei.movement@gmail.com?subject=unsubscribe>`;

  const rawMessage = [
    `From: פנטהריי <newsletter@pantarhei-studio.co.il>`,
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

  const encoder = new TextEncoder();
  const command = new SendRawEmailCommand({
    RawMessage: { Data: encoder.encode(rawMessage) },
    ConfigurationSetName: configSet,
  });

  await client.send(command);
  console.log(`✅ Sent to ${to}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    // === TEST MODE ===
    if (body.test_mode === true && body.send_test_to && body.batch_id) {
      const logs = await base44.asServiceRole.entities.NewsletterLogs.filter({ error_message: body.batch_id });
      const log = logs && logs[0];
      if (!log) return Response.json({ error: 'No log found for batch_id ' + body.batch_id }, { status: 404 });

      const unsubscribeUrl = `${APP_BASE_URL}/functions/unsubscribeHandler?token=test-preview-token`;
      const personalizedHtml = log.content
        .replace(/\{\{unsubscribe_link\}\}/g, unsubscribeUrl)
        .replace(/\{\{name\}\}/g, 'איינת');

      await sendViaSES(body.send_test_to, log.subject, personalizedHtml, 'test-preview-token');
      return Response.json({ success: true, sent_to: body.send_test_to, subject: log.subject });
    }

    // === NORMAL MODE: process pending queue items ===
    const pending = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { status: 'pending' }, 'created_date', BATCH_SIZE
    );

    if (!pending || pending.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No pending items' });
    }

    const batchId = pending[0].batch_id;
    const logs = await base44.asServiceRole.entities.NewsletterLogs.filter({ error_message: batchId });
    const logHtmlTemplate = logs && logs.length > 0 ? logs[0].content : null;

    let sent = 0, failed = 0;

    for (const item of pending) {
      try {
        const htmlTemplate = logHtmlTemplate || item.html_content;
        if (!htmlTemplate) throw new Error('No HTML content found for item ' + item.id);

        const unsubscribeUrl = `${APP_BASE_URL}/functions/unsubscribeHandler?token=${item.unsubscribe_token}`;
        const personalizedHtml = htmlTemplate
          .replace(/\{\{unsubscribe_link\}\}/g, unsubscribeUrl)
          .replace(/\{\{name\}\}/g, item.name || '');

        await sendViaSES(item.email, item.subject, personalizedHtml, item.unsubscribe_token);

        await base44.asServiceRole.entities.NewsletterQueue.update(item.id, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });
        sent++;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`❌ Failed for ${item.email}: ${err.message}`);
        await base44.asServiceRole.entities.NewsletterQueue.update(item.id, {
          status: 'failed',
          error_message: err.message
        });
        failed++;
      }
    }

    // Check if batch is fully complete
    const remaining = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { batch_id: batchId, status: 'pending' }, 'created_date', 1
    );

    if (!remaining || remaining.length === 0) {
      const failedItems = await base44.asServiceRole.entities.NewsletterQueue.filter(
        { batch_id: batchId, status: 'failed' }, 'created_date', 5000
      );
      const totalFailedCount = failedItems ? failedItems.length : 0;
      const logTotal = logs && logs.length > 0 ? (logs[0].recipients_count || 0) : 0;
      const totalSentCount = logTotal - totalFailedCount;
      const batchSubject = pending[0].subject || 'ניוזלטר';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'pantarhei.movement@gmail.com',
        subject: `✅ שליחת הניוזלטר הושלמה`,
        body: `שליחת הניוזלטר "${batchSubject}" הושלמה!\n\n📧 נשלח: ${totalSentCount}\n❌ נכשל: ${totalFailedCount}\n\nקמפיין: ${batchId}`
      });

      if (logs && logs.length > 0) {
        await base44.asServiceRole.entities.NewsletterLogs.update(logs[0].id, {
          recipients_count: totalSentCount,
          status: totalFailedCount > 0 ? `נשלח חלקית (${totalFailedCount} שגיאות)` : 'נשלח בהצלחה',
          error_message: totalFailedCount > 0 ? `${totalFailedCount} כשלונות` : null
        });
      }
    }

    return Response.json({ success: true, processed: pending.length, sent, failed });
  } catch (error) {
    console.error('processNewsletterQueue error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});