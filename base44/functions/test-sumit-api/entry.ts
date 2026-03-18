Deno.serve(async () => {
  const SUMIT_TOKEN = Deno.env.get("SUMIT_TOKEN");
  const COMPANY_ID = 333125807;
  const FOLDER_ID = 332551083;

  if (!SUMIT_TOKEN) {
    return Response.json({ error: "SUMIT_TOKEN not found in secrets" }, { status: 500 });
  }

  try {
    const listRes = await fetch("https://api.sumit.co.il/crm/data/listentities/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Credentials: {
          CompanyID: COMPANY_ID,
          APIKey: SUMIT_TOKEN
        },
        Folder: FOLDER_ID,
        PageSize: 10,
        PageNumber: 1
      })
    });

    const listData = await listRes.json();
    const entities = listData?.Data?.Entities || [];

    const details = [];

    for (const entity of entities) {
      const detailRes = await fetch("https://api.sumit.co.il/crm/data/getentity/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Credentials: {
            CompanyID: COMPANY_ID,
            APIKey: SUMIT_TOKEN
          },
          Folder: FOLDER_ID,
          EntityID: entity.ID
        })
      });

      const detailData = await detailRes.json();
      const raw = detailData?.Data;

      details.push({
        id: entity.ID,
        name: raw?.Customer?.Name || null,
        phone: raw?.Customer?.Phone || null,
        email: raw?.Customer?.EmailAddress || null
      });
    }

    return Response.json({ total: details.length, customers: details });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});
