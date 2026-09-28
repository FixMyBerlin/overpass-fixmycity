# Ansible

Provisions a dedicated Overpass host: base packages (`common`), Docker (`docker`), data directories (`overpass_host`), replication monitor timer (`monitoring`).

Configuration lives in `group_vars/all.yml`; the host in `inventory/hosts.yml`. See [docs/ops/host-prep.md](../../docs/ops/host-prep.md).

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml --syntax-check
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml --check
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml
```

After apply:

```bash
ssh <host> "systemctl list-timers replication-monitor.timer --no-pager"
ssh <host> "systemctl start replication-monitor.service && journalctl -u replication-monitor.service -n 5 --no-pager"
```

The monitor script needs only `bash`, `curl` and GNU `date` on the host.
