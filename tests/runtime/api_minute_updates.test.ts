#!/usr/bin/env bun

import { test, expect } from "bun:test";

const containerName = process.env.OVERPASS_CONTAINER_NAME ?? "overpass_de";
const waitMs = Number(process.env.OVERPASS_REPLICATION_WAIT_MS ?? "65000");
const query = "[out:json];node(1);out;";
const { $ } = Bun;

type InterpreterResponse = {
  elements?: unknown[];
  osm3s?: { timestamp_osm_base?: string };
};

async function runInterpreterQuery(): Promise<InterpreterResponse> {
  const payload = await $`docker exec ${containerName} wget -q -O - --post-data=${`data=${query}`} http://localhost/api/interpreter`.text();
  return JSON.parse(payload) as InterpreterResponse;
}

test("interpreter endpoint returns JSON with replication timestamp", async () => {
  const response = await runInterpreterQuery();
  expect(typeof response).toBe("object");
  expect(typeof response.osm3s?.timestamp_osm_base).toBe("string");
  expect(Array.isArray(response.elements)).toBe(true);
});

test(
  "replication timestamp does not move backwards over one minute",
  { timeout: waitMs + 30_000 },
  async () => {
  const before = await runInterpreterQuery();
  await Bun.sleep(waitMs);
  const after = await runInterpreterQuery();

  const timestampBefore = before.osm3s?.timestamp_osm_base ?? "";
  const timestampAfter = after.osm3s?.timestamp_osm_base ?? "";

  expect(timestampBefore.length).toBeGreaterThan(0);
  expect(timestampAfter.length).toBeGreaterThan(0);
  expect(timestampAfter >= timestampBefore).toBe(true);
  },
);
