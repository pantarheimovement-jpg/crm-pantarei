import { base44 } from '@/api/base44Client';

const REGISTERED = new Set(['רשום', 'נרשם', 'רשומה ליום היכרות']);

// משייך סכום שנגבה בפועל לקורס מסוים.
// ⚠️ לא נוגע ב-amount_paid — "נגבה בפועל" חייב להישאר זהה. משנה ייחוס בלבד.
export async function assignPendingPayment({ studentId, courseId, courseName, amount }) {
  const student = await base44.entities.Student.get(studentId);
  const courses = [...(student.courses || [])];
  const idx = courses.findIndex(c => c.course_id === courseId);
  let becameRegistered = false;

  if (idx >= 0) {
    const row = courses[idx];
    if (!REGISTERED.has(row.status)) becameRegistered = true;
    courses[idx] = {
      ...row,
      status: REGISTERED.has(row.status) ? row.status : 'רשום',
      paid_so_far: (parseFloat(row.paid_so_far) || 0) + amount,
      paid_source: 'ידני',
      registration_date: row.registration_date || new Date().toISOString().slice(0, 10)
    };
  } else {
    becameRegistered = true;
    courses.push({
      course_id: courseId,
      course_name: courseName,
      status: 'רשום',
      paid_so_far: amount,
      paid_source: 'ידני',
      registration_date: new Date().toISOString().slice(0, 10)
    });
  }

  const payload = { courses, is_customer: true };
  if (!student.course_id) {
    payload.course_id = courseId;
    payload.course_name = courseName;
  }
  if (!REGISTERED.has(student.status)) payload.status = 'רשום';

  await base44.entities.Student.update(studentId, payload);

  if (becameRegistered) {
    const course = await base44.entities.Course.get(courseId);
    await base44.entities.Course.update(courseId, {
      current_students: (course.current_students || 0) + 1
    });
  }

  return { ...student, ...payload };
}