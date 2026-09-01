// PROBE — קריאה בלבד. שופך פרטי מסמך מלאים (getdetails) כדי לראות אם מספר התשלומים שם.
// מנקה שדות אשראי רגישים (טוקן/ת"ז/ספרות) אך שומר שדות כמו Count/Payments/Duration.
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
    return { http: res.status, json: j, snippet: j ? null : t.slice(0, 120) };
  }
  function scrub(o: any): any {
    if (Array.isArray(o)) return o.map(scrub);
    if (o && typeof o === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(o)) {
        if (/token|cvv|track2|citizen|cardmask|lastdigits|number$|_number/i.test(k)) continue;
        out[k] = scrub(v);
      }
      return out;
    }
    return o;
  }
  const docsParam = url.searchParams.get('docs') || '40418,40414,40415';
  const docNums = docsParam.split(',').map(Number);
  const out: unknown[] = [];
  for (const num of docNums) {
    let d = null; let usedType = null;
    for (const t of [1, 6, 3, 2]) {
      const r = await call('/accounting/documents/getdetails/', { DocumentNumber: num, DocumentType: t });
      if (r.json?.Data) { d = r.json.Data; usedType = t; break; }
    }
    if (!d) { out.push({ num, missing: true }); continue; }
    out.push({
      num, usedType,
      customer: d.Document?.Customer?.Name || null,
      date: d.Document?.Date?.slice(0, 10) || null,
      total: d.Document?.TotalPrice ?? null,
      documentKeys: d.Document ? Object.keys(d.Document) : null,
      payments: scrub(d.Payments || []),   // ← המבנה המלא של אמצעי התשלום (מחפשים מספר תשלומים)
      items: (d.Items || []).map((it: any) => ({ name: it.Item?.Name || it.Description, total: it.TotalPrice, qty: it.Quantity })),
    });
  }
  return Response.json({ docs: out });
});
