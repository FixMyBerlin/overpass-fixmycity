#!/usr/bin/env bun

import { $ } from "bun"
import { requireCommand } from "./lib"

$.throws(true)

type CliOptions = {
  interpreterUrl: string
  maxLagSeconds: number
  heartbeatUrl?: string
  heartbeatFailUrl?: string
  timeoutSeconds: number
}

const DEFAULT_INTERPRETER_URL = "http://127.0.0.1:8080/api/interpreter"
const DEFAULT_MAX_LAG_SECONDS = 300
const DEFAULT_TIMEOUT_SECONDS = 10

requireCommand("curl")

function usage(): string {
  return [
    "Usage: bun scripts/ops/monitor_replication.ts [options]",
    "",
    "Options:",
    "  --interpreter-url <url>       Overpass /api/interpreter endpoint",
    `  --max-lag-seconds <seconds>   Allowed lag threshold (default: ${DEFAULT_MAX_LAG_SECONDS})`,
    "  --heartbeat-url <url>         OneUptime heartbeat URL to ping on success",
    "  --heartbeat-fail-url <url>    Optional OneUptime URL to ping on failure",
    `  --timeout-seconds <seconds>   curl timeout for status/heartbeat calls (default: ${DEFAULT_TIMEOUT_SECONDS})`,
  ].join("\n")
}

function parsePositiveInt(value: string, fieldName: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${fieldName} must be a positive integer`)
  }
  const numericValue = Number(value)
  if (!Number.isSafeInteger(numericValue) || numericValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer`)
  }
  return numericValue
}

function parseOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    interpreterUrl: DEFAULT_INTERPRETER_URL,
    maxLagSeconds: DEFAULT_MAX_LAG_SECONDS,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === "--interpreter-url") {
      options.interpreterUrl = argv[i + 1] ?? ""
      i += 1
    } else if (arg === "--max-lag-seconds") {
      options.maxLagSeconds = parsePositiveInt(argv[i + 1] ?? "", "max-lag-seconds")
      i += 1
    } else if (arg === "--heartbeat-url") {
      options.heartbeatUrl = argv[i + 1] ?? ""
      i += 1
    } else if (arg === "--heartbeat-fail-url") {
      options.heartbeatFailUrl = argv[i + 1] ?? ""
      i += 1
    } else if (arg === "--timeout-seconds") {
      options.timeoutSeconds = parsePositiveInt(argv[i + 1] ?? "", "timeout-seconds")
      i += 1
    } else if (arg === "--help" || arg === "-h") {
      console.log(usage())
      process.exit(0)
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  return options
}

async function sendHeartbeat(url: string | undefined, timeoutSeconds: number): Promise<void> {
  if (!url) {
    return
  }

  await $`curl -fsS --max-time ${String(timeoutSeconds)} ${url}`.text()
}

async function fetchTimestampFromInterpreter(
  interpreterUrl: string,
  timeoutSeconds: number,
): Promise<string> {
  const query = "[out:json];node(1);out;"
  const raw =
    await $`curl -fsS --max-time ${String(timeoutSeconds)} --get --data-urlencode ${`data=${query}`} ${interpreterUrl}`.text()
  const parsed = JSON.parse(raw) as { osm3s?: { timestamp_osm_base?: string } }
  const timestamp = parsed.osm3s?.timestamp_osm_base ?? ""
  if (!timestamp) {
    throw new Error("Could not parse timestamp_osm_base from /api/interpreter")
  }
  return timestamp
}

async function main(): Promise<void> {
  const options = parseOptions(Bun.argv.slice(2))
  const timestamp = await fetchTimestampFromInterpreter(
    options.interpreterUrl,
    options.timeoutSeconds,
  )
  const baseTime = new Date(timestamp)
  const lagSeconds = Math.floor((Date.now() - baseTime.getTime()) / 1000)

  console.log(`interpreter_url=${options.interpreterUrl}`)
  console.log(`timestamp_osm_base=${timestamp}`)
  console.log(`lag_seconds=${lagSeconds}`)
  console.log(`max_lag_seconds=${options.maxLagSeconds}`)

  if (lagSeconds < 0) {
    await sendHeartbeat(options.heartbeatFailUrl, options.timeoutSeconds)
    throw new Error("Invalid timestamp: in the future")
  }

  if (lagSeconds > options.maxLagSeconds) {
    await sendHeartbeat(options.heartbeatFailUrl, options.timeoutSeconds)
    throw new Error(`Replication lag threshold exceeded: ${lagSeconds} > ${options.maxLagSeconds}`)
  }

  await sendHeartbeat(options.heartbeatUrl, options.timeoutSeconds)
  console.log("Replication lag monitoring check passed.")
}

await main()
