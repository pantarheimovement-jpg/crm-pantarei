import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log('=== 💳 handleSummitPayment Webhook Started ===');
  
  try {
    const base44 = createClientFromRequest(req);
    
    // קבלת הנתונים מ-Summit
    const payload = await req.json();
    console.log('📦 Payload received:', JSON.stringify(payload, null, 2));
    
    // התאמת שדות מ-Summit (להתאים לפי הפורמט האמיתי)
    // נניח שהשדות הם: payer_name, payer_email, payer_phone, course_name, transaction_date
    const { 
      payer_name,
      payer_email, 
      payer_phone, 
      course_name,
      transaction_date 
    } = payload;
    
    // וולידציה בסיסית
    if (!payer_email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // חיפוש קורס לפי שם
    console.log(`🔍 Searching for course: ${course_name}`);
    const courses = await base44.asServiceRole.entities.Course.filter({ name: course_name });
    const course = courses && courses.length > 0 ? courses[0] : null;
    
    if (!course) {
      console.log(`⚠️ Course not found: ${course_name} - continuing without course link`);
    } else {
      console.log(`✅ Course found: ${course.name} (ID: ${course.id})`);
    }
    
    // חיפוש Student קיים לפי email
    console.log(`🔍 Checking if student exists: ${payer_email}`);
    const existingStudents = await base44.asServiceRole.entities.Student.filter({ email: payer_email });
    const existingStudent = existingStudents && existingStudents.length > 0 ? existingStudents[0] : null;
    
    // קבלת הסטטוס "רשום"
    const registeredStatuses = await base44.asServiceRole.entities.LeadStatuses.filter({ name: 'רשום' });
    const registeredStatus = registeredStatuses && registeredStatuses.length > 0 ? registeredStatuses[0].name : 'רשום';
    
    // הכנת נתוני Student
    let studentData = {
      full_name: payer_name || payer_email,
      email: payer_email,
      phone: payer_phone || null,
      status: registeredStatus,
      registration_date: transaction_date || new Date().toISOString().split('T')[0]
    };
    
    // הוספת שיוך לקורס אם נמצא
    if (course) {
      studentData.course_id = course.id;
      studentData.course_name = course.name;
    }
    
    let student;
    let isNewRegistration = false;
    
    if (existingStudent) {
      console.log(`🔄 Student exists: ${existingStudent.full_name}`);
      
      // בדיקה האם כבר רשום לאותו קורס
      const wasAlreadyRegisteredToSameCourse = 
        existingStudent.status === registeredStatus && 
        course && 
        existingStudent.course_id === course.id;
      
      if (wasAlreadyRegisteredToSameCourse) {
        console.log(`ℹ️ Student already registered to this course, skipping counter update`);
        isNewRegistration = false;
      } else {
        console.log(`📝 Updating student to "רשום"`);
        isNewRegistration = existingStudent.status !== registeredStatus || existingStudent.course_id !== course?.id;
      }
      
      // עדכון Student
      student = await base44.asServiceRole.entities.Student.update(existingStudent.id, studentData);
      
    } else {
      // יצירת Student חדש
      console.log(`✨ Creating new student: ${payer_name}`);
      studentData.lead_source = 'אחר';
      student = await base44.asServiceRole.entities.Student.create(studentData);
      isNewRegistration = true;
    }
    
    // עדכון מונה הקורס (רק אם זה רישום חדש)
    if (course && isNewRegistration) {
      console.log(`📊 Updating course student count: ${course.name}`);
      const currentCount = course.current_students || 0;
      await base44.asServiceRole.entities.Course.update(course.id, {
        current_students: currentCount + 1
      });
      console.log(`✅ Course counter updated: ${currentCount} → ${currentCount + 1}`);
    }
    
    console.log('✅ handleSummitPayment completed successfully');
    
    return Response.json({
      success: true,
      student_id: student.id,
      student_name: student.full_name,
      status: student.status,
      course: course ? course.name : 'לא שויך',
      is_new_registration: isNewRegistration
    });
    
  } catch (error) {
    console.error('=== ❌ ERROR in handleSummitPayment ===');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});