#!/usr/bin/env bun

import { $ } from "bun";
import { requireCommand } from "./lib";

$.throws(true);

requireCommand("curl");

const statusUrl = Bun.argv[2] ?? "http://127.0.0.1:8080/api/status";
const raw = await $`curl -sS ${statusUrl}`.text();

const match = raw.match(/(?:timestamp_osm_base=|osm_base=")([0-9T:\-Z]+)(?:"|$)/);
if (!match) {
  console.log(raw);
  throw new Error("Could not parse timestamp_osm_base from /api/status");
}

const timestamp = match[1];
const baseTime = new Date(timestamp);
const lagSeconds = Math.floor((Date.now() - baseTime.getTime()) / 1000);

console.log(`timestamp_osm_base=${timestamp}`);
console.log(`lag_seconds=${lagSeconds}`);

if (lagSeconds < 0) {
  throw new Error("Invalid timestamp: in the future");
}
