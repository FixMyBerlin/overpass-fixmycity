# Operations Runbook

## 1) Initialize Environment

```bash
cp infra/docker/.env.example infra/docker/.env
```

Edit `infra/docker/.env` for host-specific paths and ports.

## 2) One-Time Germany Extract Cache

```bash
bash scripts/ops/download_extract.sh
```

Optional explicit refresh:

```bash
bash scripts/ops/download_extract.sh --force-refresh
```

Optional metadata refresh only (no full file download):

```bash
bash scripts/ops/download_extract.sh --refresh-metadata
```

## 3) Start Stack

```bash
bash scripts/ops/start_stack.sh
```

## 4) Verify Query And Update Signals

```bash
bash tests/smoke/run_smoke.sh
bash scripts/ops/check_update_lag.sh
```

## 5) Stop Stack

```bash
bash scripts/ops/stop_stack.sh
```

## Recovery Notes

- If startup is interrupted during heavy import/update, capture logs and preserve DB volume before retry.
- Prefer restoring a local snapshot over re-downloading large upstream artifacts.
