# Access and Load Protection

Policy: the endpoint `private-overpass.fixmycity.de` is reachable publicly for tool compatibility (Overpass Turbo, QGIS, scripts), but it is meant for FixMyCity only and not announced.

Safeguards in the default setup:

- TLS via Traefik; Overpass itself listens only on `127.0.0.1:8080`.
- Per-IP rate limit `NGINX_CLIENT_REQ_RATE` (`germany.env`: 2 requests/s), 429 when exceeded.
- Concurrency limited to the CPU count, then queue, then 429; query timeout 300 s (image defaults).
- Hard container limits `OVERPASS_CPUS`/`OVERPASS_MEMORY`, so load cannot spill onto other services on the host.
- `robots.txt`/`llms.txt` shipped by the image to keep crawlers away.

If the endpoint attracts outside traffic (public instances now ban heavy users, which pushes them to alternatives), tighten in this order:

1. Lower `NGINX_CLIENT_REQ_RATE` or set `NGINX_CLIENT_CONN_LIMIT`.
2. Traefik IP allowlist middleware for office/VPN/server IPs.
3. Basic auth or a token header at Traefik (breaks Overpass Turbo usage without extra setup).
