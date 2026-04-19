# ADR 0001: Baseline Runtime Strategy

## Status

Accepted

## Context

We need a Germany-focused Overpass setup in Docker with update tracking, while minimizing repeated external-service load during build and test.

## Decision

We choose the following phased baseline:

1. **Primary path**: start from a Germany source and run Overpass without attic while keeping metadata enabled.
2. **Updater path**: keep replication configuration explicit and observable so minute update behavior can be proven in smoke checks.
3. **Fallback path**: if extract-based minute updates cannot be made reliable, switch to a full-planet replication strategy and scope usage to Germany in clients.
4. **External impact policy**: initialize once, then preserve persistent `/db` for iterative testing to avoid repeated upstream bootstrap downloads.

## Consequences

- Faster initial delivery and lower complexity than attic-first deployments.
- Lower storage and CPU footprint during early rollout.
- Requires explicit documentation around no-attic limitations and metadata expectations.
- Requires clear operator controls around volume lifecycle to avoid unnecessary upstream traffic.
