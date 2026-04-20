#!/usr/bin/env bun

import { $ } from "bun";
import { applyComposeEnvToProcessEnv } from "../config/env";
import { ENV_FILE, ROOT_DIR, log, requireCommand } from "./lib";
import path from "node:path";

$.throws(true);

requireCommand("docker");
applyComposeEnvToProcessEnv();

await $`docker compose --env-file ${ENV_FILE} -f ${path.join(ROOT_DIR, "infra/docker/docker-compose.yml")} down`;
log("Stack stopped.");
