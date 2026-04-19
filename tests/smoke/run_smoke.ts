#!/usr/bin/env bun

import { $ } from "bun";
import path from "node:path";

$.throws(true);

const rootDir = path.resolve(import.meta.dir, "../..");
const interpreterUrl = Bun.argv[2] ?? "http://127.0.0.1:8080/api/interpreter";

await $`bun ${path.join(rootDir, "tests/smoke/offline_validation.ts")}`;
await $`bun ${path.join(rootDir, "scripts/ops/verify_query.ts")} ${interpreterUrl}`;
await $`bun ${path.join(rootDir, "scripts/ops/check_replication.ts")} ${interpreterUrl}`;

console.log("Smoke suite passed.");
