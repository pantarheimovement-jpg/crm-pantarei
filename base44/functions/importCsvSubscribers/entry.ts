import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '972' + cleaned.slice(1);
  if (!cleaned.startsWith('972') && cleaned.length >= 9 && cleaned.length <= 10) {
    cleaned = '972' + cleaned;
  }
  return cleaned;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  
  // Parse header
  const headerLine = lines[0].replace(/^\ufeff/, '');
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { csv_url, group_name } = await req.json();
    if (!csv_url || !group_name) {
      return Response.json({ error: 'csv_url and group_name required' }, { status: 400 });
    }

    // Fetch CSV
    const csvResp = await fetch(csv_url);
    const csvText = await csvResp.text();
    const rows = parseCSV(csvText);
    console.log(`Parsed ${rows.length} rows from CSV`);

    // Load all existing subscribers for dedup
    let allExisting = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Subscribers.list('-created_date', 500, skip);
      if (!batch || batch.length === 0) break;
      allExisting = allExisting.concat(batch);
      if (batch.length < 500) break;
      skip += batch.length;
    }
    console.log(`Loaded ${allExisting.length} existing subscribers`);

    // Build lookup maps
    const emailMap = new Map();
    const whatsappMap = new Map();
    for (const s of allExisting) {
      if (s.email) emailMap.set(s.email.toLowerCase(), s);
      if (s.whatsapp) whatsappMap.set(s.whatsapp, s);
    }

    const toCreate = [];
    const toUpdateGroups = [];
    let skipCount = 0;
    const seenEmails = new Set();

    for (const row of rows) {
      const email = (row.email || '').trim().toLowerCase();
      const phone = normalizePhone(row.phone || row.phone_normalized || '');
      const name = (row.name || '').trim();

      if (!email && !phone) { skipCount++; continue; }
      if (email && seenEmails.has(email)) { skipCount++; continue; }

      const existing = (email ? emailMap.get(email) : null) || (phone ? whatsappMap.get(phone) : null);

      if (existing) {
        const currentGroups = existing.groups || (existing.group ? [existing.group] : []);
        if (!currentGroups.includes(group_name)) {
          toUpdateGroups.push({ id: existing.id, groups: [...currentGroups, group_name] });
        } else {
          skipCount++;
        }
      } else {
        toCreate.push({
          email: email || '',
          whatsapp: phone,
          name: name,
          subscribed: true,
          unsubscribe_token: generateToken(),
          source: 'ייבוא CSV (backend)',
          group: group_name,
          groups: [group_name],
          marketing_consent: false,
        });
      }

      if (email) seenEmails.add(email);
    }

    console.log(`To create: ${toCreate.length}, to update groups: ${toUpdateGroups.length}, skipped: ${skipCount}`);

    // Bulk create in batches of 50
    let created = 0;
    for (let i = 0; i < toCreate.length; i += 50) {
      const batch = toCreate.slice(i, i + 50);
      await base44.asServiceRole.entities.Subscribers.bulkCreate(batch);
      created += batch.length;
      console.log(`Created ${created}/${toCreate.length}`);
    }

    // Update groups with delays to avoid rate limits
    let updated = 0;
    for (const item of toUpdateGroups) {
      let retries = 0;
      while (retries < 3) {
        try {
          await base44.asServiceRole.entities.Subscribers.update(item.id, { groups: item.groups });
          break;
        } catch (e) {
          if (e.message && e.message.includes('Rate limit') && retries < 2) {
            retries++;
            console.log(`Rate limit hit at ${updated}, waiting 5s (retry ${retries})...`);
            await new Promise(r => setTimeout(r, 5000));
          } else {
            throw e;
          }
        }
      }
      updated++;
      // Delay every single update to stay under rate limit
      await new Promise(r => setTimeout(r, 500));
      if (updated % 50 === 0) {
        console.log(`Updated groups ${updated}/${toUpdateGroups.length}`);
      }
    }

    const result = {
      total: rows.length,
      created: toCreate.length,
      merged: toUpdateGroups.length,
      skipped: skipCount,
      group: group_name
    };
    console.log('Import complete:', result);
    return Response.json(result);

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});