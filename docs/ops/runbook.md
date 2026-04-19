# Operations Runbook

## 1) Initialize Environment

```bash
cp infra/docker/.env.example infra/docker/.env
```

Edit `infra/docker/.env` for host-specific paths and ports.

## 2) One-Time Germany Extract Cache

```bash
bun scripts/ops/download_extract.ts
```

Optional explicit refresh:

```bash
bun scripts/ops/download_extract.ts --force-refresh
```

Optional metadata refresh only (no full file download):

```bash
bun scripts/ops/download_extract.ts --refresh-metadata
```

## 3) Start Stack

```bash
bun scripts/ops/start_stack.ts
```

## 4) Verify Query And Update Signals

```bash
bun tests/smoke/run_smoke.ts
bun scripts/ops/check_update_lag.ts
```

## 5) Stop Stack

```bash
bun scripts/ops/stop_stack.ts
```

## Recovery Notes

- If startup is interrupted during heavy import/update, capture logs and preserve DB volume before retry.
- Prefer restoring a local snapshot over re-downloading large upstream artifacts.
