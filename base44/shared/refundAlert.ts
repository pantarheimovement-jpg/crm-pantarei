// זיכוי שאינו ביטול מלא — המערכת לא מנחשת. שולחת מייל התראה כדי שעינת תכריע
// אם זו ביטול הרשמה, דמי ביטול, או תיקון תשלום כפול.
export async function notifyUnclearRefund(base44, { studentName, studentId, lines }) {
  try {
    const settings = await base44.asServiceRole.entities.GeneralSettings.list();
    const to = settings?.[0]?.business_email;
    if (!to) return false;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject: `❓ זיכוי לבדיקה — ${studentName}`,
      body:
        `התקבל זיכוי שאינו ביטול מלא, ולכן הסטטוס לא שונה אוטומטית.\n\n` +
        `משתתפת: ${studentName}\n\n` +
        `${(lines || []).join('\n')}\n\n` +
        `כרטיס המשתתפת מסומן בתגית "זיכוי לבדיקה".\n` +
        `יש להכריע: ביטול הרשמה, דמי ביטול, או תיקון תשלום כפול.\n` +
        `מזהה: ${studentId || '—'}`
    });
    return true;
  } catch (err) {
    console.error('⚠️ Unclear-refund alert failed (non-fatal):', err.message);
    return false;
  }
}