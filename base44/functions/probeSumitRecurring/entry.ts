// PROBE — קריאה בלבד. קורא /billing/recurring/listforcustomer/ לכל לקוח הו"ק,
// ומחשב מספר תשלומים = חודשים בין Date_Start ל-Date_Last + 1 (אם Date_Last קיים).
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
  function monthsBetween(a: string, b: string): number | null {
    if (!a || !b) return null;
    const d1 = new Date(a), d2 = new Date(b);
    if (isNaN(+d1) || isNaN(+d2)) return null;
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
  }

  // 1. אוסף CustomerID ייחודיים מכל תשלומי ההו"ק
  const payRes = await call('/billing/payments/list/', { Date_From: '2024-01-01T00:00:00', Date_To: '2026-12-31T23:59:59', Paging: { StartIndex: 0, PageSize: 1000 } });
  const payments = payRes.json?.Data?.Payments || [];
  const custIds = new Set<number>();
  for (const p of payments) if ((p.RecurringCustomerItemIDs || []).length) custIds.add(p.CustomerID);

  // 2. לכל לקוח — listforcustomer, ומחלץ את פריטי ההו"ק
  const rows: unknown[] = [];
  let rawSample: unknown = null;
  let i = 0;
  for (const cid of custIds) {
    const r = await call('/billing/recurring/listforcustomer/', { Customer: { ID: cid }, IncludeInactive: true });
    const items = r.json?.Data?.RecurringItems || r.json?.RecurringItems || [];
    if (i++ === 0) rawSample = { customerId: cid, raw: r.json?.Data ?? r.json };
    for (const it of items) {
      rows.push({
        customerId: cid,
        item: it.Item?.Name ?? it.Description ?? null,
        unitPrice: it.UnitPrice ?? null,
        qty: it.Quantity ?? null,
        status: it.Status ?? null,
        dateStart: (it.Date_Start || '').slice(0, 10) || null,
        dateLast: (it.Date_Last || '').slice(0, 10) || null,
        dateNext: (it.Date_NextBilling || '').slice(0, 10) || null,
        computedPayments: monthsBetween(it.Date_Start, it.Date_Last),
      });
    }
  }
  const withLast = rows.filter((r: any) => r.dateLast).length;
  return Response.json({ customers: custIds.size, recurringRows: rows.length, rowsWithDateLast: withLast, rawSample, rows });
});
