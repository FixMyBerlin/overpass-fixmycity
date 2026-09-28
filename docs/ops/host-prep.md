# Host Preparation

Target: a **dedicated** Ubuntu 24.04 host. For running on a shared host (e.g. the TILDA staging server) see the isolation plan in [docs/status.md](../status.md); do not run the full playbook there, because the `common` role upgrades packages and may reboot.

1. DNS: `OVERPASS_DOMAIN` (see `infra/docker/germany.env`) points to the host.
2. Set the host in `infra/ansible/inventory/hosts.yml` and values in `infra/ansible/group_vars/all.yml` (at least `monitoring_heartbeat_url`).
3. Run the playbook:

   ```bash
   ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml
   ```

   It installs Docker, creates `/srv/overpass/{db,diff,backup,traefik}` (data dirs owned by the container uid 10001) and the `replication-monitor` systemd timer.
4. Clone this repository to `/opt/overpass-fixmycity` and continue with the [runbook](runbook.md).

Firewall: allow inbound 22, 80, 443 only. The Overpass container binds to `127.0.0.1:8080`; public access goes through Traefik.
