import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GROUPS = [
  'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 3🌿',
  'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 4🌸',
  'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 5🌞',
  'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 6🌙',
];

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { batch_limit = 25 } = await req.json().catch(() => ({}));
    const subscribers = await base44.asServiceRole.entities.Subscribers.list('-created_date', 2000);
    const historical = (subscribers || [])
      .filter((subscriber) => subscriber.source === 'ייבוא היסטורי LBMS')
      .sort((a, b) => normalizeEmail(a.email).localeCompare(normalizeEmail(b.email)));

    const counts = Object.fromEntries(GROUPS.map((group) => [group, 0]));
    const updates = [];

    historical.forEach((subscriber, index) => {
      const group = GROUPS[Math.floor(index / 35)] || GROUPS[GROUPS.length - 1];
      counts[group] += 1;
      const subscriberGroups = Array.isArray(subscriber.groups) ? subscriber.groups : [];
      const needsUpdate = subscriber.group !== group || subscriberGroups.length !== 1 || subscriberGroups[0] !== group || subscriber.subscribed !== true || subscriber.marketing_consent !== true;
      if (needsUpdate) updates.push({ subscriber, group });
    });

    const batch = updates.slice(0, batch_limit);

    for (const item of batch) {
      await base44.asServiceRole.entities.Subscribers.update(item.subscriber.id, {
        group: item.group,
        groups: [item.group],
        subscribed: true,
        marketing_consent: true,
      });
    }

    return Response.json({
      success: true,
      total_historical: historical.length,
      updated_this_run: batch.length,
      remaining_updates: Math.max(0, updates.length - batch.length),
      group_counts: counts,
    });
  } catch (error) {
    console.error('rebalanceHistoricalLbmsSubscriberGroups error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});