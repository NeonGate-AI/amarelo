import { readFile } from "node:fs/promises";
import path from "node:path";

import semver from "semver";

import {
  CHECK_IDS,
  type CleanupConfig,
  type DoctorConfig,
  type EnvironmentConfig,
  type ToolCheckConfig,
} from "./config.types.js";
import { pathExists } from "./filesystem.js";

export const CONFIG_FILENAME = "doctor.config.json";

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  templates: [".env.example", ".env.template", ".env.sample"],
  excludeDirectories: [
    ".git",
    "node_modules",
    ".next",
    ".turbo",
    ".expo",
    "dist",
    "build",
    "coverage",
  ],
};

export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  directories: [
    ".next",
    ".turbo",
    ".expo",
    ".cache",
    ".vercel/cache",
    "dist",
    "dist-ssr",
    "out",
    "build",
    "coverage",
    "storybook-static",
  ],
  files: [
    "*.tsbuildinfo",
    ".DS_Store",
    "npm-debug.log*",
    "pnpm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
  ],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertKnownKeys(
  label: string,
  value: Record<string, unknown>,
  knownKeys: string[],
): void {
  const unknown = Object.keys(value).filter((key) => !knownKeys.includes(key));
  if (unknown.length > 0) {
    throw new Error(
      `${label} contains unknown properties: ${unknown.join(", ")}.`,
    );
  }
}

function validateToolCheck(
  id: string,
  value: unknown,
): asserts value is ToolCheckConfig {
  if (!isObject(value)) throw new Error(`checks.${id} must be an object.`);
  assertKnownKeys(`checks.${id}`, value, ["version", "required", "daemon"]);
  if (typeof value.version !== "string" || !semver.validRange(value.version)) {
    throw new Error(`checks.${id}.version must be a valid semver range.`);
  }
  if (typeof value.required !== "boolean") {
    throw new Error(`checks.${id}.required must be a boolean.`);
  }
  if (value.daemon !== undefined && typeof value.daemon !== "boolean") {
    throw new Error(`checks.${id}.daemon must be a boolean.`);
  }
}

function validateStringArray(
  pathLabel: string,
  value: unknown,
): asserts value is string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item)
  ) {
    throw new Error(`${pathLabel} must be an array of non-empty strings.`);
  }
}

export function validateDoctorConfig(
  value: unknown,
): asserts value is DoctorConfig {
  if (!isObject(value))
    throw new Error("Doctor configuration must be an object.");
  assertKnownKeys("doctor configuration", value, [
    "$schema",
    "schemaVersion",
    "checks",
    "environment",
    "cleanup",
  ]);
  if (value.schemaVersion !== 1) {
    throw new Error(
      `Unsupported doctor configuration schemaVersion: ${String(value.schemaVersion)}.`,
    );
  }
  if (!isObject(value.checks)) throw new Error("checks must be an object.");

  const unknownChecks = Object.keys(value.checks).filter(
    (check) => !CHECK_IDS.includes(check as (typeof CHECK_IDS)[number]),
  );
  if (unknownChecks.length > 0) {
    throw new Error(`Unknown doctor checks: ${unknownChecks.join(", ")}.`);
  }

  for (const requiredId of ["node", "pnpm", "jq"]) {
    if (!(requiredId in value.checks))
      throw new Error(`Missing required check configuration: ${requiredId}.`);
  }
  for (const [id, check] of Object.entries(value.checks))
    validateToolCheck(id, check);

  if (!isObject(value.environment))
    throw new Error("environment must be an object.");
  assertKnownKeys("environment", value.environment, [
    "templates",
    "excludeDirectories",
  ]);
  validateStringArray("environment.templates", value.environment.templates);
  validateStringArray(
    "environment.excludeDirectories",
    value.environment.excludeDirectories,
  );

  if (value.cleanup !== undefined) {
    if (!isObject(value.cleanup)) throw new Error("cleanup must be an object.");
    assertKnownKeys("cleanup", value.cleanup, ["directories", "files"]);
    validateStringArray("cleanup.directories", value.cleanup.directories);
    validateStringArray("cleanup.files", value.cleanup.files);
  }
}

export function configPath(projectRoot: string): string {
  return path.join(projectRoot, CONFIG_FILENAME);
}

export async function loadDoctorConfig(
  projectRoot: string,
): Promise<DoctorConfig> {
  const filePath = configPath(projectRoot);
  if (!(await pathExists(filePath))) {
    throw new Error(
      `Missing ${CONFIG_FILENAME}. Run \`neon setup\` to configure this project.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot parse ${CONFIG_FILENAME}: ${detail}`);
  }

  validateDoctorConfig(parsed);
  return parsed;
}
