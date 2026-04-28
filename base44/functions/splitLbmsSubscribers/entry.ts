import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ORIGINAL_GROUP = 'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף';
const GROUP_ONE = 'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 1💜';
const GROUP_TWO = 'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 2⭐';

function isLbmsSubscriber(subscriber) {
  const groups = Array.isArray(subscriber.groups) ? subscriber.groups : [];
  const allGroups = [subscriber.group, ...groups].filter(Boolean);
  return subscriber.subscribed !== false && allGroups.some((group) =>
    group === ORIGINAL_GROUP || group === GROUP_ONE || group === GROUP_TWO
  );
}

function cleanedGroups(subscriber, targetGroup) {
  const groups = Array.isArray(subscriber.groups) ? subscriber.groups : [];
  const preserved = groups.filter((group) =>
    group !== ORIGINAL_GROUP && group !== GROUP_ONE && group !== GROUP_TWO
  );
  return [...preserved, targetGroup];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const subscribers = await base44.asServiceRole.entities.Subscribers.list('-created_date', 1000);
    const lbmsSubscribers = (subscribers || [])
      .filter(isLbmsSubscriber)
      .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '', 'he'));

    if (lbmsSubscribers.length !== 93) {
      return Response.json({
        error: `Expected 93 active LBMS subscribers, found ${lbmsSubscribers.length}`,
        found: lbmsSubscribers.length,
      }, { status: 400 });
    }

    const groupOne = lbmsSubscribers.slice(0, 46);
    const groupTwo = lbmsSubscribers.slice(46);

    for (const subscriber of groupOne) {
      await base44.asServiceRole.entities.Subscribers.update(subscriber.id, {
        group: GROUP_ONE,
        groups: cleanedGroups(subscriber, GROUP_ONE),
      });
    }

    for (const subscriber of groupTwo) {
      await base44.asServiceRole.entities.Subscribers.update(subscriber.id, {
        group: GROUP_TWO,
        groups: cleanedGroups(subscriber, GROUP_TWO),
      });
    }

    return Response.json({
      success: true,
      group_one: GROUP_ONE,
      group_one_count: groupOne.length,
      group_two: GROUP_TWO,
      group_two_count: groupTwo.length,
      first_group_one: groupOne[0]?.name || groupOne[0]?.email || '',
      last_group_one: groupOne[groupOne.length - 1]?.name || groupOne[groupOne.length - 1]?.email || '',
      first_group_two: groupTwo[0]?.name || groupTwo[0]?.email || '',
      last_group_two: groupTwo[groupTwo.length - 1]?.name || groupTwo[groupTwo.length - 1]?.email || '',
    });
  } catch (error) {
    console.error('splitLbmsSubscribers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});