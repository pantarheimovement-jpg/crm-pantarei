// PROBE — קריאה בלבד. לא כותב שום דבר, לא לסאמיט ולא ל-CRM.
// מטרה: לגלות איזה endpoint ב-API של סאמיט מחזיר את מספר התשלומים של הוראת קבע.
// שימוש:
//   ?key=probe-2026-09-01&mode=endpoints        → מנסה רשימת endpoints מועמדים ומחזיר סטטוס+מפתחות עליונים
//   ?key=probe-2026-09-01&mode=customer         → שופך getentity גולמי מלא של כמה לקוחות (לחיפוש שדות הוראת קבע)
//   ?key=probe-2026-09-01&mode=payments&body=.. → מנסה endpoint ספציפי עם body מותאם
Deno.serve(async (req) => {
  const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
  const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
  if (!SUMIT_API_KEY || !SUMIT_COMPANY_ID) {
    return Response.json({ error: 'SUMIT_API_KEY / SUMIT_COMPANY_ID missing' }, { status: 500 });
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
      try { json = JSON.parse(text); } catch (_) { /* HTML error page */ }
      return { http: res.status, json, snippet: json ? null : text.slice(0, 160) };
    } catch (e) {
      return { http: 0, json: null, snippet: `FETCH_ERR: ${e.message}` };
    }
  }

  const mode = url.searchParams.get('mode') || 'endpoints';

  // --- מצב 1: לסרוק endpoints מועמדים להוראות קבע ---
  if (mode === 'endpoints') {
    const candidates: Array<[string, Record<string, unknown>]> = [
      ['/billing/payments/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/billing/payments/getall/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/billing/recurring/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/billing/recurringcharges/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/billing/recurringpayments/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/billing/payments/listrecurring/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/billing/standingorders/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/payments/recurring/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/payments/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/crm/recurring/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
      ['/accounting/recurring/list/', { Paging: { StartIndex: 0, PageSize: 5 } }],
    ];
    const results: Record<string, unknown> = {};
    for (const [path, body] of candidates) {
      const r = await call(path, body);
      const topKeys = r.json ? Object.keys(r.json) : null;
      const dataKeys = r.json?.Data && typeof r.json.Data === 'object' ? Object.keys(r.json.Data) : null;
      results[path] = {
        http: r.http,
        status: r.json?.Status ?? null,
        err: r.json?.UserErrorMessage || r.json?.TechnicalErrorDetails || r.snippet || null,
        topKeys,
        dataKeys,
      };
    }
    return Response.json({ mode, companyId: credentials.CompanyID, results });
  }

  // --- מצב 2: שפיכת getentity גולמי מלא של כמה לקוחות (לחיפוש שדות הוראת קבע/מספר תשלומים) ---
  if (mode === 'customer') {
    const FOLDER_ID = 332551083;
    const listRes = await call('/crm/data/listentities/', { Folder: FOLDER_ID, PageSize: 5, PageNumber: 1 });
    const entities = listRes.json?.Data?.Entities || [];
    const dumps: unknown[] = [];
    for (const ent of entities.slice(0, 3)) {
      const detail = await call('/crm/data/getentity/', { Folder: FOLDER_ID, EntityID: ent.ID });
      dumps.push({ id: ent.ID, raw: detail.json?.Data ?? detail });
    }
    return Response.json({ mode, listTopKeys: listRes.json ? Object.keys(listRes.json) : null, dumps });
  }

  // --- מצב 3: לנסות endpoint ספציפי עם body חופשי ---
  if (mode === 'payments') {
    const path = url.searchParams.get('path') || '/billing/payments/list/';
    let body: Record<string, unknown> = { Paging: { StartIndex: 0, PageSize: 5 } };
    const bodyParam = url.searchParams.get('body');
    if (bodyParam) { try { body = JSON.parse(bodyParam); } catch (_) { /* keep default */ } }
    const r = await call(path, body);
    return Response.json({ mode, path, body, http: r.http, json: r.json, snippet: r.snippet });
  }

  return Response.json({ error: 'unknown mode' }, { status: 400 });
});
