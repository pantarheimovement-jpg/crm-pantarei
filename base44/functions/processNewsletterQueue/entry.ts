import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APP_BASE_URL = 'https://crm-pantarei-4738bca7.base44.app';
const BATCH_SIZE = 100;
const DELAY_MS = 100;

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

function toHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(message) {
  const data = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

async function hmacSign(key, message) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)));
}

async function sendViaSES(to, subject, htmlContent, unsubscribeToken) {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const region = Deno.env.get('AWS_REGION') || 'eu-north-1';
  const configSet = Deno.env.get('SES_CONFIGURATION_SET') || 'pantarhei-tracking';
  if (!accessKeyId || !secretAccessKey) throw new Error('Missing AWS credentials');

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

  const rawB64 = encodeBase64Utf8(rawMessage);
  const params = new URLSearchParams();
  params.set('Action', 'SendRawEmail');
  params.set('Version', '2010-12-01');
  params.set('ConfigurationSetName', configSet);
  params.set('RawMessage.Data', rawB64);
  const reqBody = params.toString();

  const service = 'ses';
  const host = `email.${region}.amazonaws.com`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex(reqBody);
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  const kDate = await hmacSign(new TextEncoder().encode('AWS4' + secretAccessKey), dateStamp);
  const kRegion = await hmacSign(kDate, region);
  const kService = await hmacSign(kRegion, service);
  const kSigning = await hmacSign(kService, 'aws4_request');
  const signature = toHex(await hmacSign(kSigning, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const resp = await fetch(`https://${host}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Amz-Date': amzDate,
      'Authorization': authHeader,
    },
    body: reqBody,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`SES HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }
  console.log(`Sent to ${to}`);
}

async function countByStatus(base44, batchId, status) {
  let total = 0;
  let skip = 0;
  const PAGE = 500;
  while (true) {
    const rows = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: batchId, status }, 'created_date', PAGE, skip);
    if (!rows || rows.length === 0) break;
    total += rows.length;
    if (rows.length < PAGE) break;
    skip += rows.length;
    if (skip > 20000) break;
  }
  return total;
}

function buildReportHtml(subject, sent, failed, cancelled, batchId) {
  const total = sent + failed + cancelled;
  return `<div style="background:#FDF8F0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#6D436D;padding:22px 20px;text-align:center;">
      <h1 style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;">דוח שליחת ניוזלטר</h1>
    </div>
    <div style="padding:24px;color:#5E4B35;">
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">השליחה של <strong>"${subject}"</strong> הושלמה.</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">✅ נשלחו בהצלחה</td><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:bold;color:#1D9E75;font-size:18px;">${sent}</td></tr>
        <tr><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">⚠️ נכשלו</td><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:bold;color:#D85A30;font-size:18px;">${failed}</td></tr>
        <tr><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">🚫 הוחרגו (כתובות שחזרו)</td><td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:left;font-weight:bold;color:#999999;font-size:18px;">${cancelled}</td></tr>
        <tr><td style="padding:12px 8px;">📋 סך הכל ברשימה</td><td style="padding:12px 8px;text-align:left;font-weight:bold;font-size:18px;">${total}</td></tr>
      </table>
      <div style="background:#FDF8F0;border-radius:8px;padding:12px 14px;margin-top:18px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#7a6a52;">"הוחרגו" = כתובות שחזרו בעבר (bounce) והוסרו אוטומטית כדי להגן על מוניטין השליחה.</p>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#aaaaaa;">קמפיין: ${batchId}</p>
    </div>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    if (body.write_test === true) {
      const fp = await base44.asServiceRole.entities.NewsletterQueue.filter({ status: 'pending' }, 'created_date', 1);
      if (!fp || fp.length === 0) return Response.json({ write_test: true, error: 'no pending item' });
      const it = fp[0];
      const marker = 'writetest_' + Date.now();
      let updateError = null;
      try {
        await base44.asServiceRole.entities.NewsletterQueue.update(it.id, { error_message: marker });
      } catch (e) {
        updateError = String(e && e.message || e);
      }
      const found = await base44.asServiceRole.entities.NewsletterQueue.filter({ error_message: marker }, 'created_date', 1);
      const rePending = await base44.asServiceRole.entities.NewsletterQueue.filter({ status: 'pending' }, 'created_date', 1);
      return Response.json({
        write_test: true,
        item_id: it.id,
        marker,
        updateError,
        persisted: found && found.length > 0,
        first_pending_id_now: rePending && rePending[0] ? rePending[0].id : null
      });
    }

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

    if (body.report_mode === true && body.batch_id) {
      const rb = body.batch_id;
      const logsR = await base44.asServiceRole.entities.NewsletterLogs.filter({ error_message: rb });
      const sampleR = await base44.asServiceRole.entities.NewsletterQueue.filter({ batch_id: rb }, 'created_date', 1);
      const subjR = (sampleR && sampleR[0] ? sampleR[0].subject : null) || (logsR && logsR[0] ? logsR[0].subject : null) || 'ניוזלטר';
      const sentR = await countByStatus(base44, rb, 'sent');
      const failedR = await countByStatus(base44, rb, 'failed');
      const cancelledR = await countByStatus(base44, rb, 'cancelled');
      await sendViaSES('pantarhei.movement@gmail.com', `דוח שליחת הניוזלטר "${subjR}"`, buildReportHtml(subjR, sentR, failedR, cancelledR, rb), null);
      return Response.json({ success: true, report: true, sent: sentR, failed: failedR, cancelled: cancelledR });
    }

    const firstPending = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { status: 'pending' }, 'created_date', 1
    );
    if (!firstPending || firstPending.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No pending items' });
    }
    const batchId = firstPending[0].batch_id;
    const pending = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { batch_id: batchId, status: 'pending' }, 'created_date', BATCH_SIZE
    );
    if (!pending || pending.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No pending items' });
    }

    const logs = await base44.asServiceRole.entities.NewsletterLogs.filter({ error_message: batchId });
    const logHtmlTemplate = logs && logs.length > 0 ? logs[0].content : null;

    let sent = 0, failed = 0;
    const errors = [];
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
          status: 'sent', sent_at: new Date().toISOString()
        });
        sent++;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`Failed for ${item.email}: ${err.message}`);
        errors.push({ email: item.email, error: String(err && err.message || err) });
        await base44.asServiceRole.entities.NewsletterQueue.update(item.id, {
          status: 'failed', error_message: String(err && err.message || err)
        });
        failed++;
      }
    }

    const remaining = await base44.asServiceRole.entities.NewsletterQueue.filter(
      { batch_id: batchId, status: 'pending' }, 'created_date', 1
    );
    if (!remaining || remaining.length === 0) {
      const sentCount = await countByStatus(base44, batchId, 'sent');
      const failedCount = await countByStatus(base44, batchId, 'failed');
      const cancelledCount = await countByStatus(base44, batchId, 'cancelled');
      const batchSubject = (pending && pending[0] ? pending[0].subject : null) || (logs && logs[0] ? logs[0].subject : null) || 'ניוזלטר';
      await sendViaSES('pantarhei.movement@gmail.com', `דוח שליחת הניוזלטר "${batchSubject}"`, buildReportHtml(batchSubject, sentCount, failedCount, cancelledCount, batchId), null);
      if (logs && logs.length > 0) {
        await base44.asServiceRole.entities.NewsletterLogs.update(logs[0].id, {
          recipients_count: sentCount,
          status: failedCount > 0 ? `נשלח בהצלחה (${failedCount} נכשלו)` : 'נשלח בהצלחה'
        });
      }
    }
    return Response.json({ success: true, processed: pending.length, sent, failed, errors: errors.slice(0, 3) });
  } catch (error) {
    console.error('processNewsletterQueue error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});