#!/usr/bin/env bun

import { $ } from "bun";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getOauthClientEnv, getOpsPathsEnv, getOverpassPlanetEnv } from "../config/env";
import { ENV_FILE, ROOT_DIR, log, requireCommand } from "./lib";

$.throws(true);

requireCommand("docker");
const { OVERPASS_DATA_ROOT, TRAEFIK_ACME_ROOT } = getOpsPathsEnv();
getOverpassPlanetEnv();
const oauthClientEnv = getOauthClientEnv();

function syncOauthSettingsFile(): void {
  const secretsDir = path.join(OVERPASS_DATA_ROOT, "secrets");
  const settingsPath = path.join(secretsDir, "oauth-settings.json");
  mkdirSync(secretsDir, { recursive: true });

  if (oauthClientEnv.USE_OAUTH_COOKIE_CLIENT !== "yes") {
    if (existsSync(settingsPath)) {
      rmSync(settingsPath);
    }
    return;
  }

  writeFileSync(
    settingsPath,
    `${JSON.stringify(
      {
        user: oauthClientEnv.OVERPASS_OAUTH_USER,
        password: oauthClientEnv.OVERPASS_OAUTH_PASSWORD,
        osm_host: oauthClientEnv.OVERPASS_OAUTH_OSM_HOST,
        consumer_url: oauthClientEnv.OVERPASS_OAUTH_CONSUMER_URL,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  chmodSync(settingsPath, 0o600);
}

syncOauthSettingsFile();

mkdirSync(path.join(OVERPASS_DATA_ROOT, "db"), {
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
