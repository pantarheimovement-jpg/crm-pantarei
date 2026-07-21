import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { queueTemplate, pickCourseNameForTask } from '../../shared/waFollowups.ts';

// =============================================
// קרון יומי (10:00 בבוקר) — שתי בדיקות בהרצה אחת:
//
// 1. week_before (עדיפות ראשונה — מדברת על אירוע שקורה עכשיו):
//    קורסים שמתחילים בעוד 7 ימים בדיוק — תזכורת לכל משימה פתוחה
//    מקושרת. חלה גם על רשומות קיימות: כשירות לפי status_changed_date,
//    ואם ריק — created_date, ובלבד שאינו ישן מ-30 יום.
//
// 2. followup_3days: משימות בסטטוס "לחזור לקראת הרשמה" שעברו
//    auto_followup_days (ברירת מחדל 3) ימים מאז שינוי הסטטוס.
//    ⚠️ ללא backfill: משימות בלי status_changed_date מדולגות
//    (מונע הצפה של 127 הודעות ביום הראשון — החלטת עינת 21.7).
//    חלון תוקף: עד 30 יום מאז שינוי הסטטוס.
//
// 🛡️ הגנת "הודעה אחת לבוקר": לידה שקיבלה week_before בהרצה הזו
//    לא תקבל גם followup_3days באותה הרצה (הדילוג לפי מזהה משתתפת,
//    כדי לכסות גם שתי משימות שונות של אותה לידה) — הפולואפ יֵצא מחר.
//
// כפילויות בין ימים נמנעות ע"י followup_3days_sent_at / week_before_sent_at.
// הגנת הסרה (subscribed=false) נבדקת בתוך queueTemplate.
// =============================================

const TARGET_TASK_STATUS = 'לחזור לקראת הרשמה';
const MAX_AGE_DAYS = 30;
const DAY_MS = 24 * 3600 * 1000;

Deno.serve(async (req) => {
  console.log('=== runDailyFollowups started ===');
  const base44 = createClientFromRequest(req);

  try {
    const [generalArr, tasks, courses] = await Promise.all([
      base44.asServiceRole.entities.GeneralSettings.list().catch(() => []),
      base44.asServiceRole.entities.Task.filter({ status: TARGET_TASK_STATUS }, 'created_date', 500),
      base44.asServiceRole.entities.Course.list('-created_date', 200)
    ]);

    const followupDays = Number(generalArr?.[0]?.auto_followup_days) || 3;

    // טעינת כל המשתתפים בעימוד
    let students = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Student.list('created_date', 500, skip);
      if (!batch || batch.length === 0) break;
      students = students.concat(batch);
      skip += batch.length;
      if (batch.length < 500) break;
    }
    const studentById = new Map(students.map((s) => [s.id, s]));

    console.log(`Loaded: ${tasks.length} tasks in "${TARGET_TASK_STATUS}", ${students.length} students, ${courses.length} courses. followup_days=${followupDays}`);

    const now = Date.now();
    const results = { followup_3days: [], week_before: [] };
    const queuedStudentIds = new Set(); // משתתפות שכבר קיבלו הודעה בהרצה הזו

    // -----------------------------------------
    // 1. week_before — קורסים שמתחילים בעוד 7 ימים בדיוק (לפי תאריך ישראל)
    // -----------------------------------------
    const todayIL = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    const target = new Date(todayIL + 'T00:00:00Z');
    target.setUTCDate(target.getUTCDate() + 7);
    const targetDateStr = target.toISOString().split('T')[0];
    const startingCourses = (courses || []).filter((c) => c.start_date === targetDateStr);
    console.log(`week_before: ${startingCourses.length} courses starting on ${targetDateStr}`);

    for (const course of startingCourses) {
      for (const task of tasks) {
        if (task.week_before_sent_at) continue;
        const student = studentById.get(task.student_id);
        if (!student) continue;
        if (queuedStudentIds.has(student.id)) continue; // כבר קיבלה הודעה בהרצה הזו

        const linked = (student.courses || []).some((e) => e.course_id === course.id) ||
          student.course_id === course.id ||
          (student.interest_area && course.name && student.interest_area.includes(course.name));
        if (!linked) continue;

        // כשירות: status_changed_date, ואם ריק — created_date; עד 30 יום אחורה
        const baseDate = task.status_changed_date || task.created_date;
        if (!baseDate || (now - new Date(baseDate).getTime()) / DAY_MS > MAX_AGE_DAYS) continue;

        const result = await queueTemplate(base44, {
          student,
          templateName: 'week_before',
          params: { '1': student.full_name || '', '2': course.name || '' },
          fallbackText: `היי ${student.full_name || ''}, תזכורת: ${course.name || ''} מתחיל בעוד שבוע`
        });

        if (result.queued) {
          queuedStudentIds.add(student.id);
          await base44.asServiceRole.entities.Task.update(task.id, { week_before_sent_at: new Date().toISOString() });
        }
        results.week_before.push({ task_id: task.id, student: student.full_name, course: course.name, ...result });
      }
    }

    // -----------------------------------------
    // 2. followup_3days
    // -----------------------------------------
    for (const task of tasks) {
      if (!task.status_changed_date) continue; // אין backfill — מדלגים על רשומות היסטוריות
      if (task.followup_3days_sent_at) continue; // כבר נשלח
      const ageDays = (now - new Date(task.status_changed_date).getTime()) / DAY_MS;
      if (ageDays < followupDays || ageDays > MAX_AGE_DAYS) continue;

      const student = studentById.get(task.student_id);
      if (!student) continue;
      if (queuedStudentIds.has(student.id)) {
        // קיבלה week_before הבוקר — הפולואפ יישלח בהרצה של מחר (לא מסמנים sent)
        results.followup_3days.push({ task_id: task.id, student: student.full_name, queued: false, reason: 'deferred_got_week_before_today' });
        continue;
      }

      const courseName = pickCourseNameForTask(task, student, courses);
      if (!courseName) {
        results.followup_3days.push({ task_id: task.id, student: student.full_name, queued: false, reason: 'no_course_name' });
        continue;
      }

      const result = await queueTemplate(base44, {
        student,
        templateName: 'followup_3days',
        params: { '1': student.full_name || '', '2': courseName },
        fallbackText: `היי ${student.full_name || ''}, רצינו לשמוע איפה את עומדת לגבי ${courseName}`
      });

      if (result.queued) {
        queuedStudentIds.add(student.id);
        await base44.asServiceRole.entities.Task.update(task.id, { followup_3days_sent_at: new Date().toISOString() });
      }
      results.followup_3days.push({ task_id: task.id, student: student.full_name, course: courseName, ...result });
    }

    const summary = {
      success: true,
      followup_days: followupDays,
      week_before_target_date: targetDateStr,
      followup_3days_queued: results.followup_3days.filter((r) => r.queued).length,
      week_before_queued: results.week_before.filter((r) => r.queued).length,
      results
    };
    console.log('Done:', JSON.stringify({ f3: summary.followup_3days_queued, wb: summary.week_before_queued }));
    return Response.json(summary);

  } catch (error) {
    console.error('❌ runDailyFollowups error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});