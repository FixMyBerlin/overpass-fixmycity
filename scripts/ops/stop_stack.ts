#!/usr/bin/env bun

import { $ } from "bun";
import { ENV_FILE, ROOT_DIR, loadEnv, log, requireCommand } from "./lib";
import path from "node:path";

$.throws(true);

requireCommand("docker");
loadEnv();

await $`docker compose --env-file ${ENV_FILE} -f ${path.join(ROOT_DIR, "infra/docker/docker-compose.yml")} down`;
log("Stack stopped.");
