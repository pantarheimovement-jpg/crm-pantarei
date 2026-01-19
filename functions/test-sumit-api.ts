Deno.serve(async () => {
  const SUMIT_TOKEN = Deno.env.get("SUMIT_TOKEN");

  if (!SUMIT_TOKEN) {
    return Response.json({ error: "SUMIT_TOKEN not found in secrets" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.sumit.co.il/crm/schema/listfolders/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Credentials: {
          CompanyID: 333125807,
          APIKey: SUMIT_TOKEN
        }
      })
    });

    const data = await response.json();

    return Response.json({
      status: response.status,
      folders_found: Array.isArray(data?.Folders) ? data.Folders.length : 0,
      preview: data?.Folders?.slice?.(0, 5) || [],
      full_response: data
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
