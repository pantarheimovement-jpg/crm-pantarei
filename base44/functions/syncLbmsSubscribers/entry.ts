import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COURSE_ID = '697a280406466f42ce5b27c1';
const COURSE_NAME = 'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף';

function generateToken() {
  return crypto.randomUUID();
}

function normalizeWhatsapp(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/[\s\-().+]/g, '');
  if (clean.startsWith('0')) return `972${clean.slice(1)}`;
  return clean;
}

function isLbmsStudent(student) {
  if (student.course_id === COURSE_ID || student.course_name === COURSE_NAME) return true;
  return Array.isArray(student.courses) && student.courses.some((course) => (
    course.course_id === COURSE_ID || course.course_name === COURSE_NAME
  ));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const students = await base44.asServiceRole.entities.Student.list('-created_date', 1000);
    const subscribers = await base44.asServiceRole.entities.Subscribers.list('-created_date', 1000);
    const subscribersByEmail = new Map(
      (subscribers || [])
        .filter((subscriber) => subscriber.email)
        .map((subscriber) => [subscriber.email.toLowerCase(), subscriber])
    );

    const lbmsStudents = (students || []).filter((student) => isLbmsStudent(student) && student.email);

    let studentsUpdated = 0;
    let subscribersCreated = 0;
    let subscribersUpdated = 0;
    const processedEmails = new Set();

    for (const student of lbmsStudents) {
      const email = student.email.toLowerCase().trim();
      if (!email || processedEmails.has(email)) continue;
      processedEmails.add(email);

      if (student.marketing_consent !== true) {
        await base44.asServiceRole.entities.Student.update(student.id, { marketing_consent: true });
        studentsUpdated++;
      }

      const existingSubscriber = subscribersByEmail.get(email);
      const whatsapp = normalizeWhatsapp(student.phone);

      if (existingSubscriber) {
        const existingGroups = Array.isArray(existingSubscriber.groups) ? existingSubscriber.groups : [];
        const groups = existingGroups.includes(COURSE_NAME) ? existingGroups : [...existingGroups, COURSE_NAME];

        await base44.asServiceRole.entities.Subscribers.update(existingSubscriber.id, {
          subscribed: true,
          marketing_consent: true,
          name: existingSubscriber.name || student.full_name || email,
          whatsapp: existingSubscriber.whatsapp || whatsapp,
          group: COURSE_NAME,
          groups,
          source: existingSubscriber.source || 'סנכרון LBMS',
          unsubscribe_token: existingSubscriber.unsubscribe_token || generateToken(),
        });
        subscribersUpdated++;
      } else {
        await base44.asServiceRole.entities.Subscribers.create({
          email,
          name: student.full_name || email,
          whatsapp,
          subscribed: true,
          marketing_consent: true,
          group: COURSE_NAME,
          groups: [COURSE_NAME],
          source: 'סנכרון LBMS',
          unsubscribe_token: generateToken(),
        });
        subscribersCreated++;
      }
    }

    return Response.json({
      success: true,
      lbms_students_with_email: lbmsStudents.length,
      unique_emails_processed: processedEmails.size,
      students_marketing_consent_updated: studentsUpdated,
      subscribers_created: subscribersCreated,
      subscribers_updated: subscribersUpdated,
      group: COURSE_NAME,
    });
  } catch (error) {
    console.error('syncLbmsSubscribers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});