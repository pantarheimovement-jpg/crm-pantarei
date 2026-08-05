import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isIntroDayCourse, programForIntroDay, INTRO_REGISTERED_STATUSES } from '../../shared/introDayPrograms.ts';

// convertIntroDayLeads — כל מי שרשומה ליום היכרות היא ליד לתוכנית שהיום הזה
// מקדם. הפונקציה משלימה את העבר וגם רצה קדימה (אוטומציה יומית).
//
// שני כללי בטיחות מוחלטים:
//   1. שורת הליד נוצרת *בלי כסף* — אין paid_so_far, אין installment_amount,
//      ואין נגיעה ב-amount_paid. "נגבה בפועל" חייב להישאר זהה.
//   2. בלי כפילויות — אם כבר יש שורה לתוכנית (בכל סטטוס), לא נוצרת שנייה.
//      is_customer לא משתנה: ליד לתוכנית אינו הרשמה אליה.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = null;
    try { body = await req.json(); } catch (_e) { /* אוטומציה שולחת גוף ריק */ }
    const dryRun = body?.dry_run === true;

    // ריצה מאוטומציה אין לה משתמש; ריצה מהמסך חייבת להיות של אדמין
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const courses = await base44.asServiceRole.entities.Course.list('-created_date', 500);
    const introDays = (courses || []).filter(isIntroDayCourse);
    const targets = new Map();
    for (const c of introDays) {
      const program = programForIntroDay(c);
      if (program) targets.set(c.id, program);
    }
    if (targets.size === 0) {
      return Response.json({ status: 'ok', created: 0, note: 'no intro-day courses mapped' });
    }

    let students = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Student.list('-created_date', 500, skip);
      if (!batch || batch.length === 0) break;
      students = students.concat(batch);
      if (batch.length < 500) break;
      skip += batch.length;
    }

    const created = [];
    const skipped = [];

    for (const s of students) {
      const rows = s.courses || [];
      const additions = [];
      for (const row of rows) {
        const program = targets.get(row.course_id);
        if (!program) continue;
        if (!INTRO_REGISTERED_STATUSES.includes(row.status)) continue;

        const alreadyHas = rows.some((r) => r.course_id === program.program_id) ||
          additions.some((a) => a.course_id === program.program_id);
        if (alreadyHas) { skipped.push({ name: s.full_name, program: program.program_name }); continue; }

        additions.push({
          course_id: program.program_id,
          course_name: program.program_name,
          status: 'ליד חדש',
          registration_date: row.registration_date || new Date().toISOString().slice(0, 10)
        });
      }

      if (additions.length > 0) {
        if (!dryRun) {
          await base44.asServiceRole.entities.Student.update(s.id, { courses: [...rows, ...additions] });
        }
        created.push({ name: s.full_name, programs: additions.map((a) => a.course_name) });
      }
    }

    return Response.json({
      status: 'ok',
      dry_run: dryRun,
      intro_days_mapped: targets.size,
      created_count: created.length,
      created,
      skipped_existing: skipped.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}