#!/usr/bin/env bun

import { readFileSync } from "node:fs"
import path from "node:path"

const rootDir = path.resolve(import.meta.dir, "../..")

const fixtureA = JSON.parse(
  readFileSync(path.join(rootDir, "tests/smoke/fixtures/interpreter_response_a.json"), "utf8"),
) as { osm3s?: { timestamp_osm_base?: string }; elements?: unknown[] }
const fixtureB = JSON.parse(
  readFileSync(path.join(rootDir, "tests/smoke/fixtures/interpreter_response_b.json"), "utf8"),
) as { osm3s?: { timestamp_osm_base?: string }; elements?: unknown[] }

const timestampA = fixtureA.osm3s?.timestamp_osm_base ?? ""
const timestampB = fixtureB.osm3s?.timestamp_osm_base ?? ""

if (!timestampA || !timestampB) {
  throw new Error("Missing timestamp_osm_base in fixtures")
}
if (timestampB < timestampA) {
  throw new Error("Fixture validation failed: timestamp moved backwards")
}
if ((fixtureA.elements ?? []).length === 0) {
  throw new Error("Fixture validation failed: empty elements")
}

console.log("Offline validation passed.")
