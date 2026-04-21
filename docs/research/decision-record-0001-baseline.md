# ADR 0001: Baseline Runtime Strategy

## Status

Accepted

## Context

We need a Germany-focused Overpass setup in Docker with update tracking, while minimizing repeated external-service load during build and test.

## Decision

We choose the following phased baseline:

1. **Primary path**: start from a Germany source and run Overpass without attic while keeping metadata enabled.
2. **Updater path**: keep replication configuration explicit and observable so minute update behavior can be proven in smoke checks.
3. **Feed candidate path**: evaluate `https://download.openstreetmap.fr/replication/europe/germany/minute/` for Germany-target minutely replication (reference implementation: `https://github.com/osm-fr/osm-extract-replication`).
4. **Fallback path**: if extract-based minute updates cannot be made reliable, switch to a full-planet replication strategy and scope usage to Germany in clients.
5. **External impact policy**: initialize once, then preserve persistent `/db` for iterative testing to avoid repeated upstream bootstrap downloads.
6. **Validation profile**: use Berlin-sized datasets for local reliability and smoke validation on constrained machines; keep Germany as runtime target.

## Consequences

- Faster initial delivery and lower complexity than attic-first deployments.
- Lower storage and CPU footprint during early rollout.
- Requires explicit documentation around no-attic limitations and metadata expectations.
- Requires clear operator controls around volume lifecycle to avoid unnecessary upstream traffic.

## Reliability Gate Evidence

Canary execution on 2026-04-21 validated the Germany minute candidate feed against OSMF minute replication for the available 107-minute window (early operator stop due timebox; target was 120 minutes).

- Candidate feed reachability: 107/107 samples (100%).
- Sequence advancement: no stall above 10 minutes (worst no-advance span: 1 minute).
- Lag vs OSMF timestamp: 0 to 68 seconds; no consecutive samples above 300 seconds.

Result: pass for all defined reliability-gate criteria in the observed window.
