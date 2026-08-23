// Shared SES email helpers — used by processNewsletterQueue and sendNewsletterReport

const APP_BASE_URL = 'https://crm-pantarei-4738bca7.base44.app';

export function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function htmlToPlainText(html) {
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

export async function sendViaSES(to, subject, htmlContent, unsubscribeToken) {
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