import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log('=== 📝 handleElementorLead Webhook Started ===');
  
  try {
    const base44 = createClientFromRequest(req);
    
    // קבלת הנתונים מהטופס
    const contentType = req.headers.get('content-type') || '';
    let rawPayload;
    
    if (contentType.includes('application/json')) {
      rawPayload = await req.json();
    } else {
      // Form data מ-Elementor
      const formData = await req.formData();
      rawPayload = {};
      for (const [key, value] of formData.entries()) {
        rawPayload[key] = value;
      }
    }
    
    console.log('📦 Raw Payload:', JSON.stringify(rawPayload, null, 2));
    
    // ===== פונקציית עזר לחילוץ נתונים מפורמט הפוך =====
    function extractField(payload, fieldNames) {
      // חיפוש רגיל (מפתח = שם שדה, ערך = תוכן)
      for (const fieldName of fieldNames) {
        if (payload[fieldName]) {
          return payload[fieldName];
        }
      }
      
      // חיפוש הפוך (ערך = שם שדה, מפתח = תוכן) - אלמנטור עושה את זה
      for (const [key, value] of Object.entries(payload)) {
        if (fieldNames.includes(value)) {
          return key;
        }
      }
      
      return null;
    }
    
    // חילוץ השדות
    const first_name = extractField(rawPayload, ['first_name', 'name', 'שם פרטי', 'שם']) || '';
    const last_name = extractField(rawPayload, ['last_name', 'שם משפחה']) || '';
    const phone = extractField(rawPayload, ['phone', 'טלפון', 'telephone']) || '';
    const message = extractField(rawPayload, ['message', 'הודעה', 'תוכן']) || '';
    
    console.log('🔎 After extractField:', { first_name, last_name, phone: phone || 'MISSING' });
    
    // חילוץ מייל - יכול להיות גם לפי תבנית
    let email = extractField(rawPayload, ['email', 'אימייל', 'דוא"ל', "דוא\\'ל", 'מייל']);
    if (!email) {
      // חפש מפתח שנראה כמו מייל
      for (const [key, value] of Object.entries(rawPayload)) {
        if (typeof key === 'string' && key.includes('@')) {
          email = key;
          break;
        }
      }
    }
    email = email?.toLowerCase().trim() || '';
    
    console.log('📧 Email extracted:', email || 'MISSING');
    
    // חילוץ קורס
    let course_name = extractField(rawPayload, ['course_name', 'course', 'קורס', 'במה מתעניין', 'תחום עניין']) || '';
    
    console.log('📚 Course extracted:', course_name || 'MISSING');
    
    // אם אין, חפש URL שמכיל "courses"
    if (!course_name) {
      for (const [key, value] of Object.entries(rawPayload)) {
        const str = typeof value === 'string' ? value : key;
        if (str.includes('/courses/')) {
          const match = str.match(/\/courses\/([^\/]+)/);
          if (match) {
            course_name = match[1].replace(/-/g, ' ');
            break;
          }
        }
      }
    }
    
    console.log('✅ Extracted data:', {
      first_name,
      last_name,
      email,
      phone,
      course_name,
      message
    });
    
    // וולידציה בסיסית
    if (!email) {
      console.log('❌ No email found');
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const full_name = `${first_name || ''} ${last_name || ''}`.trim() || email;
    
    // וולידציה של מייל וטלפון
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(email);
    
    const phoneRegex = /^(\+972|972|0)?[5][0-9]{8}$/;
    const cleanPhone = phone ? phone.replace(/[\s\-\(\)\.]/g, '') : '';
    const isPhoneValid = phone ? phoneRegex.test(cleanPhone) : true;
    
    console.log('✅ Validation:', { isEmailValid, isPhoneValid, cleanPhone });
    
    let validationNotes = [];
    if (!isEmailValid) {
      validationNotes.push('⚠️ דרוש בדיקה: מייל לא תקין');
    }
    if (!isPhoneValid) {
      validationNotes.push('⚠️ דרוש בדיקה: טלפון לא תקין');
    }
    
    // חיפוש קורס
    console.log(`🔍 Searching for course: ${course_name}`);
    const courses = course_name 
      ? await base44.asServiceRole.entities.Course.filter({ name: course_name })
      : [];
    let course = courses && courses.length > 0 ? courses[0] : null;

    // ✨ אם הקורס לא נמצא - צור אותו אוטומטית
    if (course_name && !course) {
      console.log(`✨ Creating new course: ${course_name}`);
      course = await base44.asServiceRole.entities.Course.create({
        name: course_name,
        type: 'קורס קבוע',
        status: 'פתוח להרשמה',
        description: '',
        current_students: 0
      });
      console.log(`✅ Course created with ID: ${course.id}`);
    } else if (course) {
      console.log(`✅ Course found: ${course.name} (ID: ${course.id})`);
    }
    
    // חיפוש student קיים
    console.log(`🔍 Checking if student exists: ${email}`);
    const existingStudents = await base44.asServiceRole.entities.Student.filter({ email });
    const existingStudent = existingStudents && existingStudents.length > 0 ? existingStudents[0] : null;
    
    // קבלת סטטוסים
    const leadStatuses = await base44.asServiceRole.entities.LeadStatuses.filter({ name: 'ליד חדש' });
    const leadStatus = leadStatuses && leadStatuses.length > 0 ? leadStatuses[0].name : 'ליד חדש';
    
    const registeredStatuses = await base44.asServiceRole.entities.LeadStatuses.filter({ name: 'רשום' });
    const registeredStatus = registeredStatuses && registeredStatuses.length > 0 ? registeredStatuses[0].name : 'רשום';
    
    // הכנת נתוני Student
    let studentData = {
      full_name,
      email,
      phone: phone || null,
      status: leadStatus,
      lead_source: 'אתר',
      last_contact_date: new Date().toISOString(),
      notes: [...validationNotes, message].filter(Boolean).join('\n')
    };
    
    if (course) {
      studentData.course_id = course.id;
      studentData.course_name = course.name;
    }
    
    let student;
    
    if (existingStudent) {
      console.log(`🔄 Student exists: ${existingStudent.full_name}`);
      
      if (existingStudent.status === registeredStatus) {
        console.log(`ℹ️ Student already registered, skipping update`);
        student = existingStudent;
      } else {
        console.log(`📝 Updating student to "ליד חדש"`);
        student = await base44.asServiceRole.entities.Student.update(existingStudent.id, studentData);
      }
    } else {
      console.log(`✨ Creating new student: ${full_name}`);
      student = await base44.asServiceRole.entities.Student.create(studentData);
    }
    
    // שליחת WhatsApp
    let whatsappSent = false;
    if (isPhoneValid && phone) {
      try {
        console.log('📱 Sending WhatsApp...');
        
        const GREEN_ID = Deno.env.get('GREEN_ID');
        const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
        
        if (!GREEN_ID || !GREEN_TOKEN) {
          console.log('⚠️ Green API not configured');
        } else {
          let phoneNumber = cleanPhone;
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '972' + phoneNumber.substring(1);
          }
          if (phoneNumber.startsWith('+')) {
            phoneNumber = phoneNumber.substring(1);
          }
          
          const courseName = course ? course.name : 'הקורס';
          const courseDescription = course?.description || '';

          let whatsappMessage = `הי ${first_name || 'שלום'}, קיבלנו את פנייתך בנוגע ל${courseName}`;
          if (courseDescription) {
            whatsappMessage += `, ${courseDescription}`;
          }
          whatsappMessage += `, ניצור איתך קשר בהקדם 💜 סטודיו פנטהריי`;
          
          const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
          
          const whatsappResponse = await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: `${phoneNumber}@c.us`,
              message: whatsappMessage
            })
          });
          
          const whatsappResult = await whatsappResponse.json();
          
          if (whatsappResponse.ok && whatsappResult.idMessage) {
            console.log(`✅ WhatsApp sent: ${whatsappResult.idMessage}`);
            whatsappSent = true;
          } else {
            console.log(`❌ WhatsApp failed:`, whatsappResult);
          }
        }
      } catch (error) {
        console.error('❌ WhatsApp error:', error.message);
      }
    } else {
      console.log('⏭️ Skipping WhatsApp (invalid or missing phone)');
    }
    
    console.log('✅ Webhook completed successfully');
    
    return Response.json({
      success: true,
      student_id: student.id,
      student_name: student.full_name,
      status: student.status,
      course: course ? course.name : 'לא שויך',
      whatsapp_sent: whatsappSent
    });
    
  } catch (error) {
    console.error('=== ❌ ERROR in handleElementorLead ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});