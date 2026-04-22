import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function fetchAllRecords(base44, entityName) {
  const allRecords = [];
  let skip = 0;
  const limit = 1000;
  
  while (true) {
    const batch = await base44.asServiceRole.entities[entityName].filter({}, '', limit, skip);
    if (batch.length === 0) break;
    allRecords.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
  }
  
  return allRecords;
}

function recordsToSheetData(records) {
  if (!records || records.length === 0) return [['No data']];
  
  const allKeys = new Set();
  records.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
  const headers = [...allKeys];
  
  const rows = [headers];
  for (const record of records) {
    rows.push(headers.map(h => {
      const val = record[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }));
  }
  return rows;
}

Deno.serve(async (req) => {
  try {
    console.log('🔄 Starting weekly backup to Google Sheets...');
    
    const base44 = createClientFromRequest(req);
    
    // Use Google Sheets connector (has spreadsheets + drive.file scopes)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    if (!accessToken) {
      throw new Error('Google Sheets not connected.');
    }
    console.log('🔐 Got Sheets access token');

    const entityNames = [
      'Student', 'Subscribers', 'Contact', 'Course', 'Task',
      'Interaction', 'Opportunity', 'Event',
      'NewsletterLogs', 'EmailTemplate', 'WhatsappQueue',
      'Automation', 'LeadStatuses', 'AutomationSettings',
      'GeneralSettings', 'DesignSettings', 'SystemTexts'
    ];

    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toISOString().split('T')[1].substring(0, 5).replace(':', '');

    // Fetch all data first
    console.log('📥 Fetching all entity data...');
    const allData = {};
    let totalRecords = 0;
    
    for (const entityName of entityNames) {
      try {
        const data = await fetchAllRecords(base44, entityName);
        allData[entityName] = data;
        totalRecords += data.length;
        console.log(`  ✅ ${entityName}: ${data.length} records`);
      } catch (error) {
        console.error(`  ❌ ${entityName}: ${error.message}`);
        allData[entityName] = [];
      }
    }

    // Create a new Google Spreadsheet with all entities as sheets
    console.log('📊 Creating Google Spreadsheet...');
    
    const sheets = entityNames.map(name => ({
      properties: { title: name },
      data: [{
        startRow: 0,
        startColumn: 0,
        rowData: recordsToSheetData(allData[name]).map(row => ({
          values: row.map(cell => ({ userEnteredValue: { stringValue: cell } }))
        }))
      }]
    }));

    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `Pantarhei CRM Backup - ${dateStr}`
        },
        sheets: sheets
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create spreadsheet: ${createResponse.status} - ${errorText}`);
    }

    const spreadsheet = await createResponse.json();
    console.log(`✅ Spreadsheet created: ${spreadsheet.spreadsheetId}`);
    console.log(`📎 URL: ${spreadsheet.spreadsheetUrl}`);

    // Also upload a single JSON backup file via Drive (using Sheets token which has drive.file scope)
    console.log('📁 Uploading JSON backup...');
    const jsonBackup = {};
    for (const entityName of entityNames) {
      jsonBackup[entityName] = {
        count: allData[entityName].length,
        records: allData[entityName]
      };
    }
    
    const jsonContent = JSON.stringify({
      backup_date: new Date().toISOString(),
      total_records: totalRecords,
      entities: jsonBackup
    }, null, 2);

    const metadata = {
      name: `Pantarhei_CRM_Backup_${dateStr}.json`,
      mimeType: 'application/json'
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([jsonContent], { type: 'application/json' }));

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      }
    );

    let jsonFileId = null;
    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      jsonFileId = uploadResult.id;
      console.log(`✅ JSON backup uploaded: ${jsonFileId}`);
    } else {
      console.log(`⚠️ JSON upload failed (${uploadResponse.status}), Spreadsheet backup still succeeded`);
    }

    const successEntities = entityNames.filter(n => allData[n].length >= 0).length;

    return Response.json({
      success: true,
      message: 'Weekly backup completed',
      backup_date: new Date().toISOString(),
      spreadsheet_id: spreadsheet.spreadsheetId,
      spreadsheet_url: spreadsheet.spreadsheetUrl,
      json_file_id: jsonFileId,
      entities_backed_up: successEntities,
      total_entities: entityNames.length,
      total_records: totalRecords
    });

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});