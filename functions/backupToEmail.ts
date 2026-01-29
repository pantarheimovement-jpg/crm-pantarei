import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { encodeBase64 } from 'jsr:@std/encoding@1.0.5/base64';

// פונקציה שמושכת את כל הרשומות עם pagination
async function fetchAllRecords(base44, entityName) {
  const allRecords = [];
  let skip = 0;
  const limit = 1000;
  
  console.log(`    📥 Fetching ${entityName} with pagination...`);
  
  while (true) {
    const batch = await base44.asServiceRole.entities[entityName].filter({}, '', limit, skip);
    
    if (batch.length === 0) break;
    
    allRecords.push(...batch);
    console.log(`    ✓ Fetched ${batch.length} records (total: ${allRecords.length})`);
    
    if (batch.length < limit) break;
    
    skip += limit;
  }
  
  console.log(`    ✅ Total ${entityName}: ${allRecords.length} records`);
  return allRecords;
}

Deno.serve(async (req) => {
  try {
    console.log('🔄 Starting email backup process...');
    
    const base44 = createClientFromRequest(req);
    
    const entityNames = [
      'Subscribers', 'NewsletterLogs', 'Contact', 'Interaction', 'Opportunity',
      'EmailTemplate', 'Automation', 'Task', 'Event', 'DesignSettings',
      'SystemTexts', 'LeadStatuses', 'AutomationSettings', 'GeneralSettings',
      'Student', 'Course', 'WhatsappQueue'
    ];

    console.log('📦 Collecting data from all entities...');
    
    const backupData = {
      backup_date: new Date().toISOString(),
      app_name: 'Pantarhei CRM',
      entities: {}
    };

    let totalRecords = 0;

    for (const entityName of entityNames) {
      try {
        console.log(`  ⏳ Backing up ${entityName}...`);
        const data = await fetchAllRecords(base44, entityName);
        backupData.entities[entityName] = {
          count: data.length,
          records: data
        };
        totalRecords += data.length;
        console.log(`  ✅ ${entityName}: ${data.length} records`);
      } catch (error) {
        console.error(`  ❌ Error backing up ${entityName}:`, error.message);
        backupData.entities[entityName] = {
          count: 0,
          error: error.message,
          records: []
        };
      }
    }

    // המרה ל-JSON
    const jsonContent = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Pantarhei-CRM-Backup-${dateStr}.json`;

    console.log(`📧 Sending backup email with ${totalRecords} total records...`);

    // קבלת access token ל-Gmail
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    
    if (!accessToken) {
      throw new Error('Gmail not connected');
    }

    // יצירת המייל עם attachment בפורמט RFC 2822
    const boundary = '----=_Part_0_' + Date.now();
    const encoder = new TextEncoder();
    
    // המרה ל-base64 תומך UTF-8 עם Deno standard library
    const jsonBytes = encoder.encode(jsonContent);
    const base64Content = encodeBase64(jsonBytes);
    
    // המרת נושא המייל ל-base64
    const subjectBytes = encoder.encode(`גיבוי שבועי - Pantarhei CRM - ${dateStr}`);
    const subjectBase64 = encodeBase64(subjectBytes);
    
    const emailContent = [
      'Content-Type: multipart/mixed; boundary="' + boundary + '"',
      'MIME-Version: 1.0',
      'To: pantarhei.movement@gmail.com',
      'Subject: =?UTF-8?B?' + subjectBase64 + '?=',
      '',
      '--' + boundary,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      '<div dir="rtl" style="font-family: Arial, sans-serif;">',
      '<h2>🎉 גיבוי שבועי מוצלח!</h2>',
      '<p>התאריך: <strong>' + new Date().toLocaleDateString('he-IL') + '</strong></p>',
      '<p>סה"כ רשומות: <strong>' + totalRecords.toLocaleString('he-IL') + '</strong></p>',
      '<h3>פירוט לפי אנטיטי:</h3>',
      '<ul>',
      ...Object.entries(backupData.entities).map(([name, data]) => 
        `<li><strong>${name}:</strong> ${data.count.toLocaleString('he-IL')} רשומות</li>`
      ),
      '</ul>',
      '<p style="color: #666; font-size: 12px; margin-top: 30px;">',
      'קובץ הגיבוי המלא מצורף למייל זה בפורמט JSON.',
      '</p>',
      '</div>',
      '',
      '--' + boundary,
      'Content-Type: application/json; name="' + fileName + '"',
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment; filename="' + fileName + '"',
      '',
      base64Content,
      '',
      '--' + boundary + '--'
    ].join('\r\n');

    // המרה ל-base64url (URL-safe base64)
    const emailBytes = encoder.encode(emailContent);
    const encodedMessage = encodeBase64(emailBytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // שליחת המייל דרך Gmail API
    const sendResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      }
    );

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      throw new Error(`Gmail API error: ${errorText}`);
    }

    const result = await sendResponse.json();

    console.log(`✅ Backup email sent successfully! Message ID: ${result.id}`);

    return Response.json({
      success: true,
      message: 'Backup sent to email',
      backup_date: backupData.backup_date,
      total_records: totalRecords,
      entities_count: entityNames.length,
      email_message_id: result.id,
      file_name: fileName
    });

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});