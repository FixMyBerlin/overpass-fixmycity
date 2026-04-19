# Overpass Resource Policy Evaluation

This document evaluates whether to use Overpass-internal resource knobs in this workspace, with a bias toward low operational overhead and easy client onboarding.

Related internal docs:

- [Security hardening review](../security/hardening-review.md)
- [Access restriction options](../security/access-options.md)
- [Operations runbook](../ops/runbook.md)

External references:

- [wiktorn/overpass-api container README](https://github.com/wiktorn/Overpass-API/blob/master/README.md)
- [Overpass API manual - Quotas and limits](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)
- [Overpass QL timeout and maxsize behavior](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL)

## Current Scenario (Cleaned Up)

- The service is not planned as a broadly promoted public API.
- In practice, usage can still come from a mixed user set (internal apps and ad-hoc users).
- Initial rollout prioritizes low friction, so access should stay simple and easy to use.
- The primary dataset is Germany only (`OVERPASS_EXTRACT_URL`), which lowers but does not remove misuse risk.
- Existing controls are ingress-first (Traefik routing, allowlist options, and proxy timeouts).

## Challenge To The Scenario

The assumptions are reasonable, but they can fail in specific ways:

- "Not promoted" does not guarantee "not discovered." Traffic can still spike from shared links, tooling defaults, or accidental loops.
- "Germany-only" reduces very large global scans, but many expensive local/area queries are still possible.
- "Easy access" without any fairness guard means one or two noisy clients can degrade service for all users.
- Ingress-only controls (allowlist/timeouts) protect perimeter and connection behavior, but they do not fully enforce per-query fairness inside Overpass.

## Knob-by-Knob Evaluation

### `OVERPASS_FASTCGI_PROCESSES`

- What it does: increases FastCGI worker count in the container.
- Use now: no.
- Why no: not a primary safety control; it is mainly a throughput/concurrency tuning knob.
- When yes becomes meaningful: request queueing appears at the FastCGI layer while CPU/memory are still healthy.

### `OVERPASS_RATE_LIMIT`

- What it does: dispatcher-level per-client fairness control.
- Use now: yes, as an optional minimal safeguard if access is intentionally broad.
- Why yes: this is the lowest-overhead abuse/fairness control inside Overpass and does not require building custom auth.
- Why no (alternative): if access is still effectively constrained to trusted internal clients, leave unset to avoid 429s and client retry behavior.
- Practical recommendation: if service is open beyond a small trusted group, set a conservative value and monitor 429 rates.

### `OVERPASS_TIME`

- What it does: global runtime budget for query admission.
- Use now: no.
- Why no: higher tuning complexity and can reject legitimate heavy queries before you have production baselines.
- When yes becomes meaningful: sustained long-query contention or noisy-neighbor incidents.

### `OVERPASS_SPACE`

- What it does: global memory budget for query admission.
- Use now: no.
- Why no: similar to `OVERPASS_TIME`; best changed with host memory and real query profile data in hand.
- When yes becomes meaningful: memory pressure, OOM risk, or unstable latency under concurrent heavy queries.

### `OVERPASS_MAX_TIMEOUT`

- What it does: container nginx/FastCGI timeout envelope.
- Use now: no explicit override required.
- Why no: current Traefik timeout settings already bound end-user request duration.
- When yes becomes meaningful: explicit timeout alignment policy is needed across client -> Traefik -> container nginx.

## Recommended Baseline For This Workspace

- Keep unset by default:
  - `OVERPASS_FASTCGI_PROCESSES`
  - `OVERPASS_TIME`
  - `OVERPASS_SPACE`
  - `OVERPASS_MAX_TIMEOUT`
- Decide `OVERPASS_RATE_LIMIT` based on actual exposure:
  - If traffic is effectively trusted/internal: keep unset.
  - If service is easy-access for mixed users: enable as the first and only Overpass-internal safeguard.

## Decision Rules (Simple)

- Keep operations simple first.
- Add only one internal knob at a time when a concrete symptom appears.
- Prefer this order of intervention:
  1. Confirm ingress posture and timeout behavior.
  2. Add `OVERPASS_RATE_LIMIT` for fairness if user mix broadens.
  3. Tune `OVERPASS_TIME` and `OVERPASS_SPACE` only after collecting evidence of contention or memory pressure.

## What This Means For "Do As Little As Possible"

Doing as little as possible is still compatible with one meaningful safeguard:

- Minimalist option A (strictly minimal): leave all Overpass internal knobs unset and rely on ingress controls.
- Minimalist option B (recommended for easy-access mixed users): set only `OVERPASS_RATE_LIMIT`; keep all other knobs unset.

Option B provides materially better fairness/risk reduction with low operational burden and no custom service logic.