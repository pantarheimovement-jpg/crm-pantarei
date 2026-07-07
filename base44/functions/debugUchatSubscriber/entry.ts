import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { phone } = await req.json();
    const token = Deno.env.get('UCHAT_API_TOKEN');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${encodeURIComponent(phone)}`, { headers });
    const infoBody = await infoResp.text();

    return Response.json({ status: infoResp.status, body: infoBody });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});