#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const ROOT_DIR = path.resolve(import.meta.dir, "../..");
const STACK_CONFIG_FILE = path.join(ROOT_DIR, "infra/docker/stack.env.yaml");

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

function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  scope: string,
  source: Record<string, unknown>,
): z.infer<T> {
  const result = schema.safeParse(source);
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

const stackConfigSchema = z.object({
  OVERPASS_DATA_ROOT: rootRelativePath,
  TRAEFIK_ACME_ROOT: rootRelativePath,
  OVERPASS_META: z.enum(["yes", "no"]),
  OVERPASS_MODE: nonEmptyString,
  OVERPASS_STOP_AFTER_INIT: z.enum(["true", "false"]),
  OVERPASS_RATE_LIMIT: nonEmptyString,
  OVERPASS_DIFF_URL: httpUrl,
  OVERPASS_ALLOW_DUPLICATE_QUERIES: z.enum(["yes", "no"]),
  OVERPASS_UPDATE_SLEEP: nonEmptyString,
  OVERPASS_COMPRESSION: nonEmptyString,
  OVERPASS_RULES_LOAD: nonEmptyString,
  OVERPASS_PLANET_URL: httpOrFileUrl,
  OVERPASS_PLANET_PREPROCESS: nonEmptyString,
  OVERPASS_DIFF_PREPROCESS: z.string().default(""),
  USE_OAUTH_COOKIE_CLIENT: z.enum(["yes", "no"]),
  OVERPASS_OAUTH_USER: nonEmptyString,
  OVERPASS_OAUTH_OSM_HOST: httpUrl,
  OVERPASS_OAUTH_CONSUMER_URL: httpUrl,
  OVERPASS_DOMAIN: nonEmptyString,
  OVERPASS_ALLOWED_CIDRS: nonEmptyString,
  TRAEFIK_ACME_EMAIL: nonEmptyString,
  TRAEFIK_LOG_LEVEL: nonEmptyString,
  TRAEFIK_API_INSECURE: z.enum(["true", "false"]),
  TRAEFIK_DASHBOARD: z.enum(["true", "false"]),
  TRAEFIK_READ_TIMEOUT: nonEmptyString,
  TRAEFIK_WRITE_TIMEOUT: nonEmptyString,
  TRAEFIK_DIAL_TIMEOUT: nonEmptyString,
  OVERPASS_TEST_BASE_URL: httpUrl.transform((value) => value.replace(/\/+$/, "")),
  OVERPASS_TEST_REPLICATION_WAIT_MS: nonEmptyString,
});

const opsPathsSchema = z.object({
  OVERPASS_DATA_ROOT: rootRelativePath,
  TRAEFIK_ACME_ROOT: rootRelativePath,
});

const overpassPlanetSchema = z.object({
  OVERPASS_PLANET_URL: httpOrFileUrl,
});

const oauthClientSchema = z
  .object({
    USE_OAUTH_COOKIE_CLIENT: z.enum(["yes", "no"]).default("no"),
    OVERPASS_OAUTH_USER: z.string().trim().optional(),
    OVERPASS_OAUTH_PASSWORD: z.string().trim().optional(),
    OVERPASS_OAUTH_OSM_HOST: httpUrl.default("https://www.openstreetmap.org"),
    OVERPASS_OAUTH_CONSUMER_URL: httpUrl.default(
      "https://osm-internal.download.geofabrik.de/get_cookie",
    ),
  })
  .superRefine((value, ctx) => {
    if (value.USE_OAUTH_COOKIE_CLIENT !== "yes") {
      return;
    }

    if (!value.OVERPASS_OAUTH_USER) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OVERPASS_OAUTH_USER"],
        message: "is required when USE_OAUTH_COOKIE_CLIENT=yes",
      });
    }

    if (!value.OVERPASS_OAUTH_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OVERPASS_OAUTH_PASSWORD"],
        message: "is required when USE_OAUTH_COOKIE_CLIENT=yes",
      });
      return;
    }
  });

const overpassTestSchema = z.object({
  OVERPASS_TEST_BASE_URL: httpUrl.transform((value) => value.replace(/\/+$/, "")),
  OVERPASS_TEST_REPLICATION_WAIT_MS: positiveIntString,
});

const composeEnvSchema = z.object({
  OVERPASS_DATA_ROOT: rootRelativePath,
  TRAEFIK_ACME_ROOT: rootRelativePath,
  OVERPASS_META: z.enum(["yes", "no"]),
  OVERPASS_MODE: nonEmptyString,
  OVERPASS_STOP_AFTER_INIT: z.enum(["true", "false"]),
  OVERPASS_RATE_LIMIT: nonEmptyString,
  OVERPASS_DIFF_URL: httpUrl,
  OVERPASS_ALLOW_DUPLICATE_QUERIES: z.enum(["yes", "no"]),
  OVERPASS_PLANET_URL: httpOrFileUrl,
  USE_OAUTH_COOKIE_CLIENT: z.enum(["yes", "no"]),
  OVERPASS_PLANET_PREPROCESS: nonEmptyString,
  OVERPASS_DIFF_PREPROCESS: z.string().default(""),
  OVERPASS_UPDATE_SLEEP: nonEmptyString,
  OVERPASS_COMPRESSION: nonEmptyString,
  OVERPASS_RULES_LOAD: nonEmptyString,
  OVERPASS_DOMAIN: nonEmptyString,
  OVERPASS_ALLOWED_CIDRS: nonEmptyString,
  TRAEFIK_ACME_EMAIL: nonEmptyString,
  TRAEFIK_LOG_LEVEL: nonEmptyString,
  TRAEFIK_API_INSECURE: z.enum(["true", "false"]),
  TRAEFIK_DASHBOARD: z.enum(["true", "false"]),
  TRAEFIK_READ_TIMEOUT: nonEmptyString,
  TRAEFIK_WRITE_TIMEOUT: nonEmptyString,
  TRAEFIK_DIAL_TIMEOUT: nonEmptyString,
});

export type OpsPathsEnv = z.infer<typeof opsPathsSchema>;
export type OverpassPlanetEnv = z.infer<typeof overpassPlanetSchema>;
export type OauthClientEnv = z.infer<typeof oauthClientSchema>;
export type OverpassTestEnv = z.infer<typeof overpassTestSchema>;
export type ComposeEnv = z.infer<typeof composeEnvSchema>;
export type StackConfig = z.infer<typeof stackConfigSchema>;

let cachedStackConfig: StackConfig | null = null;

function getStackConfig(): StackConfig {
  if (cachedStackConfig) {
    return cachedStackConfig;
  }
  const rawConfig = readFileSync(STACK_CONFIG_FILE, "utf8");
  const parsedConfig = Bun.YAML.parse(rawConfig);
  const result = stackConfigSchema.safeParse(parsedConfig);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const key = issue.path.join(".") || "<root>";
        return `${key}: ${issue.message}`;
      })
      .join("\n");
    throw new Error(`Invalid stack config (${STACK_CONFIG_FILE}):\n${details}`);
  }
  cachedStackConfig = result.data;
  return cachedStackConfig;
}

function getStackDefaultsEnv(): Record<string, string> {
  const stackConfig = getStackConfig();
  return {
    OVERPASS_DATA_ROOT: stackConfig.OVERPASS_DATA_ROOT,
    TRAEFIK_ACME_ROOT: stackConfig.TRAEFIK_ACME_ROOT,
    OVERPASS_META: stackConfig.OVERPASS_META,
    OVERPASS_MODE: stackConfig.OVERPASS_MODE,
    OVERPASS_STOP_AFTER_INIT: stackConfig.OVERPASS_STOP_AFTER_INIT,
    OVERPASS_RATE_LIMIT: stackConfig.OVERPASS_RATE_LIMIT,
    OVERPASS_DIFF_URL: stackConfig.OVERPASS_DIFF_URL,
    OVERPASS_ALLOW_DUPLICATE_QUERIES: stackConfig.OVERPASS_ALLOW_DUPLICATE_QUERIES,
    OVERPASS_UPDATE_SLEEP: stackConfig.OVERPASS_UPDATE_SLEEP,
    OVERPASS_COMPRESSION: stackConfig.OVERPASS_COMPRESSION,
    OVERPASS_RULES_LOAD: stackConfig.OVERPASS_RULES_LOAD,
    OVERPASS_PLANET_URL: stackConfig.OVERPASS_PLANET_URL,
    OVERPASS_PLANET_PREPROCESS: stackConfig.OVERPASS_PLANET_PREPROCESS,
    OVERPASS_DIFF_PREPROCESS: stackConfig.OVERPASS_DIFF_PREPROCESS,
    USE_OAUTH_COOKIE_CLIENT: stackConfig.USE_OAUTH_COOKIE_CLIENT,
    OVERPASS_OAUTH_USER: stackConfig.OVERPASS_OAUTH_USER,
    OVERPASS_OAUTH_OSM_HOST: stackConfig.OVERPASS_OAUTH_OSM_HOST,
    OVERPASS_OAUTH_CONSUMER_URL: stackConfig.OVERPASS_OAUTH_CONSUMER_URL,
    OVERPASS_DOMAIN: stackConfig.OVERPASS_DOMAIN,
    OVERPASS_ALLOWED_CIDRS: stackConfig.OVERPASS_ALLOWED_CIDRS,
    TRAEFIK_ACME_EMAIL: stackConfig.TRAEFIK_ACME_EMAIL,
    TRAEFIK_LOG_LEVEL: stackConfig.TRAEFIK_LOG_LEVEL,
    TRAEFIK_API_INSECURE: stackConfig.TRAEFIK_API_INSECURE,
    TRAEFIK_DASHBOARD: stackConfig.TRAEFIK_DASHBOARD,
    TRAEFIK_READ_TIMEOUT: stackConfig.TRAEFIK_READ_TIMEOUT,
    TRAEFIK_WRITE_TIMEOUT: stackConfig.TRAEFIK_WRITE_TIMEOUT,
    TRAEFIK_DIAL_TIMEOUT: stackConfig.TRAEFIK_DIAL_TIMEOUT,
    OVERPASS_TEST_BASE_URL: stackConfig.OVERPASS_TEST_BASE_URL,
    OVERPASS_TEST_REPLICATION_WAIT_MS: stackConfig.OVERPASS_TEST_REPLICATION_WAIT_MS,
  };
}

function getResolvedEnv(): Record<string, unknown> {
  return {
    ...getStackDefaultsEnv(),
    ...process.env,
  };
}

export function getOpsPathsEnv(): OpsPathsEnv {
  return parseEnv(opsPathsSchema, "ops paths", getResolvedEnv());
}

export function getOverpassPlanetEnv(): OverpassPlanetEnv {
  const { OVERPASS_PLANET_URL } = getResolvedEnv();
  return parseEnv(overpassPlanetSchema, "overpass planet URL", { OVERPASS_PLANET_URL });
}

export function getOauthClientEnv(): OauthClientEnv {
  return parseEnv(oauthClientSchema, "oauth client", getResolvedEnv());
}

export function getOverpassTestEnv(): OverpassTestEnv {
  return parseEnv(overpassTestSchema, "overpass tests", getResolvedEnv());
}

export function getComposeEnv(): ComposeEnv {
  return parseEnv(composeEnvSchema, "docker compose", getResolvedEnv());
}

export function applyComposeEnvToProcessEnv(): ComposeEnv {
  const composeEnv = getComposeEnv();
  Object.assign(process.env, composeEnv);
  return composeEnv;
}
