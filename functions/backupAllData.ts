import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// פונקציה שמושכת את כל הרשומות עם pagination
async function fetchAllRecords(base44, entityName) {
  const allRecords = [];
  let skip = 0;
  const limit = 1000; // למשוך 1000 רשומות בכל פעם
  
  console.log(`    📥 Fetching ${entityName} with pagination...`);
  
  while (true) {
    const batch = await base44.asServiceRole.entities[entityName].filter({}, '', limit, skip);
    
    if (batch.length === 0) break;
    
    allRecords.push(...batch);
    console.log(`    ✓ Fetched ${batch.length} records (total: ${allRecords.length})`);
    
    if (batch.length < limit) break; // אם קיבלנו פחות מה-limit, אין יותר רשומות
    
    skip += limit;
  }
  
  console.log(`    ✅ Total ${entityName}: ${allRecords.length} records`);
  return allRecords;
}

Deno.serve(async (req) => {
  try {
    console.log('🔄 Starting weekly backup process...');
    
    const base44 = createClientFromRequest(req);
    
    const entityNames = [
      'Student'
    ];

    console.log('🔐 Getting Google Drive access token...');
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    
    if (!accessToken) {
      throw new Error('Google Drive not connected. Please authorize first.');
    }

    // יצירת תיקיית אב אם לא קיימת
    const backupFolderName = 'Pantarhei Backups';
    console.log(`📁 Creating/finding folder: ${backupFolderName}`);
    
    // חיפוש תיקייה קיימת
    let parentFolderId;
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${backupFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    const searchResult = await searchResponse.json();
    
    if (searchResult.files && searchResult.files.length > 0) {
      parentFolderId = searchResult.files[0].id;
      console.log(`✅ Found existing folder: ${parentFolderId}`);
    } else {
      // יצירת תיקייה חדשה
      const createFolderResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: backupFolderName,
            mimeType: 'application/vnd.google-apps.folder'
          })
        }
      );
      const newFolder = await createFolderResponse.json();
      parentFolderId = newFolder.id;
      console.log(`✅ Created new folder: ${parentFolderId}`);
    }

    // יצירת תיקייה לתאריך הנוכחי
    const dateStr = new Date().toISOString().split('T')[0];
    const dateFolderResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: dateStr,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
        })
      }
    );
    const dateFolder = await dateFolderResponse.json();
    const dateFolderId = dateFolder.id;
    console.log(`📅 Created date folder: ${dateStr}`);

    // גיבוי כל אנטיטי לקובץ נפרד
    const results = [];
    
    for (const entityName of entityNames) {
      try {
        console.log(`  ⏳ Backing up ${entityName}...`);
        
        // שימוש בפונקציה עם pagination לוודא שמושכים הכל
        const data = await fetchAllRecords(base44, entityName);
        
        const backupData = {
          entity_name: entityName,
          backup_date: new Date().toISOString(),
          count: data.length,
          records: data
        };

        const jsonContent = JSON.stringify(backupData, null, 2);
        const jsonBlob = new Blob([jsonContent], { type: 'application/json' });

        const metadata = {
          name: `${entityName}.json`,
          mimeType: 'application/json',
          parents: [dateFolderId]
        };

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', jsonBlob);

        const uploadResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData
          }
        );

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${await uploadResponse.text()}`);
        }

        const uploadResult = await uploadResponse.json();
        results.push({
          entity: entityName,
          records: data.length,
          file_id: uploadResult.id,
          status: 'success'
        });
        
        console.log(`  ✅ ${entityName}: ${data.length} records uploaded successfully`);
        
      } catch (error) {
        console.error(`  ❌ Error backing up ${entityName}:`, error.message);
        results.push({
          entity: entityName,
          records: 0,
          status: 'error',
          error: error.message
        });
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + r.records, 0);
    const successCount = results.filter(r => r.status === 'success').length;

    console.log(`✅ Backup completed: ${successCount}/${entityNames.length} entities, ${totalRecords} total records`);

    return Response.json({
      success: true,
      message: 'Weekly backup completed',
      backup_date: new Date().toISOString(),
      folder_name: `${backupFolderName}/${dateStr}`,
      folder_id: dateFolderId,
      entities_backed_up: successCount,
      total_entities: entityNames.length,
      total_records: totalRecords,
      details: results
    });

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});