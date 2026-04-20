#!/usr/bin/env bun

import { $ } from "bun"
import path from "node:path"
import { getOverpassTestEnv } from "../../scripts/config/env"

$.throws(true)

const rootDir = path.resolve(import.meta.dir, "../..")
getOverpassTestEnv()

await $`bun ${path.join(rootDir, "tests/smoke/offline_validation.ts")}`
await $`bun ${path.join(rootDir, "scripts/ops/verify_query.ts")}`
await $`bun ${path.join(rootDir, "scripts/ops/check_replication.ts")}`

console.log("Smoke suite passed.")
