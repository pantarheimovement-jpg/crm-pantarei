import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject, html_content, group, batch_id } = await req.json();
    if (!subject || !html_content || !batch_id) {
      return Response.json({ error: 'Missing required fields: subject, html_content, batch_id' }, { status: 400 });
    }

    // Load all active subscribers with pagination
    let allSubscribers = [];
    let skip = 0;
    const PAGE_SIZE = 500;
    while (true) {
      const batch = await base44.asServiceRole.entities.Subscribers.filter({ subscribed: true }, '-created_date', PAGE_SIZE, skip);
      if (!batch || batch.length === 0) break;
      allSubscribers = allSubscribers.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      skip += batch.length;
    }

    // Filter by group if specified
    if (group && group !== 'כל הרשימה') {
      allSubscribers = allSubscribers.filter(s =>
        s.group === group ||
        (s.groups && Array.isArray(s.groups) && s.groups.includes(group))
      );
    }

    const emailSubscribers = allSubscribers.filter(s => s.email);
    if (emailSubscribers.length === 0) {
      return Response.json({ error: 'No subscribers found' }, { status: 400 });
    }

    // Build personalized queue records
    const APP_BASE_URL = 'https://crm-pantarei-4738bca7.base44.app';
    const records = emailSubscribers.map(s => {
      const unsubscribeUrl = `${APP_BASE_URL}/functions/unsubscribeHandler?token=${s.unsubscribe_token || ''}`;
      const personalizedHtml = html_content
        .replace(/\{\{unsubscribe_link\}\}/g, unsubscribeUrl)
        .replace(/\{\{name\}\}/g, s.name || '');
      return {
        batch_id,
        email: s.email,
        name: s.name || '',
        subject,
        html_content: personalizedHtml,
        unsubscribe_token: s.unsubscribe_token || '',
        status: 'pending'
      };
    });

    // BulkCreate in chunks of 200 to avoid payload limits
    const CHUNK_SIZE = 200;
    let totalQueued = 0;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      await base44.asServiceRole.entities.NewsletterQueue.bulkCreate(chunk);
      totalQueued += chunk.length;
    }

    return Response.json({ success: true, queued: totalQueued, batch_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});