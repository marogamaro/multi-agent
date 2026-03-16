/**
 * Cloudflare Worker — Anthropic API CORS proxy
 * Solves "Load failed" on iOS Chrome / Safari by adding proper CORS headers.
 * Deploy at: https://workers.cloudflare.com/
 */
export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405 });
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'x-api-key header missing' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Forward to Anthropic (streaming-compatible: pass body stream directly)
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-allow-browser': 'true',
      },
      body: request.body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': '*',
      },
    });
  },
};
