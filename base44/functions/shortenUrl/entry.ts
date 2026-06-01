import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    // Try TinyURL first (most reliable, no API key needed)
    try {
      const tinyResponse = await fetch(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
      );
      const tinyUrl = await tinyResponse.text();
      if (tinyUrl && tinyUrl.startsWith('http')) {
        return Response.json({ short_url: tinyUrl.trim() });
      }
    } catch (e) {
      console.log('TinyURL failed:', e.message);
    }

    // Fallback: try is.gd
    try {
      const response = await fetch(
        `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`
      );
      const data = await response.json();
      if (data.shorturl) {
        return Response.json({ short_url: data.shorturl });
      }
    } catch (e) {
      console.log('is.gd failed:', e.message);
    }

    // If all fail, return original URL
    return Response.json({ short_url: url, fallback: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});