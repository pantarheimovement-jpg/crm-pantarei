Deno.serve(async () => {
  const SUMIT_TOKEN = Deno.env.get("SUMIT_TOKEN");

  if (!SUMIT_TOKEN) {
    return Response.json({ error: "SUMIT_TOKEN not found in secrets" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.sumit.co.il/crm/data/listentities/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Credentials: {
          CompanyID: 333125807,
          APIKey: SUMIT_TOKEN
        },
        FolderID: 332551083,       // Folder של "לקוחות"
        EntityName: "לקוחות",    // שם הישות לפי התיקיה
        PageSize: 20,             // מספר רשומות להחזיר (לדוגמה)
        PageNumber: 1
      })
    });

    const data = await response.json();

    return Response.json({
      status: response.status,
      raw: data
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
