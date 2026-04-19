#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT_DIR, requireCommand } from "./lib";

$.throws(true);

requireCommand("curl");

const overpassUrl = Bun.argv[2] ?? "http://127.0.0.1:8080/api/interpreter";
const queryFile = path.join(ROOT_DIR, "tests/smoke/germany_sample_query.overpassql");

if (!existsSync(queryFile)) {
  throw new Error(`Missing query file ${queryFile}`);
}

const query = readFileSync(queryFile, "utf8").replace(/\r?\n/g, " ");
const payloadRaw = await $`curl -sS --get --data-urlencode ${`data=${query}`} ${overpassUrl}`.text();
const payload = JSON.parse(payloadRaw) as { elements?: unknown[] };
const elements = payload.elements ?? [];

if (elements.length === 0) {
  throw new Error("No elements returned for Germany sample query");
}

console.log(`elements=${elements.length}`);
console.log("Query verification passed.");
