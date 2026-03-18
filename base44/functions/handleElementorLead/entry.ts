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
      const formData = await req.formData();
      rawPayload = {};
      for (const [key, value] of formData.entries()) {
        rawPayload[key] = value;
      }
    }
    
    console.log('📦 Raw Payload keys:', Object.keys(rawPayload));
    console.log('📦 Raw Payload:', JSON.stringify(rawPayload, null, 2));
    
    // פונקציית עזר לחילוץ נתונים
    function extractField(payload, fieldNames) {
      for (const fieldName of fieldNames) {
        if (payload[fieldName]) {
          return payload[fieldName];
        }
      }
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
    
    // חילוץ הסכמה לדיוור ופרטיות
    const privacyRaw = extractField(rawPayload, ['privacyagree', 'privacy_agree', 'privacy', 'marketing_consent', 'opt_in', 'הסכמה', 'הסכמת פרטיות', 'אישור פרטיות']);
    const marketingConsent = !!(privacyRaw && privacyRaw !== 'false' && privacyRaw !== '0' && privacyRaw !== 'no');
    console.log('✅ Marketing consent:', marketingConsent, '(raw:', privacyRaw, ')');
    
    console.log('🔎 After extractField:', { first_name, last_name, phone: phone || 'MISSING' });
    
    // חילוץ מייל
    let email = extractField(rawPayload, ['email', 'אימייל', 'דוא"ל', "דוא\\'ל", 'מייל']);
    if (!email) {
      // Fallback: search for email-like value in any field
      for (const [key, value] of Object.entries(rawPayload)) {
        const str = typeof value === 'string' ? value : '';
        if (str.includes('@') && str.includes('.')) {
          console.log(`📧 Found email in field "${key}": ${str}`);
          email = str;
          break;
        }
      }
    }
    email = email?.toLowerCase().trim() || '';
    
    console.log('📧 Email extracted:', email || 'MISSING');
    
    // חילוץ קורס
    let course_name = extractField(rawPayload, ['course_name', 'course', 'קורס', 'במה מתעניין', 'תחום עניין']) || '';
    
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
    
    console.log('✅ Extracted data:', { first_name, last_name, email, phone, course_name, message });
    
    // וולידציה
    if (!email) {
      console.log('❌ No email found');
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const full_name = `${first_name || ''} ${last_name || ''}`.trim() || email;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(email);
    
    const phoneRegex = /^(\+972|972|0)?[5][0-9]{8}$/;
    const cleanPhone = phone ? phone.replace(/[\s\-\(\)\.]/g, '') : '';
    const isPhoneValid = phone ? phoneRegex.test(cleanPhone) : true;
    
    let validationNotes = [];
    if (!isEmailValid) validationNotes.push('⚠️ דרוש בדיקה: מייל לא תקין');
    if (!isPhoneValid) validationNotes.push('⚠️ דרוש בדיקה: טלפון לא תקין');
    
    // חיפוש קורס
    let course = null;
    if (course_name) {
      const courses = await base44.asServiceRole.entities.Course.filter({ name: course_name });
      course = courses && courses.length > 0 ? courses[0] : null;
      
      if (!course) {
        try {
          course = await base44.asServiceRole.entities.Course.create({
            name: course_name,
            current_students: 0
          });
          console.log(`✅ Course created: ${course.id}`);
        } catch (createError) {
          console.error(`⚠️ Failed to create course: ${createError.message}`);
        }
      }
    }
    
    // חיפוש student קיים
    let existingStudent = null;
    
    try {
      if (email) {
        console.log(`🔍 Searching student by email: ${email}`);
        const byEmail = await base44.asServiceRole.entities.Student.filter({ email });
        existingStudent = byEmail && byEmail.length > 0 ? byEmail[0] : null;
        if (existingStudent) console.log(`✅ Found by email: ${existingStudent.full_name} (ID: ${existingStudent.id})`);
      }
      
      if (!existingStudent && phone) {
        console.log(`🔍 Searching student by phone: ${phone}`);
        const byPhone = await base44.asServiceRole.entities.Student.filter({ phone });
        existingStudent = byPhone && byPhone.length > 0 ? byPhone[0] : null;
        if (existingStudent) console.log(`✅ Found by phone: ${existingStudent.full_name} (ID: ${existingStudent.id})`);
      }
      
      if (!existingStudent && full_name) {
        console.log(`🔍 Searching student by name: ${full_name}`);
        const byName = await base44.asServiceRole.entities.Student.filter({ full_name });
        existingStudent = byName && byName.length > 0 ? byName[0] : null;
        if (existingStudent) console.log(`✅ Found by name: ${existingStudent.full_name} (ID: ${existingStudent.id})`);
      }
      
      if (!existingStudent) console.log('🆕 No existing student found - will create new');
    } catch (searchError) {
      console.error('⚠️ Error searching for existing student:', searchError.message);
      console.log('🆕 Proceeding to create new student due to search error');
    }
    
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
      lead_source: 'אתר',
      lead_entry_date: new Date().toISOString().split('T')[0],
      last_contact_date: new Date().toISOString(),
      notes: [...validationNotes, message].filter(Boolean).join('\n'),
      marketing_consent: marketingConsent
    };
    
    let student;
    let isNewStudent = false;
    
    if (existingStudent) {
      console.log(`🔄 Student exists: ${existingStudent.full_name}`);
      
      const existingCourses = existingStudent.courses || [];
      const courseInArray = course ? existingCourses.find(c => c.course_id === course.id) : null;
      
      if (courseInArray && courseInArray.status === registeredStatus) {
        console.log(`ℹ️ Student already registered to this course`);
        student = existingStudent;
      } else if (course) {
        const updatedCourses = [...existingCourses];
        const courseIndex = updatedCourses.findIndex(c => c.course_id === course.id);
        
        const newCourseEntry = {
          course_id: course.id,
          course_name: course.name,
          status: leadStatus,
          registration_date: new Date().toISOString().split('T')[0]
        };
        
        if (courseIndex >= 0) {
          updatedCourses[courseIndex] = { ...updatedCourses[courseIndex], ...newCourseEntry };
        } else {
          updatedCourses.push(newCourseEntry);
        }
        
        const hasRegistered = updatedCourses.some(c => c.status === registeredStatus);
        const generalStatus = hasRegistered ? registeredStatus : leadStatus;
        
        const updateData = {
          ...studentData,
          courses: updatedCourses,
          status: generalStatus
        };
        
        if (hasRegistered) {
          const registeredCourses = updatedCourses.filter(c => c.status === registeredStatus);
          const latestRegistered = registeredCourses.sort((a, b) => 
            new Date(b.registration_date || 0) - new Date(a.registration_date || 0)
          )[0];
          updateData.course_id = latestRegistered.course_id;
          updateData.course_name = latestRegistered.course_name;
        } else {
          updateData.course_id = course.id;
          updateData.course_name = course.name;
        }
        
        student = await base44.asServiceRole.entities.Student.update(existingStudent.id, updateData);
      } else {
        studentData.status = leadStatus;
        student = await base44.asServiceRole.entities.Student.update(existingStudent.id, studentData);
      }
    } else {
      console.log(`✨ Creating new student: ${full_name}`);
      isNewStudent = true;
      
      studentData.status = leadStatus;
      
      if (course) {
        studentData.course_id = course.id;
        studentData.course_name = course.name;
        studentData.courses = [{
          course_id: course.id,
          course_name: course.name,
          status: leadStatus,
          registration_date: new Date().toISOString().split('T')[0]
        }];
      }
      
      student = await base44.asServiceRole.entities.Student.create(studentData);
      console.log(`✅ New student created: ${student.full_name} (ID: ${student.id})`);
    }
    
    // ========================================
    // יצירת משימת שיחת היכרות
    // ========================================
    let taskCreated = false;
    const isNewLead = (student.status === 'חדש' || student.status === 'ליד חדש') && isNewStudent;
    
    if (isNewLead) {
      console.log('📞 Creating introduction task...');
      
      try {
        // בדיקה אם כבר יש משימת היכרות פתוחה
        const existingTasks = await base44.asServiceRole.entities.Task.filter({
          student_id: student.id,
          name: "שיחת היכרות"
        });
        
        const openTask = existingTasks.find(t => 
          t.status !== "הושלם" && t.status !== "אבוד"
        );
        
        if (openTask) {
          console.log(`⏭️ Introduction task already exists (ID: ${openTask.id})`);
        } else {
          // חישוב תאריך מתוזמן - יומיים קדימה
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + 2);
          
          const task = await base44.asServiceRole.entities.Task.create({
            name: "שיחת היכרות",
            description: `שיחת היכרות עם ${student.full_name}`,
            status: "ממתין",
            scheduled_date: scheduledDate.toISOString().split('T')[0],
            student_id: student.id,
            student_name: student.full_name
          });
          
          console.log(`✅ Created introduction task (ID: ${task.id})`);
          taskCreated = true;
        }
      } catch (taskError) {
        console.error('⚠️ Failed to create introduction task:', taskError.message);
      }
    } else {
      console.log(`⏭️ Skipping intro task - status is "${student.status}"`);
    }
    // ========================================
    
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
          whatsappMessage += `. ניצור איתך קשר בהקדם💜 סטודיו פנטהריי`;
          
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
    }
    
    // יצירת/עדכון מנוי ב-Subscribers (אם יש הסכמה לדיוור)
    if (marketingConsent && email) {
      try {
        const existingSubs = await base44.asServiceRole.entities.Subscribers.filter({ email });
        if (existingSubs && existingSubs.length > 0) {
          await base44.asServiceRole.entities.Subscribers.update(existingSubs[0].id, {
            marketing_consent: true,
            subscribed: true,
            name: full_name,
            whatsapp: cleanPhone ? (cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone) : undefined,
            source: 'טופס אתר'
          });
          console.log('✅ Subscriber updated with marketing consent');
        } else {
          await base44.asServiceRole.entities.Subscribers.create({
            email,
            name: full_name,
            whatsapp: cleanPhone ? (cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone) : '',
            subscribed: true,
            marketing_consent: true,
            source: 'טופס אתר'
          });
          console.log('✅ New subscriber created with marketing consent');
        }
      } catch (subError) {
        console.error('⚠️ Failed to create/update subscriber:', subError.message);
      }
    }

    console.log('✅ Webhook completed successfully');
    
    return Response.json({
      success: true,
      student_id: student.id,
      student_name: student.full_name,
      status: student.status,
      course: course ? course.name : 'לא שויך',
      whatsapp_sent: whatsappSent,
      task_created: taskCreated
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