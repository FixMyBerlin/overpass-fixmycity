#!/usr/bin/env bun

import { $ } from "bun";
import { getOverpassTestEnv } from "../config/env";
import { log, requireCommand } from "./lib";

$.throws(true);

requireCommand("curl");

const { OVERPASS_TEST_BASE_URL, OVERPASS_TEST_REPLICATION_WAIT_MS } = getOverpassTestEnv();
const overpassUrl = `${OVERPASS_TEST_BASE_URL}/api/interpreter`;
const query = "[out:json];node(1);out;";

log(`Checking replication timestamps from ${overpassUrl}`);
const responseA = await $`curl -sS --get --data-urlencode ${`data=${query}`} ${overpassUrl}`.text();
await Bun.sleep(OVERPASS_TEST_REPLICATION_WAIT_MS);
const responseB = await $`curl -sS --get --data-urlencode ${`data=${query}`} ${overpassUrl}`.text();

const a = JSON.parse(responseA) as { osm3s?: { timestamp_osm_base?: string } };
const b = JSON.parse(responseB) as { osm3s?: { timestamp_osm_base?: string } };
const timestampA = a.osm3s?.timestamp_osm_base ?? "";
const timestampB = b.osm3s?.timestamp_osm_base ?? "";

console.log(`timestamp_a=${timestampA}`);
console.log(`timestamp_b=${timestampB}`);

if (!timestampA || !timestampB) {
  throw new Error("Missing timestamp_osm_base in response");
}
if (timestampB < timestampA) {
  throw new Error("timestamp_osm_base moved backwards");
}

console.log("Replication timestamp check passed.");
