const VERSION = '1.1.0';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Echo-API-Key',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, status: 'healthy', service: 'cf-dns-manager', version: VERSION });
    }

    const authKey = request.headers.get('X-Echo-API-Key');
    if (!authKey || authKey !== env.ECHO_API_KEY) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const CF_TOKEN = env.CF_API_TOKEN;
    const headers = {
      'Authorization': `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
    };
    const API = 'https://api.cloudflare.com/client/v4';

    try {
      if (url.pathname === '/zones') {
        const resp = await fetch(`${API}/zones?per_page=50`, { headers });
        const data = await resp.json();
        const zones = (data.result || []).map(z => ({ name: z.name, id: z.id, status: z.status }));
        return json({ ok: true, zones, count: zones.length });
      }

      if (url.pathname === '/dns/list') {
        const zoneId = url.searchParams.get('zone_id');
        if (!zoneId) return json({ ok: false, error: 'zone_id query parameter required' }, 400);
        const resp = await fetch(`${API}/zones/${zoneId}/dns_records?per_page=100`, { headers });
        const data = await resp.json();
        return json({ ok: true, records: data.result || [], total: (data.result || []).length });
      }

      if (url.pathname === '/dns/add' && request.method === 'POST') {
        const contentLength = parseInt(request.headers.get('Content-Length') || '0');
        if (contentLength > 10240) return json({ ok: false, error: 'Payload too large' }, 413);
        const body = await request.json().catch(() => null);
        if (!body) return json({ ok: false, error: 'Invalid JSON body' }, 400);
        const { zone_id, type, name, content, ttl, proxied, priority } = body;
        if (!zone_id || !type || !name || !content) {
          return json({ ok: false, error: 'zone_id, type, name, content are required' }, 400);
        }
        const record = { type, name, content, ttl: ttl || 1, proxied: proxied !== undefined ? proxied : false };
        if (priority !== undefined) record.priority = priority;
        const resp = await fetch(`${API}/zones/${zone_id}/dns_records`, {
          method: 'POST', headers, body: JSON.stringify(record),
        });
        const data = await resp.json();
        return json({ ok: data.success, result: data.result, errors: data.errors });
      }

      if (url.pathname === '/dns/delete' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body) return json({ ok: false, error: 'Invalid JSON body' }, 400);
        const { zone_id, record_id } = body;
        if (!zone_id || !record_id) return json({ ok: false, error: 'zone_id and record_id required' }, 400);
        const resp = await fetch(`${API}/zones/${zone_id}/dns_records/${record_id}`, {
          method: 'DELETE', headers,
        });
        const data = await resp.json();
        return json({ ok: data.success });
      }

      if (url.pathname === '/dns/update' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body) return json({ ok: false, error: 'Invalid JSON body' }, 400);
        const { zone_id, record_id, type, name, content, ttl, proxied } = body;
        if (!zone_id || !record_id) return json({ ok: false, error: 'zone_id and record_id required' }, 400);
        const update = {};
        if (type) update.type = type;
        if (name) update.name = name;
        if (content) update.content = content;
        if (ttl !== undefined) update.ttl = ttl;
        if (proxied !== undefined) update.proxied = proxied;
        const resp = await fetch(`${API}/zones/${zone_id}/dns_records/${record_id}`, {
          method: 'PATCH', headers, body: JSON.stringify(update),
        });
        const data = await resp.json();
        return json({ ok: data.success, result: data.result, errors: data.errors });
      }

      if (url.pathname === '/') {
        return json({
          ok: true,
          service: 'cf-dns-manager',
          version: VERSION,
          endpoints: [
            'GET /health',
            'GET /zones',
            'GET /dns/list?zone_id=<ID>',
            'POST /dns/add {zone_id, type, name, content, ttl?, proxied?, priority?}',
            'POST /dns/update {zone_id, record_id, type?, name?, content?, ttl?, proxied?}',
            'POST /dns/delete {zone_id, record_id}',
          ],
        });
      }

      return json({ ok: false, error: 'Not found' }, 404);
    } catch (err) {
      console.error(JSON.stringify({ error: err.message, stack: err.stack, path: url.pathname }));
      return json({ ok: false, error: 'Internal server error' }, 500);
    }
  },
};
