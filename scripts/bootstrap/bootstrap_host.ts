#!/usr/bin/env bun

import { $ } from "bun";
import { getBootstrapHostEnv } from "../config/env";

$.throws(true);

const currentUid = process.getuid?.();
if (typeof currentUid !== "number" || currentUid !== 0) {
  throw new Error("Run as root: sudo bun scripts/bootstrap/bootstrap_host.ts");
}

if (!Bun.which("apt-get")) {
  throw new Error("This bootstrap script currently targets Debian/Ubuntu hosts.");
}

const overpassGroup = "overpassops";
const overpassUser = "overpasssvc";
const { invokingUser } = getBootstrapHostEnv();

await $`apt-get update`;
await $`apt-get install -y docker.io docker-compose-plugin curl wget ca-certificates`;

const groupExists = (await $`getent group ${overpassGroup}`.nothrow()).exitCode === 0;
if (!groupExists) {
  await $`groupadd --system ${overpassGroup}`;
}

const userExists = (await $`id -u ${overpassUser}`.nothrow()).exitCode === 0;
if (!userExists) {
  await $`useradd --system --create-home --gid ${overpassGroup} --shell /usr/sbin/nologin ${overpassUser}`;
}

await $`usermod -aG docker ${invokingUser}`;
await $`systemctl enable docker`;
await $`systemctl start docker`;

console.log("Host bootstrap complete.");
console.log("Log out/in so docker group membership is refreshed for your shell.");
