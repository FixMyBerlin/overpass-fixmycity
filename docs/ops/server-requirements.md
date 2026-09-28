# Server Requirements (Germany, meta, no attic)

Sizing from the osm-fr Germany extract (5.9 GB PBF, 2026-09) and the import script's ratio for meta databases (DB ≈ 4.2 × PBF):

| Item | Need |
| --- | --- |
| Database | ~25 GB (+ growth) |
| Backup (same size as DB) | ~25 GB |
| Import download (deleted after import is optional) | ~6 GB |
| Diffs (kept 72 h) + logs | < 5 GB |
| **Disk total** | **≥ 100 GB free, SSD/NVMe** (random I/O bound) |
| CPU | 4 vCPU for import and moderate query load |
| RAM | 8 GB for the container (upstream guidance: 4–8 GB lightly loaded, 16–32 GB with complex queries) |

Numbers for the full planet (upstream README, Q2 2026): meta ~365 GB, areas +30 GB.

Local test profile (Monaco): 1 CPU, 1 GB RAM, ~100 MB DB, import < 1 minute.
