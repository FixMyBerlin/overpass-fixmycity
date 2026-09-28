# OneUptime Monitoring

External OneUptime monitors are the paging source. Docker health (`/api/status`, built into the image) is only local diagnostics.

| Monitor | Setup | Alert |
| --- | --- | --- |
| HTTP | `https://<OVERPASS_DOMAIN>/api/status`, every 1 min, expect 200 | 3 consecutive failures |
| TLS | certificate of `https://<OVERPASS_DOMAIN>` | warn < 21 days, critical < 7 days |
| Replication heartbeat | incoming heartbeat, expected every 1 min | no heartbeat for 5 min |

The heartbeat is sent by [scripts/monitor_replication.sh](../../scripts/monitor_replication.sh), run every minute by the Ansible-managed `replication-monitor.timer`. It reads `/api/timestamp` from `127.0.0.1:8080` and pings `ONEUPTIME_HEARTBEAT_URL` only if the lag is below `OVERPASS_MAX_LAG_SECONDS` (default 300). Any failure (API down, lag too high) means no ping, so OneUptime opens the incident.

Values: `monitoring_*` in `infra/ansible/group_vars/all.yml`.

Test after deploy:

```bash
systemctl start replication-monitor.service && journalctl -u replication-monitor.service -n 5 --no-pager
OVERPASS_MAX_LAG_SECONDS=1 /opt/overpass-fixmycity/scripts/monitor_replication.sh   # must fail, no ping
```

For deeper metrics, the image ships Munin plugins (`MUNIN_NODE_CIDR_ALLOW`), not enabled by default.
