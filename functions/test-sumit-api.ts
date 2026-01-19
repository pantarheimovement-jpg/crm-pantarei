Deno.serve(async () => {
  const SUMIT_TOKEN = Deno.env.get("SUMIT_TOKEN");

  if (!SUMIT_TOKEN) {
    return Response.json({ error: "SUMIT_TOKEN not found in secrets" }, { status: 500 });
  }

  try {
    const response = await fetch('https://app.sumit.co.il/api/Entity?entity=Customer', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUMIT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    return Response.json({
      status: response.status,
      count: data?.Entities?.length || 0,
      preview: data?.Entities?.slice?.(0, 3) || []
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});