Deno.serve(async () => {
  const SUMIT_TOKEN = Deno.env.get("SUMIT_TOKEN");

  if (!SUMIT_TOKEN) {
    return Response.json({ error: "SUMIT_TOKEN not found in secrets" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.sumit.co.il/crm/search/advanced/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Credentials: {
          CompanyID: 333125807,
          APIKey: SUMIT_TOKEN
        },
        FolderID: 332551083, // תיקיית לקוחות
        PageSize: 5,
        PageNumber: 1
      })
    });

    const data = await response.json();

    const preview = (data?.Data?.Entities || []).map((e) => ({
      id: e.ID,
      name: e.Name,
      email: e.Email,
      phone: e.Phone
    }));

    return Response.json({
      status: response.status,
      total: data?.Data?.Total || 0,
      customers_preview: preview,
      raw: data
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
