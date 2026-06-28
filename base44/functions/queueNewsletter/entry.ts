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

    // Generate tokens for subscribers that are missing one — parallel batches of 20
    const tokenUpdates = emailSubscribers.filter(s => !s.unsubscribe_token);
    if (tokenUpdates.length > 0) {
      for (const s of tokenUpdates) {
        s.unsubscribe_token = crypto.randomUUID();
      }
      const PARALLEL = 20;
      for (let i = 0; i < tokenUpdates.length; i += PARALLEL) {
        await Promise.all(
          tokenUpdates.slice(i, i + PARALLEL).map(s =>
            base44.asServiceRole.entities.Subscribers.update(s.id, { unsubscribe_token: s.unsubscribe_token })
          )
        );
      }
      console.log(`✅ Generated tokens for ${tokenUpdates.length} subscribers missing one`);
    }

    // Save the HTML template ONCE in NewsletterLogs as a draft
    await base44.asServiceRole.entities.NewsletterLogs.create({
      subject,
      content: html_content,
      group: group || 'כל הרשימה',
      recipients_count: emailSubscribers.length,
      status: 'בתהליך',
      sent_date: new Date().toISOString(),
      sent_by: 'SES (Queue)',
      error_message: batch_id // store batch_id here temporarily for lookup
    });

    // Build slim queue records — NO html_content per record
    const records = emailSubscribers.map(s => ({
      batch_id,
      email: s.email,
      name: s.name || '',
      subject,
      unsubscribe_token: s.unsubscribe_token,
      status: 'pending'
    }));

    // BulkCreate in chunks of 500
    const CHUNK_SIZE = 500;
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