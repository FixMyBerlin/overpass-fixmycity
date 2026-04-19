# Overpass Research Summary

## Evaluated Inputs

- OSM community thread on Overpass performance and self-hosting pressure.
- SomeoneElse diary entry on building a private Overpass server in 2026.
- OSM-fr Ansible Overpass role.
- OSMF Chef cookbook for official Overpass deployment patterns.

## Core Findings

1. Overpass setup is operationally sensitive and harder than typical single-service Docker apps.
2. Storage amplification is significant: regional extracts can still expand to very large database footprints.
3. Minutely replication requires careful updater behavior and resilient restart handling.
4. Existing automation references are useful but not uniformly modern:
   - Chef provides production patterns and maintenance workflows.
   - Ansible role shows decomposition patterns but contains older package assumptions.
5. Public exposure without access controls can cause abuse or unintended load.

## Implications For This Repository

- Start with no attic/history and no meta data for baseline reliability.
- Keep minute replication visibility as a first-class validation target.
- Design scripts to be idempotent and resilient to interruptions.
- Prefer cache-first ingestion to avoid repeated load on Geofabrik and other upstream services.
- Separate internal Overpass container from internet exposure via proxy and strict access policies.
