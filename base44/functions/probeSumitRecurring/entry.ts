// PROBE — קריאה בלבד. לא כותב כלום. לא מחזיר נתוני אשראי.
Deno.serve(async (req) => {
  const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
  const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
  if (!SUMIT_API_KEY || !SUMIT_COMPANY_ID) return Response.json({ error: 'creds missing' }, { status: 500 });
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== 'probe-2026-09-01') return Response.json({ error: 'unauthorized' }, { status: 401 });
  const credentials = { CompanyID: Number(String(SUMIT_COMPANY_ID).replace(/\D/g, '')), APIKey: String(SUMIT_API_KEY).trim() };
  async function call(path: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`https://api.sumit.co.il${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Credentials: credentials, ...body })
      });
      const t = await res.text(); let j: any = null; try { j = JSON.parse(t); } catch (_) {}
      return { http: res.status, json: j };
    } catch (e) { return { http: 0, json: null }; }
  }
  const first = (v: any) => Array.isArray(v) ? v[0] : v;

  // 1. כל תשלומי ההו"ק בטווח רחב
  const payRes = await call('/billing/payments/list/', { Date_From: '2024-01-01T00:00:00', Date_To: '2026-12-31T23:59:59', Paging: { StartIndex: 0, PageSize: 1000 } });
  const payments = payRes.json?.Data?.Payments || [];
  // ממפה RecurringCustomerItemID → קבוצת התשלומים שלו (כדי לספור חיובים שכבר בוצעו)
  const byItem: Record<string, { count: number; amounts: number[]; dates: string[]; customerId: number }> = {};
  for (const p of payments) {
    for (const rid of (p.RecurringCustomerItemIDs || [])) {
      const k = String(rid);
      if (!byItem[k]) byItem[k] = { count: 0, amounts: [], dates: [], customerId: p.CustomerID };
      byItem[k].count++; byItem[k].amounts.push(p.Amount); byItem[k].dates.push((p.Date || '').slice(0, 10));
    }
  }
  const itemIds = Object.keys(byItem);

  // 2. לכל פריט הו"ק — getentity, ומחלץ את שדות ה-Billing (כולל כל שדה שנראה כמו ספירה)
  const rows: unknown[] = [];
  const allBillingKeys = new Set<string>();
  for (const id of itemIds) {
    const r = await call('/crm/data/getentity/', { EntityID: Number(id) });
    const ent = r.json?.Data?.Entity;
    if (!ent) { rows.push({ id, error: r.json?.UserErrorMessage || r.http }); continue; }
    for (const k of Object.keys(ent)) if (k.startsWith('Billing_')) allBillingKeys.add(k);
    rows.push({
      id,
      customer: first(ent.Billing_Customers)?.Name || null,
      item: first(ent.Billing_Item)?.Name || null,
      price: first(ent.Billing_Price),
      total: first(ent.Billing_Total),
      durationMonths: first(ent.Billing_DurationMonths),
      statusEnum: first(ent.Billing_StatusEnum),
      recurrence: first(ent.Billing_Recurrence) ?? null,
      count_field: first(ent.Billing_Count) ?? first(ent.Billing_Payments) ?? first(ent.Billing_NumberOfPayments) ?? null,
      dateStart: (first(ent.Billing_Date_Start) || '').slice(0, 10),
      dateNext: (first(ent.Billing_Date_NextBilling) || '').slice(0, 10),
      dateLast: (first(ent.Billing_Date_LastBilling) || '').slice(0, 10),
      dateEnd: (first(ent.Billing_Date_End) || '').slice(0, 10) || null,
      chargesSoFar: byItem[id].count,
      chargeAmounts: byItem[id].amounts,
    });
  }
  return Response.json({
    recurringItems: itemIds.length,
    allBillingKeysSeen: [...allBillingKeys].sort(),
    rows,
  });
});
