#!/usr/bin/env bun

import { $ } from "bun"
import { applyComposeEnvToProcessEnv } from "../config/env"
import { ENV_FILE, ROOT_DIR, log, requireCommand } from "./lib"
import path from "node:path"

$.throws(true)

requireCommand("docker")
applyComposeEnvToProcessEnv()

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
log(`Stopping stack with compose files: ${composeFiles.join(", ")}`)
await $`docker compose --env-file ${ENV_FILE} ${composeFiles.flatMap((file) => ["-f", file])} down`
log("Stack stopped.")
