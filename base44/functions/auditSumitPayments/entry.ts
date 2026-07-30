// ביקורת חד-פעמית (קריאה בלבד): שליפת כל מסמכי ההכנסות מסאמיט דרך ה-API,
// כולל אמצעי התשלום, כדי להצליב מול ה-CRM ולמצוא קבלות שלא נקלטו.
// לא כותב שום דבר — לא לסאמיט ולא ל-CRM.
Deno.serve(async (req) => {
  const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
  const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
  if (!SUMIT_API_KEY || !SUMIT_COMPANY_ID) {
    return Response.json({ error: 'SUMIT_API_KEY / SUMIT_COMPANY_ID missing' }, { status: 500 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== 'audit-2026-07-29') {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const credentials = {
    CompanyID: Number(String(SUMIT_COMPANY_ID).replace(/\D/g, '')),
    APIKey: String(SUMIT_API_KEY).trim()
  };

  async function call(path, body) {
    const res = await fetch(`https://api.sumit.co.il${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Credentials: credentials, ...body })
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { /* HTML error page */ }
    return { http: res.status, json, snippet: json ? null : text.slice(0, 200) };
  }

  // מצב גישוש: לגלות איך העימוד באמת עובד בנקודת הקצה
  if (url.searchParams.get('probe') === '1') {
    const variants = [
      ['PageNumber', { PageSize: 5, PageNumber: 2 }],
      ['Page', { PageSize: 5, Page: 2 }],
      ['Paging', { Paging: { PageSize: 5, PageNumber: 2 } }],
      ['Skip', { Take: 5, Skip: 5 }],
      ['baseline', { PageSize: 5 }]
    ];
    const results = {};
    for (const [name, body] of variants) {
      const r = await call('/accounting/documents/list/', body);
      const arr = r.json?.Data?.Documents || [];
      results[name] = {
        status: r.json?.Status ?? r.http,
        n: arr.length,
        firstNum: arr[0]?.DocumentNumber,
        firstType: arr[0]?.Type,
        nums: arr.map((d) => `${d.Type}/${d.DocumentNumber}`),
        hasNext: r.json?.Data?.HasNextPage
      };
    }
    return Response.json(results);
  }

  // מצב שליפה: לרוץ על כל העמודים ולהחזיר את המסמכים בצורה שטוחה
  // פרטי מסמכים בטווח מספרים — כולל אמצעי התשלום של כל מסמך
  // ?details=40200-40260&type=1  (טווח קטן בכל קריאה, בגלל מגבלת זמן הריצה)
  const detailsRange = url.searchParams.get('details');
  if (detailsRange) {
    const docType = Number(url.searchParams.get('type') || 1);
    const [from, to] = detailsRange.split('-').map(Number);
    const out = [];
    for (let num = from; num <= to; num++) {
      const r = await call('/accounting/documents/getdetails/', { DocumentNumber: num, DocumentType: docType });
      const d = r.json?.Data;
      if (!d) { out.push({ num, missing: true, err: r.json?.UserErrorMessage || null }); continue; }
      out.push({
        num,
        date: d.Document?.Date?.slice(0, 10) || null,
        customer: d.Document?.Customer?.Name || null,
        email: d.Document?.Customer?.EmailAddress || null,
        phone: d.Document?.Customer?.Phone || null,
        total: d.Document?.TotalPrice ?? null,
        items: (d.Items || []).map((it) => ({ name: it.Item?.Name || it.Description || null, total: it.TotalPrice ?? null })),
        payments: (d.Payments || []).map((p) => ({ type: p.Type ?? null, amount: p.Amount ?? null }))
      });
    }
    return Response.json({ count: out.length, docs: out });
  }

  // רשימת כל המסמכים לפי סוג, עם עימוד אמיתי (StartIndex/PageSize)
  const docTypes = (url.searchParams.get('types') || '1,6').split(',').map(Number);
  const docs = [];
  let lastMeta = null;
  for (const t of docTypes) {
    let start = 0;
    while (start < 5000) {
      const r = await call('/accounting/documents/list/', { DocumentTypes: [t], Paging: { StartIndex: start, PageSize: 1000 } });
      if (!r.json || r.json.Status !== 0) {
        lastMeta = { type: t, http: r.http, status: r.json?.Status, err: r.json?.UserErrorMessage || r.snippet };
        break;
      }
      const data = r.json.Data || {};
      const arr = data.Documents || [];
      for (const d of arr) docs.push(d);
      if (!data.HasNextPage || !arr.length) break;
      start += arr.length;
    }
  }

  return Response.json({ count: docs.length, lastMeta, documents: docs });
});
