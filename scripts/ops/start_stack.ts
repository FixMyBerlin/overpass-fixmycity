#!/usr/bin/env bun

import { $ } from "bun"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import {
  applyComposeEnvToProcessEnv,
  getOauthClientEnv,
  getOpsPathsEnv,
  getOverpassPlanetEnv,
} from "../config/env"
import { ENV_FILE, ROOT_DIR, log, requireCommand } from "./lib"

$.throws(true)

requireCommand("docker")
const { OVERPASS_DATA_ROOT, TRAEFIK_ACME_ROOT } = getOpsPathsEnv()
getOverpassPlanetEnv()
const oauthClientEnv = getOauthClientEnv()
const composeEnv = applyComposeEnvToProcessEnv()

function syncOauthSettingsFile(): void {
  const secretsDir = path.join(OVERPASS_DATA_ROOT, "secrets")
  const settingsPath = path.join(secretsDir, "oauth-settings.json")
  mkdirSync(secretsDir, { recursive: true })

  if (oauthClientEnv.USE_OAUTH_COOKIE_CLIENT !== "yes") {
    if (existsSync(settingsPath)) {
      rmSync(settingsPath)
    }
    return
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
  )
  chmodSync(settingsPath, 0o600)
}

syncOauthSettingsFile()

mkdirSync(path.join(OVERPASS_DATA_ROOT, "db"), {
  recursive: true,
})
mkdirSync(TRAEFIK_ACME_ROOT, { recursive: true })
const acmeFile = path.join(TRAEFIK_ACME_ROOT, "acme.json")
if (!existsSync(acmeFile)) {
  writeFileSync(acmeFile, "", "utf8")
}
chmodSync(acmeFile, 0o600)

function resolveComposeFiles(): string[] {
  const files = [path.join(ROOT_DIR, "infra/docker/docker-compose.yml")]
  const rawExtraFiles = process.env.OVERPASS_COMPOSE_EXTRA_FILES?.trim() ?? ""
  if (rawExtraFiles.length === 0) {
    return files
  }

  for (const entry of rawExtraFiles.split(",")) {
    const candidate = entry.trim()
    if (candidate.length === 0) {
      continue
    }
    files.push(path.isAbsolute(candidate) ? path.normalize(candidate) : path.resolve(ROOT_DIR, candidate))
  }
  return files
}

const composeFiles = resolveComposeFiles()
const composeArgs = ["--env-file", ENV_FILE, ...composeFiles.flatMap((file) => ["-f", file])]

type PlanetSourceFormat = "pbf" | "bz2" | "gz" | "unknown"

const PBF_TO_BZ2_PREPROCESS =
  "mv /db/planet.osm.bz2 /db/planet.osm.pbf && osmium cat -o /db/planet.osm.bz2 /db/planet.osm.pbf && rm /db/planet.osm.pbf"
const DISPATCHER_LOCK_FILES = ["osm3s_areas", "osm3s_osm_base"] as const

function inferFormatFromUrl(planetUrl: string): PlanetSourceFormat {
  const normalized = planetUrl.toLowerCase()
  if (normalized.endsWith(".osm.pbf") || normalized.endsWith(".pbf")) {
    return "pbf"
  }
  if (normalized.endsWith(".osm.bz2") || normalized.endsWith(".bz2")) {
    return "bz2"
  }
  if (normalized.endsWith(".osm.gz") || normalized.endsWith(".gz")) {
    return "gz"
  }
  return "unknown"
}

function resolvePlanetSourceFormat(
  planetUrl: string,
  configuredFormat: string,
): { format: PlanetSourceFormat; source: "override" | "url" } {
  if (configuredFormat && configuredFormat !== "auto") {
    if (configuredFormat === "pbf" || configuredFormat === "bz2" || configuredFormat === "gz") {
      return { format: configuredFormat, source: "override" }
    }
    throw new Error(
      `Invalid OVERPASS_PLANET_SOURCE_FORMAT='${configuredFormat}'. Expected one of auto|pbf|bz2|gz.`,
    )
  }

  return { format: inferFormatFromUrl(planetUrl), source: "url" }
}

function validatePlanetSourceHandling(): void {
  const { format, source } = resolvePlanetSourceFormat(
    composeEnv.OVERPASS_PLANET_URL,
    composeEnv.OVERPASS_PLANET_SOURCE_FORMAT,
  )

  log(
    `Planet source format resolved as '${format}' (${source === "override" ? "OVERPASS_PLANET_SOURCE_FORMAT" : "URL suffix"}). URL: ${composeEnv.OVERPASS_PLANET_URL}`,
  )

  if (format === "unknown") {
    log(
      "Planet source format could not be inferred from URL. Set OVERPASS_PLANET_SOURCE_FORMAT to pbf|bz2|gz for explicit behavior.",
    )
    return
  }

  if (format === "pbf") {
    if (composeEnv.OVERPASS_PLANET_PREPROCESS.trim() !== PBF_TO_BZ2_PREPROCESS) {
      throw new Error(
        `Planet URL format is '${format}', but OVERPASS_PLANET_PREPROCESS is not the expected PBF conversion command. Expected: ${PBF_TO_BZ2_PREPROCESS}`,
      )
    }
    log("Planet preprocess check: using required PBF -> bz2 conversion command.")
    return
  }

  if (composeEnv.OVERPASS_PLANET_PREPROCESS.trim() === PBF_TO_BZ2_PREPROCESS) {
    log(
      `Planet preprocess check: source format '${format}' does not need PBF conversion, but conversion preprocess is configured.`,
    )
  } else {
    log(`Planet preprocess check: source format '${format}' with custom preprocess command.`)
  }
}

async function ensureSingleOverpassWriter(): Promise<void> {
  const output =
    await $`docker ps --filter ancestor=wiktorn/overpass-api:0.7.62 --format {{.Names}}`.text()
  const runningOverpassContainers = output
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  const unexpectedContainers = runningOverpassContainers.filter((name) => name !== "overpass_de")

  if (unexpectedContainers.length > 0) {
    throw new Error(
      `Refusing to start stack while other Overpass containers are running: ${unexpectedContainers.join(", ")}.`,
    )
  }
}

async function isPrimaryOverpassContainerRunning(): Promise<boolean> {
  const output = await $`docker ps --filter name=^overpass_de$ --format {{.Names}}`.text()
  return output
    .split(/\r?\n/)
    .map((value) => value.trim())
    .includes("overpass_de")
}

async function cleanupStaleDispatcherLockFiles(): Promise<void> {
  const dbPath = path.join(OVERPASS_DATA_ROOT, "db", "db")
  if (!existsSync(dbPath)) {
    return
  }
  if (!statSync(dbPath).isDirectory()) {
    return
  }

  if (await isPrimaryOverpassContainerRunning()) {
    log(`Skipping stale lock cleanup because 'overpass_de' is currently running. Path: ${dbPath}`)
    return
  }

  const removed: string[] = []
  for (const filename of DISPATCHER_LOCK_FILES) {
    const filePath = path.join(dbPath, filename)
    if (!existsSync(filePath)) {
      continue
    }
    rmSync(filePath, { force: true })
    removed.push(filePath)
  }

  if (removed.length === 0) {
    log("No stale dispatcher lock files detected.")
    return
  }

  log(
    `Removed stale dispatcher lock files before startup: ${removed.join(", ")}. This prevents startup loops after unclean shutdowns.`,
  )
}

function verifyOauthSettingsFile(): void {
  if (oauthClientEnv.USE_OAUTH_COOKIE_CLIENT !== "yes") {
    return
  }

  const settingsPath = path.join(OVERPASS_DATA_ROOT, "secrets", "oauth-settings.json")
  if (!existsSync(settingsPath)) {
    throw new Error(`Missing OAuth settings file: ${settingsPath}`)
  }

  let parsedSettings: Record<string, unknown>
  try {
    parsedSettings = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>
  } catch (error) {
    throw new Error(`OAuth settings file is not valid JSON: ${settingsPath}`, { cause: error })
  }

  for (const key of ["user", "password", "osm_host", "consumer_url"]) {
    const value = parsedSettings[key]
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`OAuth settings missing required non-empty field '${key}' in ${settingsPath}`)
    }
  }
}

log("Starting Overpass stack with docker compose.")
log(`Compose files: ${composeFiles.join(", ")}`)
await ensureSingleOverpassWriter()
await cleanupStaleDispatcherLockFiles()
verifyOauthSettingsFile()
validatePlanetSourceHandling()
await $`docker compose ${composeArgs} up -d`

log("Waiting for overpass container startup.")
for (let i = 0; i < 30; i += 1) {
  const psOutput = await $`docker compose ${composeArgs} ps`.text()
  if (/^overpass_de\s+.*\s+Up\b/m.test(psOutput)) {
    log("Overpass container is running.")
    process.exit(0)
  }
  await Bun.sleep(10_000)
}

throw new Error("Overpass container did not become running in time.")
