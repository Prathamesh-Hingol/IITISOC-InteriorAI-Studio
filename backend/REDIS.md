# Redis setup

## Local development

Start Redis from the backend directory:

```bash
docker compose -f docker-compose.redis.yml up -d
```

The backend defaults to `redis://127.0.0.1:6379` outside production, so no
local environment variable is required. Stop the service with:

```bash
docker compose -f docker-compose.redis.yml down
```

## Managed Redis

Set `REDIS_URL` in the host's environment settings to the provider's TLS URL:

```env
REDIS_URL=rediss://username:password@host:port
```

`REDIS_URL` is required when `NODE_ENV=production`. The API uses this same
connection for Redis-backed rate limits now and BullMQ jobs later.

## Rate-limit policy

| Endpoint | Limit |
| --- | --- |
| All API requests | 300 requests per 15 minutes per IP |
| Upload image | 20 per hour per authenticated user |
| Image generation | 10 per hour per authenticated user |
| Depth, object extraction, drag extraction | 30 per hour per authenticated user |
| Segmentation interactions | 120 per hour per authenticated user |

`/health`, `/api/health`, and `/api/ready` are excluded from the global limit.
Rate-limit counters are stored in Redis and return HTTP `429` when exceeded.
