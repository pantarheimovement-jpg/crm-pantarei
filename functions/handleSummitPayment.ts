import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log('=== 💳 handleSummitPayment Webhook Started (v2 - Improved Matching) ===');
  
  try {
    const base44 = createClientFromRequest(req);
    
    // קבלת הנתונים מ-Summit
    let payload;
    try {
      payload = await req.json();
      console.log('📦 FULL PAYLOAD:', JSON.stringify(payload, null, 2));
    } catch (jsonError) {
      console.error('❌ Failed to parse JSON:', jsonError.message);
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    // 🆕 חילוץ נתונים מפורמט Summit החדש
    const properties = payload.Properties || {};
    
    // חילוץ שדות (תצוגת ניהול תשלומים)
    const customerName = properties.Property_2?.[0]?.Name || null;
    const customerEmail = properties.Property_6?.[0] || null;
    const customerPhone = properties.Property_7?.[0] || 'לא זמין';
    const courseName = properties.Property_3?.[0]?.Name || null;
    const billingDate = properties.Property_1?.[0]?.split('T')[0] || new Date().toISOString().split('T')[0];
    const documentName = properties["Property_M-1"]?.[0]?.Name || null;
    const paymentNumber = properties["מספר תשלומים"]?.[0] ? parseInt(properties["מספר תשלומים"][0]) : null;
    const totalPayments = properties["סה״כ תשלומים"]?.[0] ? parseInt(properties["סה״כ תשלומים"][0]) : null;
    
    console.log('✅ Extracted Data:', { customerName, customerEmail, customerPhone, courseName });
    
    if (!customerName) {
      return Response.json({ error: 'Customer name is required' }, { status: 400 });
    }
    
    // 1. חיפוש/יצירת קורס
    let course = null;
    if (courseName) {
      const courses = await base44.asServiceRole.entities.Course.filter({ name: courseName });
      course = courses?.[0] || null;
      
      if (!course) {
        console.log(`✨ Creating new course: ${courseName}`);
        try {
          course = await base44.asServiceRole.entities.Course.create({
            name: courseName,
            current_students: 0
          });
        } catch (e) {
          console.error(`⚠️ Failed to create course: ${e.message}`);
        }
      }
    }
    
    // 2. חיפוש תלמיד (שיפור: חיפוש רב-שלבי)
    let existingStudent = null;
    
    // א. חיפוש לפי אימייל (אם קיים)
    if (customerEmail) {
      console.log(`🔍 Searching student by Email: ${customerEmail}`);
      const byEmail = await base44.asServiceRole.entities.Student.filter({ email: customerEmail });
      if (byEmail?.[0]) existingStudent = byEmail[0];
    }
    
    // ב. חיפוש לפי טלפון (אם לא נמצא ואם קיים טלפון תקין)
    if (!existingStudent && customerPhone && customerPhone !== 'לא זמין') {
      console.log(`🔍 Searching student by Phone: ${customerPhone}`);
      const byPhone = await base44.asServiceRole.entities.Student.filter({ phone: customerPhone });
      if (byPhone?.[0]) existingStudent = byPhone[0];
    }
    
    // ג. חיפוש לפי שם (ברירת מחדל אחרונה)
    if (!existingStudent) {
      console.log(`🔍 Searching student by Name: ${customerName}`);
      const byName = await base44.asServiceRole.entities.Student.filter({ full_name: customerName });
      if (byName?.[0]) existingStudent = byName[0];
    }
    
    if (existingStudent) {
      console.log(`✅ Found existing student: ${existingStudent.full_name} (ID: ${existingStudent.id})`);
    } else {
      console.log(`👤 Student not found. Will create new.`);
    }
    
    // 3. הכנת נתונים וביצוע (יצירה/עדכון)
    const registeredStatuses = await base44.asServiceRole.entities.LeadStatuses.filter({ name: 'רשום' });
    const registeredStatus = registeredStatuses?.[0]?.name || 'רשום';
    
    let student;
    let isNewRegistration = false;
    
    // נתונים בסיסיים לעדכון/יצירה
    const studentData = {
      full_name: customerName,
      status: registeredStatus,
      registration_date: billingDate,
      course_id: course?.id,
      course_name: course?.name,
      // מעדכנים מייל/טלפון רק אם הם קיימים בבקשה הנוכחית
      ...(customerEmail && { email: customerEmail }),
      ...(customerPhone && customerPhone !== 'לא זמין' && { phone: customerPhone }),
      ...(paymentNumber && { payment_number: paymentNumber }),
      ...(totalPayments && { total_payments: totalPayments })
    };
    
    const noteText = `תשלום דרך Summit בתאריך ${billingDate}${documentName ? ` (${documentName})` : ''}`;
    
    if (existingStudent) {
      // האם כבר רשום לקורס הזה?
      const isSameCourse = existingStudent.course_id === course?.id && existingStudent.status === registeredStatus;
      
      if (isSameCourse) {
        console.log(`ℹ️ Student already registered to this course.`);
        isNewRegistration = false;
        
        // הוספת הערה בלבד + עדכון קל
        const newNotes = (existingStudent.notes ? existingStudent.notes + '\n' : '') + noteText;
        student = await base44.asServiceRole.entities.Student.update(existingStudent.id, {
          notes: newNotes,
          // מעדכנים פרטי קשר רק אם חסרים אצל הסטודנט הקיים
          ...(!existingStudent.email && customerEmail ? { email: customerEmail } : {}),
          ...((!existingStudent.phone || existingStudent.phone === 'לא זמין') && customerPhone !== 'לא זמין' ? { phone: customerPhone } : {}),
          ...(paymentNumber && { payment_number: paymentNumber }),
          ...(totalPayments && { total_payments: totalPayments })
        });
      } else {
        console.log(`📝 Updating student registration (New Course/Status).`);
        isNewRegistration = true;
        studentData.notes = noteText;
        student = await base44.asServiceRole.entities.Student.update(existingStudent.id, studentData);
      }
      
    } else {
      console.log(`✨ Creating new student.`);
      isNewRegistration = true;
      studentData.lead_source = 'Summit';
      studentData.notes = noteText;
      student = await base44.asServiceRole.entities.Student.create(studentData);
    }
    
    // 4. עדכון מונה
    if (course && isNewRegistration) {
      await base44.asServiceRole.entities.Course.update(course.id, {
        current_students: (course.current_students || 0) + 1
      });
    }
    
    return Response.json({
      success: true,
      student_id: student.id,
      student_name: student.full_name,
      phone: student.phone,
      email: student.email || 'לא סופק',
      status: student.status,
      course: course ? course.name : 'לא שויך',
      payment_info: paymentNumber && totalPayments ? `${paymentNumber}/${totalPayments}` : 'לא זמין',
      document: documentName || 'לא זמין',
      is_new_registration: isNewRegistration
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});