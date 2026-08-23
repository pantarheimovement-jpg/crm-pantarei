import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendViaSES } from '../../shared/sesEmail.ts';
import { buildReportHtml, countByStatus, countEmailEvents } from '../../shared/newsletterReport.ts';

const APP_BASE_URL = 'https://crm-pantarei-4738bca7.base44.app';
const BATCH_SIZE = 100;
const DELAY_MS = 100;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
      const opensR = await countEmailEvents(base44, subjR, 'open');
      const clicksR = await countEmailEvents(base44, subjR, 'click');
      await sendViaSES('pantarhei.movement@gmail.com', `דוח שליחת הניוזלטר "${subjR}"`, buildReportHtml(subjR, sentR, failedR, cancelledR, rb, opensR, clicksR), null);
      return Response.json({ success: true, report: true, sent: sentR, failed: failedR, cancelled: cancelledR, opens: opensR, clicks: clicksR });
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
      if (logs && logs.length > 0) {
        await base44.asServiceRole.entities.NewsletterLogs.update(logs[0].id, {
          recipients_count: sentCount,
          sent_date: new Date().toISOString(),
          status: 'נשלח - ממתין לדוח'
        });
      }
    }
    return Response.json({ success: true, processed: pending.length, sent, failed, errors: errors.slice(0, 3) });
  } catch (error) {
    console.error('processNewsletterQueue error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});