#!/usr/bin/env bun

import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const ROOT_DIR = path.resolve(import.meta.dir, "../..");
export const ENV_FILE = path.join(ROOT_DIR, "infra/docker/.env");
export const ENV_TEMPLATE = path.join(ROOT_DIR, "infra/docker/.env.example");

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

export function ensureEnvFile(): void {
  if (!existsSync(ENV_FILE)) {
    cpSync(ENV_TEMPLATE, ENV_FILE);
    log(`Created ${ENV_FILE} from template.`);
  }
}

export function loadEnv(): void {
  ensureEnvFile();
  const lines = readFileSync(ENV_FILE, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;

    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1);
    if (key) {
      process.env[key] = value;
    }
  }
}

export function setEnvVar(key: string, value: string): void {
  ensureEnvFile();

  const lines = readFileSync(ENV_FILE, "utf8").split(/\r?\n/);
  let found = false;
  const nextLines = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== "") {
      nextLines.push("");
    }
    nextLines.push(`${key}=${value}`);
  }

  writeFileSync(ENV_FILE, `${nextLines.join("\n").replace(/\n+$/g, "")}\n`, "utf8");
}

export function requireCommand(command: string): void {
  if (!Bun.which(command)) {
    throw new Error(`Missing required command: ${command}`);
  }
}

export async function withBackoff(
  maxAttempts: number,
  initialSleepSeconds: number,
  task: () => Promise<void>,
): Promise<void> {
  let attempt = 1;
  let sleepSeconds = initialSleepSeconds;

  while (true) {
    try {
      await task();
      return;
    } catch (error) {
      if (attempt >= maxAttempts) {
        log(`Command failed after ${attempt} attempts.`);
        throw error;
      }
      log(`Attempt ${attempt} failed. Retrying in ${sleepSeconds}s.`);
      await Bun.sleep(sleepSeconds * 1000);
      attempt += 1;
      sleepSeconds *= 2;
    }
  }
}
