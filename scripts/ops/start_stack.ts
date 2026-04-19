#!/usr/bin/env bun

import { $ } from "bun";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getOpsPathsEnv, getOverpassPlanetEnv } from "../config/env";
import { ENV_FILE, ROOT_DIR, log, requireCommand } from "./lib";

$.throws(true);

requireCommand("docker");
const { OVERPASS_DATA_ROOT, OVERPASS_CACHE_ROOT, TRAEFIK_ACME_ROOT } = getOpsPathsEnv();
getOverpassPlanetEnv();

mkdirSync(path.join(OVERPASS_DATA_ROOT, "db"), {
  recursive: true,
});
mkdirSync(path.join(OVERPASS_CACHE_ROOT, "extracts"), {
  recursive: true,
});
mkdirSync(TRAEFIK_ACME_ROOT, { recursive: true });
const acmeFile = path.join(TRAEFIK_ACME_ROOT, "acme.json");
if (!existsSync(acmeFile)) {
  writeFileSync(acmeFile, "", "utf8");
}
chmodSync(acmeFile, 0o600);

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
