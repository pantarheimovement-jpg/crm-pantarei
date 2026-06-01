import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    let token = url.searchParams.get('token');

    // Also support token in POST body (for testing via SDK)
    if (!token && method === 'POST') {
      try {
        const body = await req.clone().json();
        token = body.token || null;
      } catch { /* not JSON body, try form data */ }
    }

    // Support form POST (from the confirmation page)
    if (!token && method === 'POST') {
      try {
        const formData = await req.clone().formData();
        token = formData.get('token') || null;
      } catch { /* not form data */ }
    }

    if (!token) {
      return new Response(renderPage('לינק לא תקין', 'חסר טוקן בלינק ההסרה.', null), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }

    const reconstructedReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
    });
    const base44 = createClientFromRequest(reconstructedReq);

    const matches = await base44.asServiceRole.entities.Subscribers.filter({ unsubscribe_token: token });
    const subscriber = matches?.[0];

    if (!subscriber) {
      return new Response(renderPage('לינק לא נמצא', 'לא מצאנו מנוי/ה פעיל/ה עם הלינק הזה. ייתכן שכבר הוסרת.', null), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }

    // GET = show confirmation page, POST = actually unsubscribe
    if (method === 'GET') {
      const actionUrl = `https://pantarhei-studio.co.il/functions/unsubscribeHandler`;
      return new Response(renderConfirmPage(subscriber, token, actionUrl), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }

    // POST — perform the unsubscribe
    await base44.asServiceRole.entities.Subscribers.update(subscriber.id, {
      subscribed: false,
    });

    console.log(`Unsubscribed: ${subscriber.email} (token: ${token})`);

    return new Response(
      renderPage(
        'הוסרת מהרשימה בהצלחה ✓',
        `הכתובת <strong>${subscriber.email || subscriber.name || ''}</strong> הוסרה מרשימת התפוצה של פנטהריי.<br>לא תקבל/י יותר דיוורים מאיתנו.<br><br>אם עשית זאת בטעות, שלח/י לנו מייל ל-<a href="mailto:pantarhei.movement@gmail.com" style="color:#6D436D;font-weight:bold;">pantarhei.movement@gmail.com</a> ונחזיר אותך לרשימה.`,
        null
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  } catch (error) {
    console.error('unsubscribe error:', error);
    return new Response(
      renderPage('שגיאה', 'אירעה שגיאה. נסי שוב או שלחי מייל ל-<a href="mailto:pantarhei.movement@gmail.com">pantarhei.movement@gmail.com</a>', null),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }
});

function renderConfirmPage(subscriber, token, actionUrl) {
  const displayName = subscriber.name || subscriber.email || '';
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>הסרה מרשימת התפוצה - פנטהריי</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:40px 20px; background:#FDF8F0; font-family:'Rubik',Arial,sans-serif; color:#5E4B35; text-align:center; }
  .card { max-width:520px; margin:60px auto; background:#fff; border-radius:16px; padding:40px 30px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
  h1 { color:#5E4B35; margin:0 0 16px; font-size:22px; }
  p { font-size:15px; line-height:1.7; margin:0 0 10px; color:#666; }
  .name { font-weight:700; color:#6D436D; }
  .warning { background:#FEF3C7; border:1px solid #FDE68A; border-radius:10px; padding:14px; margin:20px 0; }
  .warning p { color:#92400E; font-size:13px; margin:0; }
  .buttons { display:flex; gap:12px; justify-content:center; margin-top:24px; flex-wrap:wrap; }
  .btn { display:inline-block; padding:12px 28px; border-radius:50px; font-family:'Rubik',sans-serif; font-size:15px; font-weight:600; text-decoration:none; cursor:pointer; border:none; transition:all 0.2s; }
  .btn-danger { background:#DC2626; color:#fff; }
  .btn-danger:hover { background:#B91C1C; }
  .btn-safe { background:#6D436D; color:#fff; }
  .btn-safe:hover { background:#5a365a; }
  .footer { margin-top:30px; font-size:12px; color:#aaa; }
</style>
</head>
<body>
  <div class="card">
    <h1>הסרה מרשימת התפוצה</h1>
    <p>היי${displayName ? ' <span class="name">' + displayName + '</span>' : ''},</p>
    <p>את/ה עומד/ת להסיר את עצמך מרשימת התפוצה של <strong>פנטהריי</strong>.<br>לאחר ההסרה לא תקבל/י יותר עדכונים במייל או בוואטסאפ.</p>
    
    <div class="warning">
      <p>⚠️ שים/י לב — הפעולה הזו תסיר אותך מהרשימה. אם לחצת בטעות — פשוט סגור/י את העמוד.</p>
    </div>

    <div class="buttons">
      <form method="POST" action="${actionUrl}?token=${token}" style="display:inline;">
        <input type="hidden" name="token" value="${token}" />
        <button type="submit" class="btn btn-danger">כן, הסירו אותי</button>
      </form>
      <a href="https://pantarhei-studio.co.il" class="btn btn-safe">לא, חזרה לאתר</a>
    </div>

    <p class="footer">פנטהריי — מרכז למחול ותנועה סומטית</p>
  </div>
</body>
</html>`;
}

function renderPage(title, body) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} - פנטהריי</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:40px 20px; background:#FDF8F0; font-family:'Rubik',Arial,sans-serif; color:#5E4B35; text-align:center; }
  .card { max-width:520px; margin:60px auto; background:#fff; border-radius:16px; padding:40px 30px; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
  h1 { color:#5E4B35; margin:0 0 20px; font-size:22px; }
  p { font-size:15px; line-height:1.7; margin:0 0 10px; }
  a { color:#6D436D; }
  .footer { margin-top:30px; font-size:12px; color:#aaa; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <p class="footer">פנטהריי — מרכז למחול ותנועה סומטית</p>
  </div>
</body>
</html>`;
}