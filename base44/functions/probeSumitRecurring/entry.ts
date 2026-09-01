// PROBE — קריאה בלבד. בודק Billing_Balance / Billing_Pending / Quantity / Description על פריטי הו"ק.
Deno.serve(async (req) => {
  const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
  const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
  if (!SUMIT_API_KEY || !SUMIT_COMPANY_ID) return Response.json({ error: 'creds' }, { status: 500 });
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== 'probe-2026-09-01') return Response.json({ error: 'unauth' }, { status: 401 });
  const credentials = { CompanyID: Number(String(SUMIT_COMPANY_ID).replace(/\D/g, '')), APIKey: String(SUMIT_API_KEY).trim() };
  async function call(path: string, body: Record<string, unknown>) {
    const res = await fetch(`https://api.sumit.co.il${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Credentials: credentials, ...body }) });
    const t = await res.text(); let j: any = null; try { j = JSON.parse(t); } catch (_) {}
    return { http: res.status, json: j };
  }
  const first = (v: any) => Array.isArray(v) ? v[0] : v;
  const payRes = await call('/billing/payments/list/', { Date_From: '2024-01-01T00:00:00', Date_To: '2026-12-31T23:59:59', Paging: { StartIndex: 0, PageSize: 1000 } });
  const payments = payRes.json?.Data?.Payments || [];
  const ids = new Set<number>();
  for (const p of payments) for (const rid of (p.RecurringCustomerItemIDs || [])) ids.add(rid);
  const rows: unknown[] = [];
  let rawSample: unknown = null;
  let idx = 0;
  for (const id of ids) {
    const r = await call('/crm/data/getentity/', { EntityID: id });
    const ent = r.json?.Data?.Entity;
    if (!ent) continue;
    if (idx++ === 0) rawSample = ent; // דגימה גולמית מלאה של הראשון
    rows.push({
      customer: first(ent.Billing_Customers)?.Name || null,
      item: first(ent.Billing_Item)?.Name || null,
      price: first(ent.Billing_Price),
      total: first(ent.Billing_Total),
      balance: first(ent.Billing_Balance),
      pending: first(ent.Billing_Pending),
      quantity: first(ent.Billing_Quantity),
      description: first(ent.Billing_Description),
      durationMonths: first(ent.Billing_DurationMonths),
    });
  }
  return Response.json({ count: rows.length, rawSample, rows });
});
