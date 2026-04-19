#!/usr/bin/env bun

import { $ } from "bun";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ENV_FILE, ROOT_DIR, loadEnv, log, requireCommand } from "./lib";

$.throws(true);

requireCommand("docker");
loadEnv();

if (!process.env.OVERPASS_PLANET_URL) {
  throw new Error("OVERPASS_PLANET_URL is empty. Run scripts/ops/download_extract.ts first.");
}

mkdirSync(path.join(process.env.OVERPASS_DATA_ROOT ?? path.join(ROOT_DIR, ".local/overpass-data"), "db"), {
  recursive: true,
});
mkdirSync(path.join(process.env.OVERPASS_CACHE_ROOT ?? path.join(ROOT_DIR, ".local/cache"), "extracts"), {
  recursive: true,
});

const composeArgs = [
  "--env-file",
  ENV_FILE,
  "-f",
  path.join(ROOT_DIR, "infra/docker/docker-compose.yml"),
];

log("Starting Overpass stack with docker compose.");
await $`docker compose ${composeArgs} up -d`;

log("Waiting for overpass container startup.");
for (let i = 0; i < 30; i += 1) {
  const psOutput = await $`docker compose ${composeArgs} ps`.text();
  if (/^overpass_de\s+.*\s+Up\b/m.test(psOutput)) {
    log("Overpass container is running.");
    process.exit(0);
  }
  await Bun.sleep(10_000);
}

throw new Error("Overpass container did not become running in time.");
