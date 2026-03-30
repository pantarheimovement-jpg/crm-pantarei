import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { headers, rows, title } = await req.json();

    if (!headers || !rows || !title) {
      return Response.json({ error: 'Missing required fields: headers, rows, title' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Create a new spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: title,
          locale: 'iw_IL',
        },
        sheets: [{
          properties: {
            title: 'Sheet1',
            sheetId: 0,
            rightToLeft: true,
          }
        }]
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('Error creating spreadsheet:', errorData);
      return Response.json({ error: 'Failed to create spreadsheet', details: errorData }, { status: 500 });
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl;

    // Write data (headers + rows)
    const allData = [headers, ...rows];

    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: 'Sheet1!A1',
          majorDimension: 'ROWS',
          values: allData,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      console.error('Error writing data:', errorData);
      return Response.json({ error: 'Failed to write data', details: errorData }, { status: 500 });
    }

    // Bold header row + auto-resize
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 } } },
                fields: 'userEnteredFormat(textFormat,backgroundColor)',
              }
            },
            {
              autoResizeDimensions: {
                dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length }
              }
            }
          ]
        }),
      }
    );

    console.log(`Spreadsheet created: ${spreadsheetUrl}`);
    return Response.json({ success: true, url: spreadsheetUrl, spreadsheetId });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});