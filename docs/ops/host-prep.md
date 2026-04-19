# Host Preparation Guide

## Goal

Prepare a Docker host for running the Overpass stack with low operational risk and minimal external-service impact.

## Default Provisioning Path (Ansible)

Use the in-repo Ansible automation as the default provisioning and reconciliation path.

1. Configure host and variables:
   - `infra/ansible/inventory/hosts.yml`
   - `infra/ansible/group_vars/all.yml`
2. Run site playbook:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml
```

The site playbook applies:

- baseline host package update/install
- Docker install and service enable/start
- required users/groups and host paths
- monitoring env + `replication-monitor` systemd unit/timer deployment

For validation and dry-run commands, use `infra/ansible/README.md`.

## Required Host Setup

1. Install Docker Engine and Compose plugin.
2. Create a dedicated service user and operations group (optional but recommended).
3. Reserve persistent directories for:
   - Overpass DB data (`OVERPASS_DATA_ROOT`)
   - Traefik ACME storage (`TRAEFIK_ACME_ROOT`, includes `acme.json`)
4. Set OAuth credentials in environment variables (`OVERPASS_OAUTH_USER`, `OVERPASS_OAUTH_PASSWORD`).
5. Ensure firewall defaults deny inbound except explicitly allowed endpoints.
6. Ensure DNS for `OVERPASS_DOMAIN` points to the host before first deployment so ACME issuance succeeds.
7. Allow inbound TCP `80` and `443` for Traefik entrypoints.

## External Impact Policy

- Baseline import download is **one-time** per persistent `/db`.
- Avoid deleting `/db` (or running `docker compose down -v`) for normal local iteration.
- Prefer local DB snapshots/volume restore for iterative testing.
- Avoid aggressive retry loops and keep bounded backoff in update tooling.
