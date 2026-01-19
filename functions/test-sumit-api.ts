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

    const text = await response.text(); // במקום json נשתמש ב-text כדי לבדוק מה הגיע

    return Response.json({
      status: response.status,
      body_sample: text.slice(0, 300) // נציג רק את ההתחלה
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});