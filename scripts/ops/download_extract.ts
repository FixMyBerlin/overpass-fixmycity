#!/usr/bin/env bun

import { $ } from "bun";
import { basename, join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { getExtractSourceEnv, getOpsPathsEnv } from "../config/env";
import { log, requireCommand, setEnvVar, withBackoff } from "./lib";

$.throws(true);

requireCommand("curl");
requireCommand("sha256sum");
requireCommand("osmium");

const args = Bun.argv.slice(2);
let forceRefresh = false;
let refreshMetadata = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--force-refresh") {
    forceRefresh = true;
    continue;
  }
  if (arg === "--refresh-metadata") {
    refreshMetadata = true;
    continue;
  }
  throw new Error(`Unknown argument: ${arg}`);
}

const { OVERPASS_CACHE_ROOT } = getOpsPathsEnv();
const { OVERPASS_EXTRACT_URL } = getExtractSourceEnv();
const extractUrl = OVERPASS_EXTRACT_URL;

const artifactDir = join(OVERPASS_CACHE_ROOT, "extracts");
const fileName = basename(extractUrl);
const manifestFile = join(artifactDir, `${fileName}.manifest`);
const extractFile = join(artifactDir, fileName);

mkdirSync(artifactDir, { recursive: true });

if (existsSync(extractFile) && !forceRefresh) {
  log(`Local extract cache exists. Reusing ${extractFile}.`);
} else {
  log(
    forceRefresh
      ? "Force refresh requested; downloading extract again."
      : "No cached extract found; performing one-time download.",
  );
  await withBackoff(4, 15, async () => {
    await $`curl -fL --retry 3 --retry-delay 5 -o ${`${extractFile}.tmp`} ${extractUrl}`;
  });
  await $`mv ${`${extractFile}.tmp`} ${extractFile}`;
}

const sha256 = (await $`sha256sum ${extractFile}`.text()).trim().split(/\s+/)[0];
const dateUtc = new Date().toISOString();
let etag = "";
let lastModified = "";

if (forceRefresh || refreshMetadata || !existsSync(manifestFile)) {
  const headers = await $`curl -sI ${extractUrl}`.nothrow().text();
  const etagMatch = headers.match(/^etag:\s*(.+)$/im);
  const modifiedMatch = headers.match(/^last-modified:\s*(.+)$/im);
  etag = (etagMatch?.[1] ?? "").replace(/\r/g, "").trim();
  lastModified = (modifiedMatch?.[1] ?? "").replace(/\r/g, "").trim();
} else {
  log("Skipping upstream metadata request to minimize external load.");
}

let importFile = extractFile;
let importSha256 = sha256;

if (extractFile.endsWith(".osm.pbf")) {
  const bz2File = extractFile.replace(/\.osm\.pbf$/, ".osm.bz2");
  if (!existsSync(bz2File) || forceRefresh) {
    log("Converting PBF to BZ2 for Overpass import compatibility.");
    await withBackoff(3, 10, async () => {
      await $`osmium cat ${extractFile} -o ${bz2File}`;
    });
  } else {
    log(`Reusing existing converted BZ2 file ${bz2File}.`);
  }
  importFile = bz2File;
  importSha256 = (await $`sha256sum ${importFile}`.text()).trim().split(/\s+/)[0];
}

const importBaseName = basename(importFile);
const containerFile = `/cache/extracts/${importBaseName}`;

writeFileSync(
  manifestFile,
  [
    `extract_url=${extractUrl}`,
    `cached_file=${extractFile}`,
    `sha256=${sha256}`,
    `import_file=${importFile}`,
    `import_sha256=${importSha256}`,
    `cached_at_utc=${dateUtc}`,
    `etag=${etag}`,
    `last_modified=${lastModified}`,
    "",
  ].join("\n"),
  "utf8",
);

setEnvVar("OVERPASS_PLANET_URL", `file://${containerFile}`);

log("Extract cache ready.");
log(`Manifest written to ${manifestFile}`);
log("OVERPASS_PLANET_URL set to local cache path in infra/docker/.env.");
