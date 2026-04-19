# ADR 0001: Baseline Runtime Strategy

## Status

Accepted

## Context

We need a Germany-focused Overpass setup in Docker with update tracking, while minimizing repeated external-service load during build and test.

## Decision

We choose the following phased baseline:

1. **Primary path**: start from a Germany extract and run Overpass without attic and without metadata.
2. **Updater path**: keep replication configuration explicit and observable so minute update behavior can be proven in smoke checks.
3. **Fallback path**: if extract-based minute updates cannot be made reliable, switch to a full-planet replication strategy and scope usage to Germany in clients.
4. **External impact policy**: baseline artifacts are downloaded once and reused locally for iterative testing unless a forced refresh is explicitly requested.

## Consequences

- Faster initial delivery and lower complexity than attic/meta-first deployments.
- Lower storage and CPU footprint during early rollout.
- Needs explicit documentation around limitations and upgrade path to history/meta.
- Requires robust local caching and clear operator controls to avoid unnecessary upstream traffic.
