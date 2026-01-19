Deno.serve(async () => {
  const SUMIT_TOKEN = Deno.env.get("SUMIT_TOKEN");

  if (!SUMIT_TOKEN) {
    return Response.json({ error: "SUMIT_TOKEN not found in secrets" }, { status: 500 });
  }

  const possibleEntities = [
    "Customer",
    "Customers",
    "Client",
    "Clients",
    "לקוח",
    "לקוחות",
    "Student",
    "Students",
    "CustomerCard",
    "CustomerCards"
  ];

  const results = [];

  for (const entity of possibleEntities) {
    try {
      const res = await fetch(`https://app.sumit.co.il/api/Entity?entity=${encodeURIComponent(entity)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUMIT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const text = await res.text();

      results.push({
        entity,
        status: res.status,
        is_json: text.trim().startsWith("{") || text.trim().startsWith("["),
        snippet: text.slice(0, 100)
      });

    } catch (e) {
      results.push({ entity, error: e.message });
    }
  }

  return Response.json({ tried: possibleEntities.length, results });
});
