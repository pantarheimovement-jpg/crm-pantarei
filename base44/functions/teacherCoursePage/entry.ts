import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ============================================================
// דף מורה ציבורי — נפתח ע"י כל מי שמחזיק בקישור עם הטוקן,
// ללא התחברות. GET מגיש עמוד HTML מלא (פרטי קורס, רשומים,
// מילוי נוכחות), POST שומר נוכחות. האבטחה: טוקן אקראי ארוך
// (teacher_token) שנשמר על הקורס — בלעדיו אין גישה.
// ============================================================

const REGISTERED_STATUSES = ['נרשם', 'רשום'];
const ATT_STATUSES = ['נוכח/ת', 'נעדר/ת', 'איחור'];

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
    return existing[0].id;
  }
  const created = await base44.asServiceRole.entities.Attendance.create({
    course_id: courseId, student_id: studentId, student_name: studentName || '', date, status
  });
  return created.id;
}

function buildHtml(course, students, records) {
  const data = JSON.stringify({
    courseName: course.name || '',
    schedule: course.schedule || '',
    location: course.location || '',
    startDate: course.start_date || '',
    endDate: course.end_date || '',
    token: course.teacher_token,
    students,
    records: (records || []).map((r) => ({ student_id: r.student_id, date: r.date, status: r.status }))
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>דף מורה — ${String(course.name || '').replace(/</g, '&lt;')}</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&family=Amatic+SC:wght@700&display=swap" rel="stylesheet">
<style>
  body { margin:0; background:#FDF8F0; font-family:'Rubik',Arial,sans-serif; color:#5E4B35; }
  .wrap { max-width:640px; margin:0 auto; padding:16px; }
  .card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.06); padding:20px; margin-bottom:16px; }
  h1 { font-family:'Amatic SC',cursive; color:#6D436D; font-size:38px; margin:0 0 6px; }
  h2 { font-size:18px; margin:0 0 12px; color:#6D436D; }
  .meta { font-size:14px; opacity:.8; line-height:1.7; }
  .row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; background:#F8F5EF; border-radius:10px; margin-bottom:8px; flex-wrap:wrap; }
  .name { font-weight:500; }
  .btns { display:flex; gap:6px; }
  .btn { border:1px solid #ddd; background:#fff; border-radius:50px; padding:6px 12px; font-size:12px; font-family:inherit; cursor:pointer; }
  .btn:disabled { opacity:.5; }
  .btn.p.on { background:#297058; color:#fff; border-color:#297058; }
  .btn.a.on { background:#D9534F; color:#fff; border-color:#D9534F; }
  .btn.l.on { background:#E6B800; color:#fff; border-color:#E6B800; }
  .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
  input[type=date] { padding:8px 10px; border:1px solid #ddd; border-radius:10px; font-family:inherit; font-size:14px; }
  .primary { background:#6D436D; color:#fff; border:none; border-radius:50px; padding:9px 18px; font-size:14px; cursor:pointer; font-family:inherit; }
  .ghost { background:#fff; color:#297058; border:1px solid #297058; border-radius:50px; padding:9px 18px; font-size:14px; cursor:pointer; font-family:inherit; }
  .hist { font-size:13px; }
  .hist button { display:flex; justify-content:space-between; width:100%; padding:8px 10px; background:#fff; border:none; border-bottom:1px solid #f0ece4; cursor:pointer; font-family:inherit; font-size:13px; color:#5E4B35; }
  .hist button:hover { background:#F8F5EF; }
  .ok { color:#297058; font-size:13px; height:16px; }
  .empty { text-align:center; opacity:.6; padding:20px 0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <h1 id="cname"></h1>
    <div class="meta" id="cmeta"></div>
  </div>
  <div class="card">
    <h2>✅ מילוי נוכחות</h2>
    <div class="toolbar">
      <input type="date" id="date">
      <button class="ghost" id="allBtn">סמן כולם נוכחים</button>
      <span class="ok" id="msg"></span>
    </div>
    <div id="list"></div>
  </div>
  <div class="card">
    <h2>📅 היסטוריית מפגשים</h2>
    <div class="hist" id="hist"><div class="empty">אין עדיין מפגשים שמולאו</div></div>
  </div>
</div>
<script>
var D = ${data};
var records = {};
D.records.forEach(function(r){ records[r.student_id + '|' + r.date] = r.status; });
var STATUSES = ['נוכח/ת','נעדר/ת','איחור'];
var CLS = { 'נוכח/ת':'p', 'נעדר/ת':'a', 'איחור':'l' };
var saving = false;

document.getElementById('cname').textContent = D.courseName;
var meta = [];
if (D.schedule) meta.push('🗓️ ' + D.schedule);
if (D.location) meta.push('📍 ' + D.location);
if (D.startDate) meta.push('התחלה: ' + fmt(D.startDate) + (D.endDate ? ' • סיום: ' + fmt(D.endDate) : ''));
meta.push('👥 ' + D.students.length + ' משתתפים רשומים');
document.getElementById('cmeta').innerHTML = meta.join('<br>');

var dateEl = document.getElementById('date');
dateEl.value = new Date().toISOString().split('T')[0];
dateEl.addEventListener('change', render);
document.getElementById('allBtn').addEventListener('click', markAll);

function fmt(d){ try { return new Date(d).toLocaleDateString('he-IL'); } catch(e){ return d; } }
function flash(t){ var m = document.getElementById('msg'); m.textContent = t; setTimeout(function(){ m.textContent=''; }, 2000); }

function post(body, onOk){
  saving = true; render();
  body.token = D.token;
  fetch(location.pathname, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    .then(function(r){ return r.json(); })
    .then(function(j){
      saving = false;
      if (j && j.ok) { onOk(); flash('✓ נשמר'); } else { flash('שגיאה בשמירה'); }
      render();
    })
    .catch(function(){ saving = false; flash('שגיאה בשמירה'); render(); });
}

function setStatus(sid, sname, status){
  post({ action:'set_status', student_id:sid, student_name:sname, date:dateEl.value, status:status }, function(){
    records[sid + '|' + dateEl.value] = status;
  });
}

function markAll(){
  post({ action:'mark_all', date:dateEl.value }, function(){
    D.students.forEach(function(s){ records[s.id + '|' + dateEl.value] = 'נוכח/ת'; });
  });
}

function render(){
  var list = document.getElementById('list');
  list.innerHTML = '';
  if (!D.students.length) { list.innerHTML = '<div class="empty">אין משתתפים רשומים לקורס זה</div>'; }
  D.students.forEach(function(s){
    var cur = records[s.id + '|' + dateEl.value] || null;
    var row = document.createElement('div'); row.className = 'row';
    var nm = document.createElement('span'); nm.className = 'name'; nm.textContent = s.name; row.appendChild(nm);
    var btns = document.createElement('div'); btns.className = 'btns';
    STATUSES.forEach(function(st){
      var b = document.createElement('button');
      b.className = 'btn ' + CLS[st] + (cur === st ? ' on' : '');
      b.textContent = st;
      b.disabled = saving;
      b.addEventListener('click', function(){ setStatus(s.id, s.name, st); });
      btns.appendChild(b);
    });
    row.appendChild(btns);
    list.appendChild(row);
  });
  document.getElementById('allBtn').disabled = saving || !D.students.length;
  renderHist();
}

function renderHist(){
  var byDate = {};
  Object.keys(records).forEach(function(k){
    var parts = k.split('|'); var d = parts[1]; var st = records[k];
    if (!byDate[d]) byDate[d] = { p:0, a:0, l:0 };
    if (st === 'נוכח/ת') byDate[d].p++; else if (st === 'נעדר/ת') byDate[d].a++; else if (st === 'איחור') byDate[d].l++;
  });
  var dates = Object.keys(byDate).sort().reverse();
  var el = document.getElementById('hist');
  if (!dates.length) { el.innerHTML = '<div class="empty">אין עדיין מפגשים שמולאו</div>'; return; }
  el.innerHTML = '';
  dates.forEach(function(d){
    var i = byDate[d];
    var b = document.createElement('button');
    var right = document.createElement('span'); right.textContent = new Date(d).toLocaleDateString('he-IL', { weekday:'long', day:'numeric', month:'long' });
    var left = document.createElement('span'); left.textContent = '✅ ' + i.p + '  ❌ ' + i.a + '  ⏰ ' + i.l;
    b.appendChild(right); b.appendChild(left);
    b.addEventListener('click', function(){ dateEl.value = d; render(); });
    el.appendChild(b);
  });
}

render();
</script>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // POST — שמירת נוכחות (מאומת בטוקן בלבד — הדף ציבורי בכוונה)
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const course = await findCourseByToken(base44, body.token);
      if (!course) return Response.json({ ok: false, error: 'Invalid token' }, { status: 403 });
      const date = String(body.date || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ ok: false, error: 'Invalid date' }, { status: 400 });

      if (body.action === 'set_status') {
        if (!ATT_STATUSES.includes(body.status)) return Response.json({ ok: false, error: 'Invalid status' }, { status: 400 });
        // מוודאים שהמשתתף אכן רשום לקורס הזה
        const students = await loadRegisteredStudents(base44, course.id);
        const student = students.find((s) => s.id === body.student_id);
        if (!student) return Response.json({ ok: false, error: 'Student not in course' }, { status: 400 });
        await upsertAttendance(base44, course.id, student.id, student.name, date, body.status);
        return Response.json({ ok: true });
      }

      if (body.action === 'mark_all') {
        const students = await loadRegisteredStudents(base44, course.id);
        for (const s of students) {
          await upsertAttendance(base44, course.id, s.id, s.name, date, 'נוכח/ת');
        }
        return Response.json({ ok: true, count: students.length });
      }

      return Response.json({ ok: false, error: 'Unknown action' }, { status: 400 });
    }

    // GET — הגשת הדף
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const course = await findCourseByToken(base44, token);
    if (!course) {
      return new Response('<html dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:60px;background:#FDF8F0;color:#5E4B35"><h2>הקישור אינו תקין או שפג תוקפו</h2><p>פני לסטודיו פנטהריי לקבלת קישור מעודכן.</p></body></html>', {
        status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const students = await loadRegisteredStudents(base44, course.id);
    const records = await base44.asServiceRole.entities.Attendance.filter({ course_id: course.id }, '-date', 2000);
    const html = buildHtml(course, students, records);
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    console.error('teacherCoursePage error:', error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});