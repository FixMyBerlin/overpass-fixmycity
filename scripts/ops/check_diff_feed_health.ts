#!/usr/bin/env bun

import { log } from "./lib"

type CliOptions = {
  candidateStateUrl: string
  osmfStateUrl: string
  intervalSeconds: number
  durationMinutes: number
  maxLagSeconds: number
  maxStallMinutes: number
  minReachabilityPct: number
  maxConsecutiveLagSamples: number
}

type FeedState = {
  sequenceNumber: number
  timestamp: string
  timestampMs: number
}

type FeedFetchResult =
  | {
      ok: true
      state: FeedState
    }
  | {
      ok: false
      error: string
    }

type SampleRecord = {
  sample: number
  at: string
  candidate: FeedFetchResult
  osmf: FeedFetchResult
  sequenceLag: number | null
  lagSeconds: number | null
}

const DEFAULT_CANDIDATE_STATE_URL =
  "https://download.openstreetmap.fr/replication/europe/germany/minute/state.txt"
const DEFAULT_OSMF_STATE_URL = "https://planet.openstreetmap.org/replication/minute/state.txt"
const DEFAULT_INTERVAL_SECONDS = 60
const DEFAULT_DURATION_MINUTES = 120
const DEFAULT_MAX_LAG_SECONDS = 300
const DEFAULT_MAX_STALL_MINUTES = 10
const DEFAULT_MIN_REACHABILITY_PCT = 99
const DEFAULT_MAX_CONSECUTIVE_LAG_SAMPLES = 5

function usage(): string {
  return [
    "Usage: bun scripts/ops/check_diff_feed_health.ts [options]",
    "",
    "Options:",
    `  --candidate-state-url <url>            Candidate feed state.txt URL (default: ${DEFAULT_CANDIDATE_STATE_URL})`,
    `  --osmf-state-url <url>                 OSMF feed state.txt URL (default: ${DEFAULT_OSMF_STATE_URL})`,
    `  --interval-seconds <seconds>           Sampling interval (default: ${DEFAULT_INTERVAL_SECONDS})`,
    `  --duration-minutes <minutes>           Total run duration (default: ${DEFAULT_DURATION_MINUTES})`,
    `  --max-lag-seconds <seconds>            Lag threshold for sustained lag test (default: ${DEFAULT_MAX_LAG_SECONDS})`,
    `  --max-stall-minutes <minutes>          Max no-advance time for candidate sequence (default: ${DEFAULT_MAX_STALL_MINUTES})`,
    `  --min-reachability-pct <percent>       Candidate reachability threshold (default: ${DEFAULT_MIN_REACHABILITY_PCT})`,
    `  --max-consecutive-lag-samples <count>  Max consecutive above-threshold lag samples (default: ${DEFAULT_MAX_CONSECUTIVE_LAG_SAMPLES})`,
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

function parsePercentage(value: string, fieldName: string): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`)
  }
  return numeric
}

function parseOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    candidateStateUrl: DEFAULT_CANDIDATE_STATE_URL,
    osmfStateUrl: DEFAULT_OSMF_STATE_URL,
    intervalSeconds: DEFAULT_INTERVAL_SECONDS,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    maxLagSeconds: DEFAULT_MAX_LAG_SECONDS,
    maxStallMinutes: DEFAULT_MAX_STALL_MINUTES,
    minReachabilityPct: DEFAULT_MIN_REACHABILITY_PCT,
    maxConsecutiveLagSamples: DEFAULT_MAX_CONSECUTIVE_LAG_SAMPLES,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--candidate-state-url") {
      options.candidateStateUrl = argv[i + 1] ?? ""
      i += 1
    } else if (arg === "--osmf-state-url") {
      options.osmfStateUrl = argv[i + 1] ?? ""
      i += 1
    } else if (arg === "--interval-seconds") {
      options.intervalSeconds = parsePositiveInt(argv[i + 1] ?? "", "interval-seconds")
      i += 1
    } else if (arg === "--duration-minutes") {
      options.durationMinutes = parsePositiveInt(argv[i + 1] ?? "", "duration-minutes")
      i += 1
    } else if (arg === "--max-lag-seconds") {
      options.maxLagSeconds = parsePositiveInt(argv[i + 1] ?? "", "max-lag-seconds")
      i += 1
    } else if (arg === "--max-stall-minutes") {
      options.maxStallMinutes = parsePositiveInt(argv[i + 1] ?? "", "max-stall-minutes")
      i += 1
    } else if (arg === "--min-reachability-pct") {
      options.minReachabilityPct = parsePercentage(argv[i + 1] ?? "", "min-reachability-pct")
      i += 1
    } else if (arg === "--max-consecutive-lag-samples") {
      options.maxConsecutiveLagSamples = parsePositiveInt(
        argv[i + 1] ?? "",
        "max-consecutive-lag-samples",
      )
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

function parseStateText(rawText: string): FeedState {
  const values = new Map<string, string>()
  for (const line of rawText.split(/\r?\n/)) {
    const separatorIndex = line.indexOf("=")
    if (separatorIndex < 1) {
      continue
    }
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    values.set(key, value)
  }

  const sequenceRaw = values.get("sequenceNumber") ?? ""
  const timestampRaw = (values.get("timestamp") ?? "").replace(/\\/g, "")
  const sequenceNumber = Number(sequenceRaw)
  const timestampMs = Date.parse(timestampRaw)

  if (!Number.isSafeInteger(sequenceNumber)) {
    throw new Error(`Invalid sequenceNumber: ${sequenceRaw}`)
  }
  if (Number.isNaN(timestampMs)) {
    throw new Error(`Invalid timestamp: ${timestampRaw}`)
  }

  return {
    sequenceNumber,
    timestamp: timestampRaw,
    timestampMs,
  }
}

async function fetchState(url: string): Promise<FeedFetchResult> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` }
    }
    const text = await response.text()
    return { ok: true, state: parseStateText(text) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

async function main(): Promise<void> {
  const options = parseOptions(Bun.argv.slice(2))
  const totalSamples = Math.ceil((options.durationMinutes * 60) / options.intervalSeconds)
  const sampleWindowMinutes = options.intervalSeconds / 60

  log(`Reliability gate start: ${totalSamples} samples at ${options.intervalSeconds}s interval`)
  console.log(`candidate_state_url=${options.candidateStateUrl}`)
  console.log(`osmf_state_url=${options.osmfStateUrl}`)
  console.log(`duration_minutes=${options.durationMinutes}`)
  console.log(`interval_seconds=${options.intervalSeconds}`)

  const records: SampleRecord[] = []
  let candidateReachableCount = 0
  let bothReachableCount = 0
  let previousCandidateSequence: number | null = null
  let currentNoAdvanceSamples = 0
  let maxNoAdvanceSamples = 0
  let currentConsecutiveLagSamples = 0
  let maxConsecutiveLagSamples = 0
  let maxLagSeconds = Number.NEGATIVE_INFINITY
  let minLagSeconds = Number.POSITIVE_INFINITY

  for (let sample = 1; sample <= totalSamples; sample += 1) {
    const at = new Date().toISOString()
    const candidate = await fetchState(options.candidateStateUrl)
    const osmf = await fetchState(options.osmfStateUrl)

    let sequenceLag: number | null = null
    let lagSeconds: number | null = null

    if (candidate.ok) {
      candidateReachableCount += 1
      if (
        previousCandidateSequence !== null &&
        candidate.state.sequenceNumber === previousCandidateSequence
      ) {
        currentNoAdvanceSamples += 1
      } else {
        currentNoAdvanceSamples = 0
      }
      if (currentNoAdvanceSamples > maxNoAdvanceSamples) {
        maxNoAdvanceSamples = currentNoAdvanceSamples
      }
      previousCandidateSequence = candidate.state.sequenceNumber
    } else {
      currentNoAdvanceSamples = 0
    }

    if (candidate.ok && osmf.ok) {
      bothReachableCount += 1
      sequenceLag = osmf.state.sequenceNumber - candidate.state.sequenceNumber
      lagSeconds = Math.floor((osmf.state.timestampMs - candidate.state.timestampMs) / 1000)
      if (lagSeconds > maxLagSeconds) {
        maxLagSeconds = lagSeconds
      }
      if (lagSeconds < minLagSeconds) {
        minLagSeconds = lagSeconds
      }
      if (lagSeconds > options.maxLagSeconds) {
        currentConsecutiveLagSamples += 1
      } else {
        currentConsecutiveLagSamples = 0
      }
      if (currentConsecutiveLagSamples > maxConsecutiveLagSamples) {
        maxConsecutiveLagSamples = currentConsecutiveLagSamples
      }
    } else {
      currentConsecutiveLagSamples = 0
    }

    const record: SampleRecord = {
      sample,
      at,
      candidate,
      osmf,
      sequenceLag,
      lagSeconds,
    }
    records.push(record)
    console.log(JSON.stringify(record))

    if (sample < totalSamples) {
      await Bun.sleep(options.intervalSeconds * 1000)
    }
  }

  const candidateReachablePct = (candidateReachableCount / totalSamples) * 100
  const maxNoAdvanceMinutes = maxNoAdvanceSamples * sampleWindowMinutes

  const passReachability = candidateReachablePct >= options.minReachabilityPct
  const passNoStall = maxNoAdvanceMinutes <= options.maxStallMinutes
  const passLag = maxConsecutiveLagSamples <= options.maxConsecutiveLagSamples
  const overallPass = passReachability && passNoStall && passLag

  const summary = {
    startedAt: records[0]?.at ?? "",
    completedAt: new Date().toISOString(),
    totalSamples,
    candidateReachableCount,
    candidateReachablePct: Number(candidateReachablePct.toFixed(2)),
    bothReachableCount,
    maxCandidateNoAdvanceMinutes: Number(maxNoAdvanceMinutes.toFixed(2)),
    lagStatsSeconds:
      bothReachableCount > 0
        ? {
            min: minLagSeconds,
            max: maxLagSeconds,
            maxConsecutiveAboveThresholdSamples: maxConsecutiveLagSamples,
            lagThresholdSeconds: options.maxLagSeconds,
          }
        : null,
    criteria: {
      reachability: {
        pass: passReachability,
        thresholdPct: options.minReachabilityPct,
      },
      noStall: {
        pass: passNoStall,
        thresholdMinutes: options.maxStallMinutes,
      },
      sustainedLag: {
        pass: passLag,
        thresholdSeconds: options.maxLagSeconds,
        maxConsecutiveSamplesAllowed: options.maxConsecutiveLagSamples,
      },
    },
    overallPass,
  }

  console.log(`SUMMARY ${JSON.stringify(summary)}`)
  if (!overallPass) {
    process.exitCode = 1
  }
}

await main()
#!/usr/bin/env bun

import { $ } from "bun"
import { requireCommand } from "./lib"

$.throws(true)

type CliOptions = {
  candidateStateUrl: string
  referenceStateUrl: string
  maxSequenceLag: number
  maxTimestampLagSeconds: number
  timeoutSeconds: number
}

type FeedState = {
  sequenceNumber: number
  timestamp: string
}

const DEFAULT_CANDIDATE_STATE_URL =
  "https://download.openstreetmap.fr/replication/europe/germany/minute/state.txt"
const DEFAULT_REFERENCE_STATE_URL = "https://planet.openstreetmap.org/replication/minute/state.txt"
const DEFAULT_MAX_SEQUENCE_LAG = 10
const DEFAULT_MAX_TIMESTAMP_LAG_SECONDS = 300
const DEFAULT_TIMEOUT_SECONDS = 15

requireCommand("curl")

function usage(): string {
  return [
    "Usage: bun scripts/ops/check_diff_feed_health.ts [options]",
    "",
    "Options:",
    `  --candidate-state-url <url>      Candidate feed state.txt URL (default: ${DEFAULT_CANDIDATE_STATE_URL})`,
    `  --reference-state-url <url>      Reference feed state.txt URL (default: ${DEFAULT_REFERENCE_STATE_URL})`,
    `  --max-sequence-lag <n>           Allowed sequence delta vs reference (default: ${DEFAULT_MAX_SEQUENCE_LAG})`,
    `  --max-timestamp-lag-seconds <n>  Allowed timestamp lag vs reference in seconds (default: ${DEFAULT_MAX_TIMESTAMP_LAG_SECONDS})`,
    `  --timeout-seconds <n>            curl timeout for state fetches (default: ${DEFAULT_TIMEOUT_SECONDS})`,
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
    candidateStateUrl: DEFAULT_CANDIDATE_STATE_URL,
    referenceStateUrl: DEFAULT_REFERENCE_STATE_URL,
    maxSequenceLag: DEFAULT_MAX_SEQUENCE_LAG,
    maxTimestampLagSeconds: DEFAULT_MAX_TIMESTAMP_LAG_SECONDS,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === "--candidate-state-url") {
      options.candidateStateUrl = argv[i + 1] ?? ""
      i += 1
    } else if (arg === "--reference-state-url") {
      options.referenceStateUrl = argv[i + 1] ?? ""
      i += 1
    } else if (arg === "--max-sequence-lag") {
      options.maxSequenceLag = parsePositiveInt(argv[i + 1] ?? "", "max-sequence-lag")
      i += 1
    } else if (arg === "--max-timestamp-lag-seconds") {
      options.maxTimestampLagSeconds = parsePositiveInt(
        argv[i + 1] ?? "",
        "max-timestamp-lag-seconds",
      )
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

async function fetchState(stateUrl: string, timeoutSeconds: number): Promise<FeedState> {
  const raw = await $`curl -fsSL --max-time ${String(timeoutSeconds)} ${stateUrl}`.text()
  const sequenceMatch = raw.match(/^sequenceNumber=(\d+)$/m)
  const timestampMatch = raw.match(/^timestamp=(.+Z)$/m)

  if (!sequenceMatch || !timestampMatch) {
    throw new Error(`Failed to parse sequence/timestamp from state file: ${stateUrl}`)
  }

  const timestamp = timestampMatch[1].replace(/\\:/g, ":")
  const parsedTimestamp = new Date(timestamp)
  if (Number.isNaN(parsedTimestamp.getTime())) {
    throw new Error(`Invalid timestamp in state file ${stateUrl}: ${timestamp}`)
  }

  return {
    sequenceNumber: Number(sequenceMatch[1]),
    timestamp,
  }
}

async function main(): Promise<void> {
  const options = parseOptions(Bun.argv.slice(2))
  const [candidate, reference] = await Promise.all([
    fetchState(options.candidateStateUrl, options.timeoutSeconds),
    fetchState(options.referenceStateUrl, options.timeoutSeconds),
  ])

  const sequenceLag = Math.max(0, reference.sequenceNumber - candidate.sequenceNumber)
  const timestampLagSeconds = Math.max(
    0,
    Math.floor(
      (new Date(reference.timestamp).getTime() - new Date(candidate.timestamp).getTime()) / 1000,
    ),
  )

  console.log(`candidate_state_url=${options.candidateStateUrl}`)
  console.log(`reference_state_url=${options.referenceStateUrl}`)
  console.log(`candidate_sequence=${candidate.sequenceNumber}`)
  console.log(`reference_sequence=${reference.sequenceNumber}`)
  console.log(`sequence_lag=${sequenceLag}`)
  console.log(`max_sequence_lag=${options.maxSequenceLag}`)
  console.log(`candidate_timestamp=${candidate.timestamp}`)
  console.log(`reference_timestamp=${reference.timestamp}`)
  console.log(`timestamp_lag_seconds=${timestampLagSeconds}`)
  console.log(`max_timestamp_lag_seconds=${options.maxTimestampLagSeconds}`)

  if (sequenceLag > options.maxSequenceLag) {
    throw new Error(`Sequence lag threshold exceeded: ${sequenceLag} > ${options.maxSequenceLag}`)
  }
  if (timestampLagSeconds > options.maxTimestampLagSeconds) {
    throw new Error(
      `Timestamp lag threshold exceeded: ${timestampLagSeconds} > ${options.maxTimestampLagSeconds}`,
    )
  }

  console.log("Diff feed health check passed.")
}

await main()
