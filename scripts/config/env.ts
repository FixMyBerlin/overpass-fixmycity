#!/usr/bin/env bun

import path from "node:path";
import { z } from "zod";

const ROOT_DIR = path.resolve(import.meta.dir, "../..");

const nonEmptyString = z.string().trim().min(1);
const httpUrl = z
  .url()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "must be an http(s) URL",
  });
const httpOrFileUrl = z
  .url()
  .refine(
    (value) =>
      value.startsWith("http://") || value.startsWith("https://") || value.startsWith("file://"),
    {
      message: "must be an http(s) or file URL",
    },
  );
const positiveIntString = z
  .string()
  .trim()
  .regex(/^\d+$/, "must be a positive integer")
  .transform((value) => Number(value))
  .refine((value) => Number.isSafeInteger(value) && value > 0, "must be a positive integer");
const rootRelativePath = nonEmptyString.transform((value) =>
  path.isAbsolute(value) ? path.normalize(value) : path.resolve(ROOT_DIR, value),
);

function parseEnv<T extends z.ZodTypeAny>(schema: T, scope: string): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "<root>";
      return `${key}: ${issue.message}`;
    })
    .join("\n");
  throw new Error(`Invalid environment for ${scope}:\n${details}`);
}

const opsPathsSchema = z.object({
  OVERPASS_DATA_ROOT: rootRelativePath,
  OVERPASS_CACHE_ROOT: rootRelativePath,
  TRAEFIK_ACME_ROOT: rootRelativePath,
});

const overpassBaseUrlSchema = z.object({
  OVERPASS_BASE_URL: httpUrl.transform((value) => value.replace(/\/+$/, "")),
});

const overpassPlanetSchema = z.object({
  OVERPASS_PLANET_URL: httpOrFileUrl,
});

const extractSourceSchema = z.object({
  OVERPASS_EXTRACT_URL: httpUrl,
});

const runtimeTestSchema = z.object({
  OVERPASS_CONTAINER_NAME: nonEmptyString,
  OVERPASS_REPLICATION_WAIT_MS: positiveIntString,
});

const installBunSchema = z.object({
  HOME: rootRelativePath,
});

const bootstrapHostSchema = z
  .object({
    SUDO_USER: z.string().trim().optional(),
    USER: z.string().trim().optional(),
  })
  .transform((value) => {
    const invokingUser = value.SUDO_USER || value.USER;
    if (!invokingUser) {
      throw new Error("SUDO_USER or USER must be set");
    }
    return { invokingUser };
  });

export type OpsPathsEnv = z.infer<typeof opsPathsSchema>;
export type OverpassBaseUrlEnv = z.infer<typeof overpassBaseUrlSchema>;
export type OverpassPlanetEnv = z.infer<typeof overpassPlanetSchema>;
export type ExtractSourceEnv = z.infer<typeof extractSourceSchema>;
export type RuntimeTestEnv = z.infer<typeof runtimeTestSchema>;
export type InstallBunEnv = z.infer<typeof installBunSchema>;
export type BootstrapHostEnv = z.infer<typeof bootstrapHostSchema>;

export function getOpsPathsEnv(): OpsPathsEnv {
  return parseEnv(opsPathsSchema, "ops paths");
}

export function getOverpassBaseUrlEnv(): OverpassBaseUrlEnv {
  return parseEnv(overpassBaseUrlSchema, "overpass base URL");
}

export function getOverpassPlanetEnv(): OverpassPlanetEnv {
  return parseEnv(overpassPlanetSchema, "overpass planet URL");
}

export function getExtractSourceEnv(): ExtractSourceEnv {
  return parseEnv(extractSourceSchema, "extract source");
}

export function getRuntimeTestEnv(): RuntimeTestEnv {
  return parseEnv(runtimeTestSchema, "runtime tests");
}

export function getInstallBunEnv(): InstallBunEnv {
  return parseEnv(installBunSchema, "bun install");
}

export function getBootstrapHostEnv(): BootstrapHostEnv {
  return parseEnv(bootstrapHostSchema, "bootstrap host");
}
