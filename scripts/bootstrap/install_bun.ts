#!/usr/bin/env bun

import { $ } from "bun";

$.throws(true);

if (Bun.which("bun")) {
  const version = await $`bun --version`.text();
  console.log(`Bun is already installed (v${version.trim()}).`);
  process.exit(0);
}

// Official one-liner from bun.sh installation docs.
await $`bash -c "curl -fsSL https://bun.sh/install | bash"`;

const bunBin = `${process.env.HOME ?? ""}/.bun/bin/bun`;
const checkVersion = await $`${bunBin} --version`.nothrow().text();
if (checkVersion.trim()) {
  console.log(`Installed Bun v${checkVersion.trim()} at ${bunBin}.`);
  console.log("Add ~/.bun/bin to PATH if your shell profile does not already include it.");
} else {
  throw new Error("Bun install command finished, but version check failed.");
}
