import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    let token = url.searchParams.get('token');
    
    // Also support token in POST body (for testing via SDK)
    if (!token) {
      try {
        const body = await req.clone().json();
        token = body.token || null;
      } catch { /* not JSON body, ignore */ }
    }

    if (!token) {
      return new Response(renderPage('לינק לא תקין', 'חסר טוקן בלינק ההסרה.'), {
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
      return new Response(renderPage('לינק לא נמצא', 'לא מצאנו מנוי פעיל עם הלינק הזה. ייתכן שכבר הוסרת.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }

    await base44.asServiceRole.entities.Subscribers.update(subscriber.id, {
      subscribed: false,
    });

    console.log(`Unsubscribed: ${subscriber.email} (token: ${token})`);

    return new Response(
      renderPage(
        'הוסרת מהרשימה בהצלחה',
        `הכתובת ${subscriber.email} הוסרה מרשימת התפוצה של פנטהריי. לא תקבל/י יותר דיוורים מאיתנו.<br><br>אם עשית זאת בטעות, שלח/י לנו מייל ל-<a href="mailto:pantarhei.movement@gmail.com">pantarhei.movement@gmail.com</a> ונחזיר אותך לרשימה.`
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  } catch (error) {
    console.error('unsubscribe error:', error);
    return new Response(
      renderPage('שגיאה', 'אירעה שגיאה. נסה שוב או שלח מייל ל-<a href="mailto:pantarhei.movement@gmail.com">pantarhei.movement@gmail.com</a>'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }
});

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
  .card { max-width:520px; margin:60px auto; background:#fff; border-radius:12px; padding:40px 30px; box-shadow:0 4px 12px rgba(0,0,0,0.08); }
  h1 { color:#5E4B35; margin:0 0 20px; font-size:24px; }
  p { font-size:16px; line-height:1.7; margin:0 0 10px; }
  a { color:#6D436D; }
  .footer { margin-top:30px; font-size:13px; color:#888; }
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