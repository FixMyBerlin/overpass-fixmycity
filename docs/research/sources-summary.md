# Overpass Research Summary

## Evaluated Inputs

- OSM community thread on Overpass performance and self-hosting pressure.
- SomeoneElse diary entry on building a private Overpass server in 2026.
- OSM-fr Ansible Overpass role.
- OSM-fr Ansible deployment adaptation PR for Overpass server rollout (`https://github.com/osm-fr/ansible-scripts/pull/112`).
  - Source of the link: "Overpass API performance issues - #75 by maelito2000 - Help and support - OpenStreetMap Community Forum" (`https://community.openstreetmap.org/t/overpass-api-performance-issues/140598/75`).
- osm-fr extract replication service/software (`https://github.com/osm-fr/osm-extract-replication`).
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

- Run without attic/history and keep metadata enabled to preserve user and changeset fields.
- Keep minute replication visibility as a first-class validation target.
- Design scripts to be idempotent and resilient to interruptions.
- Use container-native authenticated downloads from Geofabrik and reuse persistent `/db` across local iterations.
- Separate internal Overpass container from internet exposure via proxy and strict access policies.
