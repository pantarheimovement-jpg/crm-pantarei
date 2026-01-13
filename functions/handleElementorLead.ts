import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log('=== 📝 handleElementorLead Webhook Started ===');
  
  try {
    const base44 = createClientFromRequest(req);
    
    // קבלת הנתונים מהטופס
    const payload = await req.json();
    console.log('📦 Payload received:', JSON.stringify(payload, null, 2));
    
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      course_name,
      message 
    } = payload;
    
    // וולידציה בסיסית
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const full_name = `${first_name || ''} ${last_name || ''}`.trim();
    
    // וולידציה של מייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(email);
    
    // וולידציה של טלפון (מספר ישראלי)
    const phoneRegex = /^(\+972|972|0)?[5][0-9]{8}$/;
    const isPhoneValid = phone ? phoneRegex.test(phone.toString().replace(/[\s\-\(\)]/g, '')) : true;
    
    // הערות אם יש בעיות בוולידציה
    let validationNotes = [];
    if (!isEmailValid) {
      validationNotes.push('⚠️ דרוש בדיקה: מייל לא תקין');
    }
    if (!isPhoneValid) {
      validationNotes.push('⚠️ דרוש בדיקה: טלפון לא תקין');
    }
    
    // חיפוש קורס לפי שם
    console.log(`🔍 Searching for course: ${course_name}`);
    const courses = await base44.asServiceRole.entities.Course.filter({ name: course_name });
    const course = courses && courses.length > 0 ? courses[0] : null;
    
    if (!course) {
      console.log(`⚠️ Course not found: ${course_name}`);
    } else {
      console.log(`✅ Course found: ${course.name} (ID: ${course.id})`);
    }
    
    // חיפוש Student קיים לפי email
    console.log(`🔍 Checking if student exists: ${email}`);
    const existingStudents = await base44.asServiceRole.entities.Student.filter({ email });
    const existingStudent = existingStudents && existingStudents.length > 0 ? existingStudents[0] : null;
    
    // קבלת הסטטוס "ליד חדש"
    const leadStatuses = await base44.asServiceRole.entities.LeadStatuses.filter({ name: 'ליד חדש' });
    const leadStatus = leadStatuses && leadStatuses.length > 0 ? leadStatuses[0].name : 'ליד חדש';
    
    // קבלת הסטטוס "רשום"
    const registeredStatuses = await base44.asServiceRole.entities.LeadStatuses.filter({ name: 'רשום' });
    const registeredStatus = registeredStatuses && registeredStatuses.length > 0 ? registeredStatuses[0].name : 'רשום';
    
    let studentData = {
      full_name: full_name || email,
      email,
      phone: phone || null,
      status: leadStatus,
      lead_source: 'אתר',
      last_contact_date: new Date().toISOString(),
      notes: [...validationNotes, message].filter(Boolean).join('\n')
    };
    
    // הוספת שיוך לקורס אם נמצא
    if (course) {
      studentData.course_id = course.id;
      studentData.course_name = course.name;
    }
    
    let student;
    
    if (existingStudent) {
      console.log(`🔄 Student exists: ${existingStudent.full_name}`);
      
      // אם הסטטוס הוא "רשום" - לא משנים כלום
      if (existingStudent.status === registeredStatus) {
        console.log(`ℹ️ Student is already registered, skipping update`);
        student = existingStudent;
      } else {
        // עדכון לליד חדש
        console.log(`📝 Updating student to "ליד חדש"`);
        student = await base44.asServiceRole.entities.Student.update(existingStudent.id, studentData);
      }
    } else {
      // יצירת Student חדש
      console.log(`✨ Creating new student: ${full_name}`);
      student = await base44.asServiceRole.entities.Student.create(studentData);
    }
    
    // שליחת הודעת WhatsApp (רק אם הטלפון תקין)
    let whatsappSent = false;
    if (isPhoneValid && phone) {
      try {
        console.log('📱 Sending WhatsApp message...');
        
        const GREEN_ID = Deno.env.get('GREEN_ID');
        const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
        
        if (!GREEN_ID || !GREEN_TOKEN) {
          console.log('⚠️ Green API credentials not configured');
        } else {
          // עיצוב מספר הטלפון
          let phoneNumber = phone.toString().trim().replace(/[\s\-\(\)\.]/g, '');
          if (phoneNumber.startsWith('+')) {
            phoneNumber = phoneNumber.substring(1);
          }
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '972' + phoneNumber.substring(1);
          }
          
          // הודעת ברכה
          const courseName = course ? course.name : 'הקורס שלנו';
          const courseDescription = course && course.description ? course.description : '';
          
          let whatsappMessage = `היי ${first_name || 'שלום'}, ראינו שנרשמת לקורס ${courseName}`;
          if (courseDescription) {
            whatsappMessage += `, ${courseDescription}`;
          }
          whatsappMessage += `. נחזור אלייך בקרוב 💜 סטודיו פנטהרי`;
          
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
            console.log(`✅ WhatsApp sent successfully: ${whatsappResult.idMessage}`);
            whatsappSent = true;
          } else {
            console.log(`❌ WhatsApp failed:`, whatsappResult);
          }
        }
      } catch (error) {
        console.error('❌ WhatsApp error:', error.message);
      }
    } else {
      console.log('⏭️ Skipping WhatsApp (invalid phone)');
    }
    
    console.log('✅ handleElementorLead completed successfully');
    
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
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});