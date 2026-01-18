import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log('=== 💳 handleSummitPayment Webhook Started ===');
  
  try {
    const base44 = createClientFromRequest(req);
    
    // קבלת הנתונים מ-Summit
    let payload;
    try {
      console.log('🔹 Step 1: About to parse request JSON...');
      payload = await req.json();
      console.log('🔹 Step 2: JSON parsed successfully');
      console.log('📦 FULL PAYLOAD:', JSON.stringify(payload, null, 2));
    } catch (jsonError) {
      console.error('❌ Failed to parse JSON:', jsonError.message);
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    // חילוץ נתונים מפורמט Summit
    const properties = payload.Properties || {};
    console.log('🔍 ALL Properties keys:', Object.keys(properties));
    
    // שם הלקוח ו-ID
    const customerName = properties.Billing_Customer && properties.Billing_Customer[0] 
      ? properties.Billing_Customer[0].Name 
      : null;
    
    const customerId = properties.Billing_Customer && properties.Billing_Customer[0]
      ? properties.Billing_Customer[0].ID
      : null;
      
    // מסמך חשבונאי (חשבונית) - לצורך שליפת פרטים נוספים
    const documentId = properties.Accounting_Document && properties.Accounting_Document[0]
      ? properties.Accounting_Document[0].ID
      : null;
    
    // שם הקורס/מוצר
    const courseName = properties.Billing_Items && properties.Billing_Items[0]
      ? properties.Billing_Items[0].Name
      : null;
    
    // תאריך התשלום
    const billingDate = properties.Billing_Date && properties.Billing_Date[0]
      ? properties.Billing_Date[0].split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    // 🆕 חילוץ פרטי תשלומים (מספר תשלום וסה"כ)
    let paymentNumber = null;
    let totalPayments = null;
    
    if (properties.Billing_PaymentNumber && properties.Billing_PaymentNumber.length > 0) {
      paymentNumber = parseInt(properties.Billing_PaymentNumber[0]);
    }
    if (properties.Billing_TotalPayments && properties.Billing_TotalPayments.length > 0) {
      totalPayments = parseInt(properties.Billing_TotalPayments[0]);
    }
    
    console.log('✅ Basic data extracted:', {
      customerName,
      customerId,
      documentId,
      courseName,
      billingDate,
      paymentNumber,
      totalPayments
    });
    
    // וולידציה בסיסית
    if (!customerName || !customerId) {
      console.log('❌ Customer name or ID missing');
      return Response.json({ error: 'Customer name and ID are required' }, { status: 400 });
    }
    
    // קריאה ל-Summit API לקבלת פרטי הלקוח
    let customerPhone = 'לא זמין';
    let customerEmail = null;
    
    const SUMMIT_API_TOKEN = Deno.env.get('SUMIT_TOKEN');
    
    if (SUMMIT_API_TOKEN) {
      // 1. נסיון ראשון: שליפה לפי Customer ID
      try {
        console.log(`🔍 Try 1: Fetching customer details from Summit API for ID: ${customerId}`);
        const customerResponse = await fetch(`https://app.sumit.co.il/api/Entity/${customerId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SUMMIT_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          console.log('✅ Customer API response:', JSON.stringify(customerData, null, 2));
          const props = customerData.Properties || {};
          
          if (props.Contact_Phone?.[0] || props.Phone?.[0] || props.Mobile?.[0]) 
             customerPhone = props.Contact_Phone?.[0] || props.Phone?.[0] || props.Mobile?.[0];
          if (props.Contact_Email?.[0] || props.Email?.[0]) 
             customerEmail = props.Contact_Email?.[0] || props.Email?.[0];
        } else {
          console.log('⚠️ Failed to fetch customer:', customerResponse.status);
        }
      } catch (err) { console.log('⚠️ API Error (Customer):', err.message); }
      
      // 2. נסיון שני: אם עדיין חסר, שליפה לפי Document ID (חשבונית)
      if ((customerPhone === 'לא זמין' || !customerEmail) && documentId) {
        try {
          console.log(`🔍 Try 2: Fetching Document (Invoice) details from Summit API for ID: ${documentId}`);
          const docResponse = await fetch(`https://app.sumit.co.il/api/Entity/${documentId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${SUMMIT_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (docResponse.ok) {
            const docData = await docResponse.json();
            console.log('✅ Document API response:', JSON.stringify(docData, null, 2));
            const props = docData.Properties || {};
            
            // בחשבוניות המידע עשוי להיות תחת שדות שונים
            if (customerPhone === 'לא זמין') {
              if (props.Values_Mobile?.[0] || props.Recipient_Phone?.[0] || props.Contact_Phone?.[0]) {
                customerPhone = props.Values_Mobile?.[0] || props.Recipient_Phone?.[0] || props.Contact_Phone?.[0];
                console.log('🎉 Found phone in Document entity!');
              }
            }
            if (!customerEmail) {
              if (props.Values_Email?.[0] || props.Recipient_Email?.[0] || props.Contact_Email?.[0]) {
                customerEmail = props.Values_Email?.[0] || props.Recipient_Email?.[0] || props.Contact_Email?.[0];
                console.log('🎉 Found email in Document entity!');
              }
            }
          } else {
            console.log('⚠️ Failed to fetch document:', docResponse.status);
          }
        } catch (err) { console.log('⚠️ API Error (Document):', err.message); }
      }
      
      console.log('✅ Final extracted data:', { customerPhone, customerEmail });
    } else {
      console.log('⚠️ SUMIT_TOKEN not set, skipping API calls');
    }
    
    // חיפוש או יצירת קורס
    console.log(`🔍 Searching for course: ${courseName}`);
    let course = null;
    
    if (courseName) {
      console.log('🔍 About to query Course entity...');
      const courses = await base44.asServiceRole.entities.Course.filter({ name: courseName });
      console.log(`🔍 Course query completed. Found ${courses ? courses.length : 0} courses`);
      course = courses && courses.length > 0 ? courses[0] : null;
      
      // אם הקורס לא קיים - צור אותו
      if (!course) {
        console.log(`✨ Course not found. Creating new course: ${courseName}`);
        try {
          course = await base44.asServiceRole.entities.Course.create({
            name: courseName,
            current_students: 0
          });
          console.log(`✅ Course created successfully: ${course.id}`);
        } catch (createError) {
          console.error(`⚠️ Failed to auto-create course: ${createError.message}`);
          console.log(`Continuing without course link.`);
        }
      } else {
        console.log(`✅ Course found: ${course.name} (ID: ${course.id})`);
      }
    }
    
    // חיפוש Student קיים לפי שם מלא (כי אין מייל מ-Summit)
    console.log(`🔍 Checking if student exists: ${customerName}`);
    console.log('🔍 About to query Student entity...');
    const existingStudents = await base44.asServiceRole.entities.Student.filter({ full_name: customerName });
    console.log(`🔍 Student query completed. Found ${existingStudents ? existingStudents.length : 0} students`);
    const existingStudent = existingStudents && existingStudents.length > 0 ? existingStudents[0] : null;
    
    // קבלת הסטטוס "רשום"
    console.log('🔍 About to query LeadStatuses entity...');
    const registeredStatuses = await base44.asServiceRole.entities.LeadStatuses.filter({ name: 'רשום' });
    console.log(`🔍 LeadStatuses query completed. Found ${registeredStatuses ? registeredStatuses.length : 0} statuses`);
    const registeredStatus = registeredStatuses && registeredStatuses.length > 0 ? registeredStatuses[0].name : 'רשום';
    
    // הכנת נתוני Student
    let studentData = {
      full_name: customerName,
      phone: customerPhone,
      status: registeredStatus,
      registration_date: billingDate,
      notes: `תשלום דרך Summit בתאריך ${billingDate}`
    };
    
    // הוספת מייל אם קיים
    if (customerEmail) {
      studentData.email = customerEmail;
    }
    
    // 🆕 הוספת פרטי תשלומים אם קיימים
    if (paymentNumber) {
      studentData.payment_number = paymentNumber;
    }
    if (totalPayments) {
      studentData.total_payments = totalPayments;
    }
    
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
        console.log(`ℹ️ Student already registered to this course, updating contact info`);
        isNewRegistration = false;
        // עדכון מייל/טלפון אם חסרים או אם הטלפון היה "לא זמין"
        const updateData = { notes: `${existingStudent.notes || ''}\nתשלום נוסף: ${billingDate}`.trim() };
        if ((!existingStudent.phone || existingStudent.phone === 'לא זמין') && customerPhone !== 'לא זמין') {
          updateData.phone = customerPhone;
        }
        if (!existingStudent.email && customerEmail) {
          updateData.email = customerEmail;
        }
        student = await base44.asServiceRole.entities.Student.update(existingStudent.id, updateData);
      } else {
        console.log(`📝 Updating student to "רשום" status`);
        isNewRegistration = existingStudent.status !== registeredStatus || existingStudent.course_id !== course?.id;
        student = await base44.asServiceRole.entities.Student.update(existingStudent.id, studentData);
      }
      
    } else {
      // יצירת Student חדש
      console.log(`✨ Creating new student: ${customerName}`);
      studentData.lead_source = 'Summit';
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
      phone: student.phone,
      email: student.email || 'לא סופק',
      status: student.status,
      course: course ? course.name : 'לא שויך',
      payment_info: paymentNumber && totalPayments ? `${paymentNumber}/${totalPayments}` : 'לא זמין',
      is_new_registration: isNewRegistration
    });
    
  } catch (error) {
    console.error('=== ❌ ERROR in handleSummitPayment ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return Response.json({ 
      error: error.message,
      error_type: error.constructor.name,
      stack: error.stack 
    }, { status: 500 });
  }
});