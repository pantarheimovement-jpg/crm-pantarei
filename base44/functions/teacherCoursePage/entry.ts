import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ============================================================
// דף מורה ציבורי — נפתח ע"י כל מי שמחזיק בקישור עם הטוקן,
// ללא התחברות. חשוב: הפלטפורמה חוסמת JavaScript בדפים המוגשים
// מפונקציות (CSP script-src 'none'), לכן הדף בנוי כולו על
// טפסי HTML רגילים — כל לחיצה היא POST + רענון של הדף.
// ============================================================

const REGISTERED_STATUSES = ['נרשם', 'רשום'];
const ATT_STATUSES = ['נוכח/ת', 'נעדר/ת', 'איחור'];
const STATUS_ICON = { 'נוכח/ת': '✅', 'נעדר/ת': '❌', 'איחור': '⏰' };
const STATUS_CLS = { 'נוכח/ת': 'p', 'נעדר/ת': 'a', 'איחור': 'l' };

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function todayIsrael() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

function fmtHe(dateStr, withWeekday = false) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('he-IL', withWeekday ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : undefined);
  } catch (_e) { return dateStr; }
}

async function findCourseByToken(base44, token) {
  if (!token || String(token).length < 20) return null;
  const rows = await base44.asServiceRole.entities.Course.filter({ teacher_token: token });
  return rows && rows.length > 0 ? rows[0] : null;
}

async function loadRegisteredStudents(base44, courseId) {
  let all = [];
  let skip = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.Student.list('-created_date', 500, skip);
    if (!batch || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < 500) break;
    skip += batch.length;
  }
  const registered = [];
  for (const s of all) {
    let status = null;
    if (s.courses && Array.isArray(s.courses)) {
      const entry = s.courses.find((c) => c.course_id === courseId);
      if (entry) status = entry.status;
    } else if (s.course_id === courseId) {
      status = s.status;
    }
    if (status && REGISTERED_STATUSES.includes(status)) {
      registered.push({ id: s.id, name: s.full_name });
    }
  }
  registered.sort((a, b) => String(a.name).localeCompare(String(b.name), 'he'));
  return registered;
}

async function upsertAttendance(base44, courseId, studentId, studentName, date, status) {
  const existing = await base44.asServiceRole.entities.Attendance.filter({ course_id: courseId, student_id: studentId, date });
  if (existing && existing.length > 0) {
    await base44.asServiceRole.entities.Attendance.update(existing[0].id, { status });
  } else {
    await base44.asServiceRole.entities.Attendance.create({
      course_id: courseId, student_id: studentId, student_name: studentName || '', date, status
    });
  }
}

function buildHtml(course, students, records, selectedDate, saved) {
  const token = course.teacher_token;
  const statusByStudent = {};
  const byDate = {};
  for (const r of records || []) {
    if (r.date === selectedDate) statusByStudent[r.student_id] = r.status;
    if (!byDate[r.date]) byDate[r.date] = { p: 0, a: 0, l: 0 };
    if (r.status === 'נוכח/ת') byDate[r.date].p++;
    else if (r.status === 'נעדר/ת') byDate[r.date].a++;
    else if (r.status === 'איחור') byDate[r.date].l++;
  }
  const histDates = Object.keys(byDate).sort().reverse();

  const meta = [];
  if (course.schedule) meta.push('🗓️ ' + esc(course.schedule));
  if (course.location) meta.push('📍 ' + esc(course.location));
  if (course.start_date) meta.push('התחלה: ' + fmtHe(course.start_date) + (course.end_date ? ' • סיום: ' + fmtHe(course.end_date) : ''));
  meta.push('👥 ' + students.length + ' משתתפים רשומים');

  const rowsHtml = students.length === 0
    ? '<div class="empty">אין משתתפים רשומים לקורס זה</div>'
    : students.map((s) => {
        const cur = statusByStudent[s.id] || null;
        const btns = ATT_STATUSES.map((st) =>
          `<button type="submit" name="status" value="${esc(st)}" class="btn ${STATUS_CLS[st]}${cur === st ? ' on' : ''}">${esc(st)}</button>`
        ).join('');
        return `<form method="POST" class="row">
          <input type="hidden" name="token" value="${esc(token)}">
          <input type="hidden" name="action" value="set_status">
          <input type="hidden" name="date" value="${esc(selectedDate)}">
          <input type="hidden" name="student_id" value="${esc(s.id)}">
          <span class="name">${esc(s.name)}</span>
          <span class="btns">${btns}</span>
        </form>`;
      }).join('');

  const histHtml = histDates.length === 0
    ? '<div class="empty">אין עדיין מפגשים שמולאו</div>'
    : histDates.map((d) => {
        const i = byDate[d];
        return `<a href="?token=${esc(token)}&date=${esc(d)}" class="histrow${d === selectedDate ? ' cur' : ''}">
          <span>${fmtHe(d, true)}</span>
          <span>✅ ${i.p}&nbsp;&nbsp;❌ ${i.a}&nbsp;&nbsp;⏰ ${i.l}</span>
        </a>`;
      }).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>דף מורה — ${esc(course.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&family=Amatic+SC:wght@700&display=swap" rel="stylesheet">
<style>
  body { margin:0; background:#FDF8F0; font-family:'Rubik',Arial,sans-serif; color:#5E4B35; }
  .wrap { max-width:640px; margin:0 auto; padding:16px; }
  .card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.06); padding:20px; margin-bottom:16px; }
  h1 { font-family:'Amatic SC',cursive; color:#6D436D; font-size:38px; margin:0 0 6px; }
  h2 { font-size:18px; margin:0 0 12px; color:#6D436D; }
  .meta { font-size:14px; opacity:.8; line-height:1.7; }
  .row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; background:#F8F5EF; border-radius:10px; margin:0 0 8px; flex-wrap:wrap; }
  .name { font-weight:500; }
  .btns { display:flex; gap:6px; }
  .btn { border:1px solid #ddd; background:#fff; border-radius:50px; padding:6px 12px; font-size:12px; font-family:inherit; cursor:pointer; color:#5E4B35; }
  .btn.p.on { background:#297058; color:#fff; border-color:#297058; }
  .btn.a.on { background:#D9534F; color:#fff; border-color:#D9534F; }
  .btn.l.on { background:#E6B800; color:#fff; border-color:#E6B800; }
  .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
  input[type=date] { padding:8px 10px; border:1px solid #ddd; border-radius:10px; font-family:inherit; font-size:14px; background:#fff; }
  .primary { background:#6D436D; color:#fff; border:none; border-radius:50px; padding:9px 18px; font-size:14px; cursor:pointer; font-family:inherit; }
  .ghost { background:#fff; color:#297058; border:1px solid #297058; border-radius:50px; padding:9px 18px; font-size:14px; cursor:pointer; font-family:inherit; }
  .saved { background:#E8F5EE; color:#297058; border-radius:10px; padding:8px 14px; font-size:14px; margin-bottom:12px; }
  .datebar { font-size:14px; margin-bottom:12px; opacity:.85; }
  .histrow { display:flex; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #f0ece4; text-decoration:none; color:#5E4B35; font-size:13px; }
  .histrow:hover { background:#F8F5EF; }
  .histrow.cur { background:#F3EDF3; border-radius:8px; }
  .empty { text-align:center; opacity:.6; padding:20px 0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <h1>${esc(course.name)}</h1>
    <div class="meta">${meta.join('<br>')}</div>
  </div>

  <div class="card">
    <h2>✅ מילוי נוכחות</h2>
    ${saved ? '<div class="saved">✓ הנוכחות נשמרה</div>' : ''}
    <form method="GET" class="toolbar">
      <input type="hidden" name="token" value="${esc(token)}">
      <input type="date" name="date" value="${esc(selectedDate)}">
      <button type="submit" class="primary">הצגת תאריך</button>
    </form>
    <div class="datebar">מפגש בתאריך: <b>${fmtHe(selectedDate, true)}</b></div>
    ${students.length > 0 ? `<form method="POST" style="margin-bottom:12px;">
      <input type="hidden" name="token" value="${esc(token)}">
      <input type="hidden" name="action" value="mark_all">
      <input type="hidden" name="date" value="${esc(selectedDate)}">
      <button type="submit" class="ghost">סמן את כולם כנוכחים ✅</button>
    </form>` : ''}
    ${rowsHtml}
  </div>

  <div class="card">
    <h2>📅 היסטוריית מפגשים</h2>
    ${histHtml}
  </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);

    // POST — שמירת נוכחות מטופס HTML, ואז הפניה חזרה לדף (Post/Redirect/Get)
    if (req.method === 'POST') {
      const form = await req.formData();
      const token = form.get('token');
      const course = await findCourseByToken(base44, token);
      if (!course) return new Response('Invalid token', { status: 403 });

      const date = String(form.get('date') || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response('Invalid date', { status: 400 });
      const action = form.get('action');
      const students = await loadRegisteredStudents(base44, course.id);

      if (action === 'set_status') {
        const status = String(form.get('status') || '');
        if (!ATT_STATUSES.includes(status)) return new Response('Invalid status', { status: 400 });
        const student = students.find((s) => s.id === form.get('student_id'));
        if (!student) return new Response('Student not in course', { status: 400 });
        await upsertAttendance(base44, course.id, student.id, student.name, date, status);
      } else if (action === 'mark_all') {
        for (const s of students) {
          await upsertAttendance(base44, course.id, s.id, s.name, date, 'נוכח/ת');
        }
      } else {
        return new Response('Unknown action', { status: 400 });
      }

      const back = `https://crm-pantarei-4738bca7.base44.app/functions/teacherCoursePage?token=${encodeURIComponent(String(token))}&date=${date}&saved=1`;
      return new Response(null, { status: 303, headers: { 'Location': back } });
    }

    // GET — הגשת הדף
    const token = url.searchParams.get('token');
    const course = await findCourseByToken(base44, token);
    if (!course) {
      return new Response('<html dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:60px;background:#FDF8F0;color:#5E4B35"><h2>הקישור אינו תקין או שפג תוקפו</h2><p>פני לסטודיו פנטהריי לקבלת קישור מעודכן.</p></body></html>', {
        status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    let selectedDate = url.searchParams.get('date') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) selectedDate = todayIsrael();
    const saved = url.searchParams.get('saved') === '1';

    const students = await loadRegisteredStudents(base44, course.id);
    const records = await base44.asServiceRole.entities.Attendance.filter({ course_id: course.id }, '-date', 2000);
    const html = buildHtml(course, students, records, selectedDate, saved);
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    console.error('teacherCoursePage error:', error.message);
    return new Response('Server error: ' + error.message, { status: 500 });
  }
});