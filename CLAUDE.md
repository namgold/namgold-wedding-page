# wedding (wedding.namgold.com)

Wedding page for namgold. Child repo of the `namgold.com` parent; see `../CLAUDE.md` for conventions.
Not to be confused with `~/devbox/wedding`, the private planning-notes repo.

## Stack
- `frontend/` — static HTML served by nginx:alpine (no build step)
- `cloudflared` — its own tunnel (token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`) routing wedding.namgold.com → `http://frontend:80`
- No host port published; the tunnel reaches nginx over the compose network.

## Running
```
docker compose up -d --build
docker compose logs cloudflared
docker run --rm --network namgold-wedding_default curlimages/curl -sS -o /dev/null -w "%{http_code}\n" http://frontend:80
```

## Cloudflare setup
- Zero Trust > Networks > Tunnels > tunnel `wedding` > Public Hostname: `wedding.namgold.com` → `HTTP` `frontend:80`
- Remotely managed: the route lives in the dashboard; there is no `config.yml`.
