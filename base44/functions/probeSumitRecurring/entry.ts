// PROBE — קריאה בלבד. לא כותב שום דבר, לא לסאמיט ולא ל-CRM.
// לעולם לא מחזיר נתוני אשראי (טוקן/ת"ז/ספרות) — מנקה PaymentMethod מכל פלט.
// מטרה: לגלות איך שולפים את מספר התשלומים של הוראת קבע מ-API סאמיט.
Deno.serve(async (req) => {
  const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
  const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
  if (!SUMIT_API_KEY || !SUMIT_COMPANY_ID) {
    return Response.json({ error: 'SUMIT creds missing' }, { status: 500 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== 'probe-2026-09-01') {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const credentials = {
    CompanyID: Number(String(SUMIT_COMPANY_ID).replace(/\D/g, '')),
    APIKey: String(SUMIT_API_KEY).trim()
  };
  async function call(path: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`https://api.sumit.co.il${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Credentials: credentials, ...body })
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch (_) { /* HTML */ }
      return { http: res.status, json, snippet: json ? null : text.slice(0, 140) };
    } catch (e) { return { http: 0, json: null, snippet: `ERR: ${e.message}` }; }
  }
  // מנקה כל נתון אשראי רגיש מכל אובייקט לפני החזרה
  function scrub(o: any): any {
    if (Array.isArray(o)) return o.map(scrub);
    if (o && typeof o === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(o)) {
        if (/creditcard|cvv|track2|token|citizen|directdebit|account|cardmask|lastdigits/i.test(k)) continue;
        out[k] = scrub(v);
      }
      return out;
    }
    return o;
  }

  const DATES = { Date_From: '2024-06-01T00:00:00', Date_To: '2026-12-31T23:59:59' };

  // מאתר תשלומי הוראת-קבע ומנסה לפענח את פריט ההו"ק (מספר מחזורים)
  const payRes = await call('/billing/payments/list/', { ...DATES, Paging: { StartIndex: 0, PageSize: 500 } });
  const payments = payRes.json?.Data?.Payments || [];
  const recurringPays = payments.filter((p: any) => Array.isArray(p.RecurringCustomerItemIDs) && p.RecurringCustomerItemIDs.length);
  const sampleItemId = recurringPays[0]?.RecurringCustomerItemIDs?.[0] || null;
  const sampleCustomerId = recurringPays[0]?.CustomerID || null;

  // נסיונות לאתר את endpoint פריט ההו"ק
  const attempts: Record<string, unknown> = {};
  if (sampleItemId) {
    const itemBodies: Array<[string, Record<string, unknown>]> = [
      ['/billing/customeritems/get/', { ID: sampleItemId }],
      ['/billing/customeritems/getdetails/', { ID: sampleItemId }],
      ['/billing/recurring/get/', { ID: sampleItemId }],
      ['/crm/data/getentity/', { EntityID: sampleItemId }],
      ['/billing/payments/get/', { ID: recurringPays[0]?.ID }],
      ['/billing/payments/getdetails/', { ID: recurringPays[0]?.ID }],
    ];
    for (const [path, body] of itemBodies) {
      const r = await call(path, body);
      attempts[path] = r.json
        ? { http: r.http, status: r.json.Status, err: r.json.UserErrorMessage || null, data: scrub(r.json.Data) }
        : { http: r.http, snippet: r.snippet };
    }
  }
  // גם: getentity על הלקוח, אולי פריטי ההו"ק יושבים על הלקוח
  let customerDump: unknown = null;
  if (sampleCustomerId) {
    const c = await call('/crm/data/getentity/', { EntityID: sampleCustomerId });
    customerDump = c.json ? scrub(c.json.Data) : c.snippet;
  }

  return Response.json({
    totalPayments: payments.length,
    recurringPaymentsCount: recurringPays.length,
    sampleItemId,
    sampleCustomerId,
    sampleRecurringPayment: scrub(recurringPays[0] || null),
    attempts,
    customerDump,
  });
});
