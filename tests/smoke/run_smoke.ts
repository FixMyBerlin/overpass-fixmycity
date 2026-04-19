#!/usr/bin/env bun

import { $ } from "bun";
import path from "node:path";
import { getOverpassBaseUrlEnv } from "../../scripts/config/env";

$.throws(true);

const rootDir = path.resolve(import.meta.dir, "../..");
const { OVERPASS_BASE_URL } = getOverpassBaseUrlEnv();
const interpreterUrl = `${OVERPASS_BASE_URL}/api/interpreter`;

await $`bun ${path.join(rootDir, "tests/smoke/offline_validation.ts")}`;
await $`bun ${path.join(rootDir, "scripts/ops/verify_query.ts")} ${interpreterUrl}`;
await $`bun ${path.join(rootDir, "scripts/ops/check_replication.ts")} ${interpreterUrl}`;

console.log("Smoke suite passed.");
