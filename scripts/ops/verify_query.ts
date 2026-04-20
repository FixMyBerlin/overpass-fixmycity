#!/usr/bin/env bun

import { $ } from "bun"
import { getOverpassTestEnv } from "../config/env"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { ROOT_DIR, requireCommand } from "./lib"

$.throws(true)

requireCommand("curl")

const { OVERPASS_TEST_BASE_URL } = getOverpassTestEnv()
const overpassUrl = `${OVERPASS_TEST_BASE_URL}/api/interpreter`
const queryFile = path.join(ROOT_DIR, "tests/smoke/germany_sample_query.overpassql")

if (!existsSync(queryFile)) {
  throw new Error(`Missing query file ${queryFile}`)
}

const query = readFileSync(queryFile, "utf8").replace(/\r?\n/g, " ")
const payloadRaw = await $`curl -sS --get --data-urlencode ${`data=${query}`} ${overpassUrl}`.text()
const payload = JSON.parse(payloadRaw) as { elements?: unknown[] }
const elements = payload.elements ?? []

if (elements.length === 0) {
  throw new Error("No elements returned for Germany sample query")
}

console.log(`elements=${elements.length}`)
console.log("Query verification passed.")
