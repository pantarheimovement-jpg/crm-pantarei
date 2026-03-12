import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// =============================================
// SUPER AGENT: Gmail Lead Safety Net
// Watches for Elementor lead emails and creates
// missing leads in CRM when webhook fails
// =============================================

Deno.serve(async (req) => {
  console.log('=== 🔍 gmailLeadWatcher Started ===');

  const base44 = createClientFromRequest(req);

  try {
    // Parse payload - support custom hours_back for one-time scans
    let body = {};
    try { body = await req.json(); } catch(e) { /* empty body is ok */ }
    
    const hoursBack = body.hours_back || 3;
    const dryRun = body.dry_run || false; // dry_run = just list emails, don't create leads
    
    console.log(`📦 Config: hours_back=${hoursBack}, dry_run=${dryRun}`);

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    if (!accessToken) {
      console.error('❌ No Gmail access token');
      return Response.json({ error: 'No Gmail access token' }, { status: 500 });
    }

    // =============================================
    // STEP 1: Search for lead form emails
    // Subject pattern: "מתעניין/מתעניינ.ת" + course name
    // =============================================
    const searchQuery = encodeURIComponent(`subject:(מתעניין OR מתעניינת OR "מתעניינ.ת") newer_than:${hoursBack}h -label:starred`);
    
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${searchQuery}&maxResults=10`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const listData = await listResponse.json();

    if (!listData.messages || listData.messages.length === 0) {
      console.log('📭 No new Elementor emails found');
      return Response.json({ status: 'no_new_emails', processed: 0 });
    }

    console.log(`📬 Found ${listData.messages.length} potential Elementor emails`);

    let processedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    // =============================================
    // STEP 2: Process each email
    // =============================================
    for (const msg of listData.messages) {
      try {
        // Fetch full email
        const emailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        const emailData = await emailResponse.json();

        // Check if already processed (using label or internal tracking)
        const labels = emailData.labelIds || [];
        // Skip if already read and starred (our "processed" marker)
        // We'll use a different approach - check by email content in CRM

        // Extract email body
        const emailBody = extractEmailBody(emailData);
        if (!emailBody) {
          console.log(`⏭️ Email ${msg.id}: No body content`);
          continue;
        }

        console.log(`📧 Processing email ${msg.id}`);
        console.log(`📝 Body preview: ${emailBody.substring(0, 200)}...`);

        // Extract subject from headers for logging
        const subjectHeader = emailData.payload?.headers?.find(h => h.name.toLowerCase() === 'subject');
        const emailSubject = subjectHeader ? subjectHeader.value : '(no subject)';
        console.log(`📌 Subject: ${emailSubject}`);

        // Check if this looks like a lead form submission
        const isLeadEmail = emailBody.includes('מתעניין') || 
                            emailBody.includes('מתעניינת') ||
                            emailBody.includes('שם פרטי') ||
                            emailBody.includes('טלפון') ||
                            emailBody.includes('אימייל') ||
                            emailBody.includes('form_name') ||
                            emailBody.includes('Elementor');

        if (!isLeadEmail) {
          console.log(`⏭️ Email ${msg.id}: Not a lead form email`);
          continue;
        }

        // =============================================
        // STEP 3: Use AI to extract lead data from email
        // =============================================
        const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `אתה מנתח מיילים של טפסי לידים מאתר. חלץ את פרטי הליד מהמייל הבא.
חשוב: חלץ רק שדות שבאמת מופיעים בטקסט. אם שדה לא מופיע, החזר null.

תוכן המייל:
${emailBody}

חלץ את הנתונים בפורמט JSON.`,
          response_json_schema: {
            type: "object",
            properties: {
              full_name: { type: "string", description: "שם מלא של הליד" },
              first_name: { type: "string", description: "שם פרטי" },
              email: { type: "string", description: "כתובת אימייל" },
              phone: { type: "string", description: "מספר טלפון" },
              course_name: { type: "string", description: "שם הקורס או תחום עניין" },
              message: { type: "string", description: "הודעה חופשית" },
              is_lead_form: { type: "boolean", description: "האם זה באמת טופס ליד ולא מייל אחר" }
            }
          }
        });

        console.log('🧠 AI extraction:', JSON.stringify(extractionResult, null, 2));

        // Consider it a lead if AI says so OR if we have at least name+phone or name+email
        const hasLeadData = extractionResult && (
          extractionResult.is_lead_form === true ||
          (extractionResult.full_name && (extractionResult.phone || extractionResult.email)) ||
          (extractionResult.first_name && (extractionResult.phone || extractionResult.email))
        );

        if (!hasLeadData) {
          console.log(`⏭️ Email ${msg.id}: No usable lead data found`);
          continue;
        }

        const leadData = extractionResult;

        // Build full name
        const fullName = leadData.full_name || 
                         [leadData.first_name, ''].filter(Boolean).join(' ').trim() || 
                         '';

        if (!fullName && !leadData.email && !leadData.phone) {
          console.log(`⏭️ Email ${msg.id}: No identifiable lead info extracted`);
          continue;
        }

        processedCount++;

        // =============================================
        // STEP 4: Check if lead already exists in CRM
        // =============================================
        let existingStudent = null;

        // Search by email
        if (leadData.email) {
          const byEmail = await base44.asServiceRole.entities.Student.filter({ email: leadData.email.toLowerCase().trim() });
          if (byEmail && byEmail.length > 0) {
            existingStudent = byEmail[0];
            console.log(`✅ Found existing student by email: ${existingStudent.full_name}`);
          }
        }

        // Search by phone
        if (!existingStudent && leadData.phone) {
          const cleanPhone = normalizePhone(leadData.phone);
          const phoneVariants = getPhoneVariants(cleanPhone);
          
          for (const variant of phoneVariants) {
            const byPhone = await base44.asServiceRole.entities.Student.filter({ phone: variant });
            if (byPhone && byPhone.length > 0) {
              existingStudent = byPhone[0];
              console.log(`✅ Found existing student by phone: ${existingStudent.full_name}`);
              break;
            }
          }
        }

        // Search by name
        if (!existingStudent && fullName) {
          const byName = await base44.asServiceRole.entities.Student.filter({ full_name: fullName });
          if (byName && byName.length > 0) {
            existingStudent = byName[0];
            console.log(`✅ Found existing student by name: ${existingStudent.full_name}`);
          }
        }

        if (existingStudent) {
          console.log(`⏭️ Lead "${fullName || leadData.email}" already exists in CRM (ID: ${existingStudent.id})`);
          skippedCount++;
          
          // Star the email to mark as processed (only in live mode)
          if (!dryRun) await markEmailProcessed(accessToken, msg.id);
          continue;
        }

        // In dry_run mode, just log what would be created
        if (dryRun) {
          console.log(`🔎 [DRY RUN] Would create lead: ${fullName || leadData.email || leadData.phone} | Course: ${leadData.course_name || 'N/A'}`);
          createdCount++;
          continue;
        }

        // =============================================
        // STEP 5: Create new lead in CRM
        // =============================================
        console.log(`✨ Creating missing lead: ${fullName || leadData.email || leadData.phone}`);

        // Find matching course
        let course = null;
        if (leadData.course_name) {
          const courses = await base44.asServiceRole.entities.Course.list();
          // Try exact match first
          course = courses.find(c => c.name === leadData.course_name);
          // Try partial match
          if (!course) {
            const lowerCourseName = leadData.course_name.toLowerCase();
            course = courses.find(c => 
              c.name && (c.name.toLowerCase().includes(lowerCourseName) || 
                         lowerCourseName.includes(c.name.toLowerCase()))
            );
          }
        }

        // Normalize phone for storage
        let storedPhone = '';
        if (leadData.phone) {
          storedPhone = normalizePhone(leadData.phone);
          if (storedPhone.startsWith('972')) {
            storedPhone = '0' + storedPhone.substring(3);
          }
        }

        const studentData = {
          full_name: fullName || leadData.email || storedPhone,
          email: leadData.email?.toLowerCase().trim() || null,
          phone: storedPhone || null,
          status: 'ליד חדש',
          lead_source: 'אתר',
          last_contact_date: new Date().toISOString(),
          notes: `🤖 נוצר אוטומטית ע"י רשת ביטחון (ליד ממייל Elementor)\n${leadData.message || ''}`
        };

        if (course) {
          studentData.course_id = course.id;
          studentData.course_name = course.name;
          studentData.courses = [{
            course_id: course.id,
            course_name: course.name,
            status: 'ליד חדש',
            registration_date: new Date().toISOString().split('T')[0]
          }];
        }

        const newStudent = await base44.asServiceRole.entities.Student.create(studentData);
        console.log(`✅ New lead created: ${newStudent.full_name} (ID: ${newStudent.id})`);
        createdCount++;

        // =============================================
        // STEP 6: Create introduction task
        // =============================================
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 2);

        await base44.asServiceRole.entities.Task.create({
          name: 'שיחת היכרות',
          description: `ליד שנקלט מרשת ביטחון (מייל Elementor)\n${fullName}\n${leadData.course_name || ''}`,
          status: 'ממתין',
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          student_id: newStudent.id,
          student_name: newStudent.full_name
        });

        console.log('✅ Introduction task created');

        // =============================================
        // STEP 7: Send WhatsApp via Queue
        // =============================================
        if (storedPhone) {
          let whatsappNumber = storedPhone;
          if (whatsappNumber.startsWith('0')) {
            whatsappNumber = '972' + whatsappNumber.substring(1);
          }

          const courseName = course ? course.name : 'הקורס';
          const firstName = leadData.first_name || fullName.split(' ')[0] || 'שלום';
          const message = `הי ${firstName}, קיבלנו את פנייתך בנוגע ל${courseName}. ניצור איתך קשר בהקדם💜 סטודיו פנטהריי`;

          await base44.asServiceRole.entities.WhatsappQueue.create({
            subscriber_id: newStudent.id,
            subscriber_name: newStudent.full_name,
            whatsapp_number: whatsappNumber,
            message_content: message,
            status: 'pending'
          });

          console.log('✅ WhatsApp queued for sending');
        }

        // Mark email as processed
        await markEmailProcessed(accessToken, msg.id);

      } catch (emailError) {
        console.error(`❌ Error processing email ${msg.id}:`, emailError.message);
      }
    }

    console.log(`=== ✅ gmailLeadWatcher Complete ===`);
    console.log(`📊 Results: ${processedCount} processed, ${createdCount} created, ${skippedCount} already existed`);

    return Response.json({
      status: 'success',
      processed: processedCount,
      created: createdCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error('=== ❌ ERROR in gmailLeadWatcher ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// =============================================
// HELPER FUNCTIONS
// =============================================

function extractEmailBody(emailData) {
  const payload = emailData.payload;
  if (!payload) return '';

  // Try to get text/plain or text/html body
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Check parts
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback to HTML
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        const html = decodeBase64Url(part.body.data);
        // Strip HTML tags for simpler processing
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
    // Check nested parts (multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      if (part.parts) {
        for (const subPart of part.parts) {
          if (subPart.mimeType === 'text/plain' && subPart.body && subPart.body.data) {
            return decodeBase64Url(subPart.body.data);
          }
        }
      }
    }
  }

  return '';
}

function decodeBase64Url(data) {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-\.\(\)\+]/g, '');
}

function getPhoneVariants(phone) {
  const variants = new Set();
  variants.add(phone);

  if (phone.startsWith('972')) {
    variants.add('0' + phone.substring(3));
    variants.add('+' + phone);
  } else if (phone.startsWith('0')) {
    variants.add('972' + phone.substring(1));
    variants.add('+972' + phone.substring(1));
  }

  return [...variants];
}

async function markEmailProcessed(accessToken, messageId) {
  try {
    // Add STARRED label to mark as processed
    await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          addLabelIds: ['STARRED']
        })
      }
    );
  } catch (e) {
    console.error('⚠️ Failed to mark email as processed:', e.message);
  }
}