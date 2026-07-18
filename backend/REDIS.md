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

## AI generation worker

Start the API and the worker in separate terminals after Redis is running:

```bash
npm run dev
npm run worker:dev
```

AI requests return HTTP `202` with a generation in `queued` status. The worker
processes one job at a time, retries transient failures up to three times, and
updates the generation to `completed` or `failed` in PostgreSQL.
