# CF DNS Manager

Cloudflare Worker providing authenticated API access to Cloudflare DNS management — list zones, manage records (CRUD), health check.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth required) |
| GET | `/zones` | List all Cloudflare zones (50/page) |
| GET | `/dns/list?zone_id=<ID>` | List DNS records for a zone |
| POST | `/dns/add` | Create a new DNS record |
| POST | `/dns/update` | Update an existing DNS record |
| POST | `/dns/delete` | Delete a DNS record |
| GET | `/` | List available endpoints |

## Authentication

All endpoints (except `/health`) require the `X-Echo-API-Key` header.

## Secrets

| Secret | Description |
|--------|-------------|
| `ECHO_API_KEY` | API authentication key |
| `CF_API_TOKEN` | Cloudflare API token with DNS edit permissions |

## Examples

```bash
# List zones
curl https://cf-dns-manager.bmcii1976.workers.dev/zones \
  -H "X-Echo-API-Key: YOUR_KEY"

# List records
curl "https://cf-dns-manager.bmcii1976.workers.dev/dns/list?zone_id=ZONE_ID" \
  -H "X-Echo-API-Key: YOUR_KEY"

# Create record
curl -X POST https://cf-dns-manager.bmcii1976.workers.dev/dns/add \
  -H "X-Echo-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"zone_id":"ZONE_ID","type":"A","name":"sub.example.com","content":"1.2.3.4","ttl":1,"proxied":true}'

# Update record
curl -X POST https://cf-dns-manager.bmcii1976.workers.dev/dns/update \
  -H "X-Echo-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"zone_id":"ZONE_ID","record_id":"RECORD_ID","content":"5.6.7.8"}'

# Delete record
curl -X POST https://cf-dns-manager.bmcii1976.workers.dev/dns/delete \
  -H "X-Echo-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"zone_id":"ZONE_ID","record_id":"RECORD_ID"}'
```

## Deployment

```bash
npx wrangler deploy
echo "YOUR_KEY" | npx wrangler secret put ECHO_API_KEY
echo "YOUR_TOKEN" | npx wrangler secret put CF_API_TOKEN
```
