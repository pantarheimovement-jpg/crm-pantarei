Deno.serve(async () => {
  const SUMIT_TOKEN = Deno.env.get("SUMIT_TOKEN");

  if (!SUMIT_TOKEN) {
    return Response.json({ error: "SUMIT_TOKEN not found in secrets" }, { status: 500 });
  }

  try {
    const response = await fetch('https://app.sumit.co.il/api/Entity?entity=לקוחות', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUMIT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text(); // כדי לבדוק מה חוזר גם אם זה לא JSON

    return Response.json({
      status: response.status,
      body_sample: text.slice(0, 300)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
