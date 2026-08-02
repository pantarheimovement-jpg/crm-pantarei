import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// =====================================================
// assignSumitProduct
// שיוך מוצר מתיבת הנכנסות (SumitProductMap, status="ממתין לשיוך") לקורס/אפשרות,
// כולל תיקון רטרואקטיבי של תשלומים שכבר נקלטו מאותו מוצר ונרשמו כ"ממתין לשיוך"
// בהערות המשתתפות. mode="preview" מחשב בלי לכתוב, mode="apply" כותב בפועל.
// =====================================================

const PENDING_MARK = '⏸️ ממתין לשיוך לקורס';

function findPendingAmountsForProduct(notes, productName) {
  if (!notes || !productName) return 0;
  let sum = 0;
  for (const line of notes.split('\n')) {
    if (!line.includes(PENDING_MARK)) continue;
    if (!line.includes(`מוצר: ${productName}`)) continue;
    const m = line.match(/\(₪(-?[\d.]+)\)/);
    if (m) sum += parseFloat(m[1]) || 0;
  }
  return sum;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized — admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { mapId, mode, courseId, optionId, newOption, kind } = body || {};

    if (!mapId) return Response.json({ error: 'mapId is required' }, { status: 400 });
    if (!kind) return Response.json({ error: 'kind is required' }, { status: 400 });
    if (mode !== 'preview' && mode !== 'apply') {
      return Response.json({ error: 'mode must be "preview" or "apply"' }, { status: 400 });
    }

    const mapRecord = await base44.asServiceRole.entities.SumitProductMap.get(mapId);
    if (!mapRecord) return Response.json({ error: 'Product map record not found' }, { status: 404 });
    const productName = mapRecord.summit_product;

    // מוצרים שאינם "קורס" (תרומה/השכרה/אירוע/בדיקה/יום היכרות) — רק מסמנים
    // את המוצר, בלי לרשום לקורס וללא תיקון רטרואקטיבי. שיוך פשוט וזול.
    if (kind !== 'קורס') {
      if (mode === 'preview') {
        return Response.json({ affectedCount: 0, affectedTotal: 0, students: [] });
      }
      await base44.asServiceRole.entities.SumitProductMap.update(mapId, {
        kind,
        status: 'משויך'
      });
      return Response.json({ applied: true, affectedCount: 0, affectedTotal: 0 });
    }

    if (!courseId) return Response.json({ error: 'courseId is required for kind="קורס"' }, { status: 400 });
    const course = await base44.asServiceRole.entities.Course.get(courseId);
    if (!course) return Response.json({ error: 'Course not found' }, { status: 404 });

    // אפשרות קיימת או אפשרות חדשה שנפתחת עם מחיר
    let finalOptionId = optionId || null;
    let updatedOptions = Array.isArray(course.options) ? [...course.options] : [];
    if (!finalOptionId && newOption?.name) {
      finalOptionId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      updatedOptions.push({
        option_id: finalOptionId,
        name: newOption.name,
        price: newOption.price || 0,
        summit_product_name: productName,
        is_manual: false,
        status: 'פתוח להרשמה',
        current_students: 0
      });
    }

    // איתור כל המשתתפות שיש להן תשלום ממתין מהמוצר הזה (לפי טקסט ההערה)
    const allStudents = await base44.asServiceRole.entities.Student.filter({ tags: 'ממתין לשיוך לקורס' });
    const affected = [];
    for (const s of allStudents || []) {
      const amount = findPendingAmountsForProduct(s.notes, productName);
      if (amount > 0) affected.push({ id: s.id, name: s.full_name, amount, student: s });
    }

    if (mode === 'preview') {
      return Response.json({
        affectedCount: affected.length,
        affectedTotal: Math.round(affected.reduce((sum, a) => sum + a.amount, 0) * 100) / 100,
        students: affected.map((a) => ({ id: a.id, name: a.name, amount: a.amount }))
      });
    }

    // --- apply ---
    const today = new Date().toISOString().split('T')[0];
    let newRegistrations = 0;

    for (const a of affected) {
      const s = a.student;
      const courses = [...(s.courses || [])];
      const idx = courses.findIndex((c) => c.course_id === courseId);
      const wasRegistered = idx >= 0 && ['רשום', 'נרשם'].includes(courses[idx].status);

      if (idx >= 0) {
        courses[idx] = {
          ...courses[idx],
          status: 'רשום',
          option_id: finalOptionId || courses[idx].option_id,
          paid_so_far: Math.max(0, (parseFloat(courses[idx].paid_so_far) || 0) + a.amount)
        };
      } else {
        courses.push({
          course_id: courseId,
          course_name: course.name,
          status: 'רשום',
          option_id: finalOptionId || undefined,
          registration_date: today,
          paid_so_far: a.amount
        });
      }
      if (!wasRegistered) newRegistrations++;

      const auditLine = `שיוך רטרואקטיבי בתאריך ${today}: "${productName}" → ${course.name} (₪${a.amount})`;
      await base44.asServiceRole.entities.Student.update(s.id, {
        courses,
        notes: (s.notes ? s.notes + '\n' : '') + auditLine
      });

      if (finalOptionId) {
        updatedOptions = updatedOptions.map((o) =>
          o.option_id === finalOptionId ? { ...o, current_students: (o.current_students || 0) + (wasRegistered ? 0 : 1) } : o
        );
      }
    }

    await base44.asServiceRole.entities.Course.update(courseId, {
      options: updatedOptions,
      current_students: (course.current_students || 0) + newRegistrations
    });

    await base44.asServiceRole.entities.SumitProductMap.update(mapId, {
      course_id: courseId,
      course_name: course.name,
      option_id: finalOptionId || undefined,
      kind: 'קורס',
      status: 'משויך'
    });

    return Response.json({
      applied: true,
      affectedCount: affected.length,
      affectedTotal: Math.round(affected.reduce((sum, a) => sum + a.amount, 0) * 100) / 100
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}