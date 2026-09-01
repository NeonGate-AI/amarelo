import { createRequire } from "node:module";
import path from "node:path";

import semver from "semver";

import { CONFIG_FILENAME, loadDoctorConfig } from "../core/config.js";
import {
  CHECK_IDS,
  type CheckId,
  type CheckResult,
  type ToolCheckConfig,
} from "../core/config.types.js";
import { validateEnvironmentFiles } from "../core/environment.js";
import { CliError } from "../core/errors.js";
import { failure, heading, success, warning } from "../core/output.js";
import { commandVersion, runCommand } from "../core/process.js";
import { resolveProjectRoot } from "../core/project.js";

export interface DoctorCommandOptions {
  json: boolean;
  strict: boolean;
  noColor: boolean;
}

function normalizedVersion(rawVersion: string | null): string | null {
  if (!rawVersion) return null;
  const complete = rawVersion.match(
    /(?:^|[^0-9])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/u,
  )?.[1];
  if (complete) return semver.valid(complete) ? complete : null;
  return semver.coerce(rawVersion)?.version ?? null;
}

function installHint(id: CheckId, expected: string): string {
  switch (id) {
    case "node":
      return `Install a Node version matching ${expected}.`;
    case "pnpm":
      return `Install pnpm matching ${expected}: npm install --global pnpm.`;
    case "typescript":
      return `Install project TypeScript matching ${expected}: pnpm add -D typescript@\"${expected}\".`;
    case "jq":
      if (process.platform === "darwin") return "Install jq: brew install jq.";
      if (process.platform === "win32")
        return "Install jq: winget install jqlang.jq.";
      return "Install jq: sudo apt-get install jq.";
    case "docker":
      return "Install Docker and ensure its CLI is available on PATH.";
  }
}

function resultForVersion(
  id: CheckId,
  config: ToolCheckConfig,
  actual: string | null,
  detail?: string,
): CheckResult {
  const compatible =
    actual !== null && semver.satisfies(actual, config.version);
  const status = compatible ? "pass" : config.required ? "fail" : "warn";
  const result: CheckResult = {
    id,
    status,
    required: config.required,
    expected: config.version,
    actual,
  };
  if (!compatible) result.fix = installHint(id, config.version);
  if (detail) result.detail = detail;
  return result;
}

function localPackageVersion(
  projectRoot: string,
  packageName: string,
): string | null {
  try {
    const projectRequire = createRequire(
      path.join(projectRoot, "package.json"),
    );
    const manifestPath = projectRequire.resolve(`${packageName}/package.json`);
    const manifest = projectRequire(manifestPath) as { version?: unknown };
    return typeof manifest.version === "string"
      ? normalizedVersion(manifest.version)
      : null;
  } catch {
    return null;
  }
}

function checkConfiguredTool(
  id: CheckId,
  config: ToolCheckConfig,
  projectRoot: string,
): CheckResult {
  switch (id) {
    case "node":
      return resultForVersion(id, config, normalizedVersion(process.version));
    case "pnpm":
      return resultForVersion(
        id,
        config,
        normalizedVersion(commandVersion("pnpm", ["--version"], projectRoot)),
      );
    case "typescript":
      return resultForVersion(
        id,
        config,
        localPackageVersion(projectRoot, "typescript"),
      );
    case "jq":
      return resultForVersion(
        id,
        config,
        normalizedVersion(commandVersion("jq", ["--version"], projectRoot)),
      );
    case "docker": {
      const version = normalizedVersion(
        commandVersion("docker", ["--version"], projectRoot),
      );
      const versionResult = resultForVersion(id, config, version);
      if (versionResult.status !== "pass" || config.daemon !== true)
        return versionResult;

      const daemon = runCommand("docker", ["info"], {
        cwd: projectRoot,
        timeout: 15_000,
      });
      if (daemon.status === 0) return versionResult;
      return {
        ...versionResult,
        status: config.required ? "fail" : "warn",
        detail: "Docker CLI is installed, but the daemon is not reachable.",
        fix: "Start the Docker daemon and rerun neon doctor.",
      };
    }
  }
}

function printCheck(result: CheckResult, noColor: boolean): void {
  const status = result.status.padEnd(4);
  const expected = result.expected ? `expected ${result.expected}` : "";
  const actual = result.actual ? `actual ${result.actual}` : "not available";
  const line = `${result.id.padEnd(12)} ${status}  ${actual}${expected ? ` · ${expected}` : ""}`;

  if (result.status === "pass")
    process.stdout.write(`${success(line, { noColor })}\n`);
  else if (result.status === "warn" || result.status === "skip") {
    process.stdout.write(`${warning(line, { noColor })}\n`);
  } else process.stdout.write(`${failure(line, { noColor })}\n`);

  if (result.detail)
    process.stdout.write(`                 ${result.detail}\n`);
  if (result.fix && result.status !== "pass")
    process.stdout.write(`                 ${result.fix}\n`);
}

export async function runDoctorCommand(
  options: DoctorCommandOptions,
): Promise<number> {
  const projectRoot = await resolveProjectRoot();
  let config;
  try {
    config = await loadDoctorConfig(projectRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: false,
            config: CONFIG_FILENAME,
            projectRoot,
            error: { code: "INVALID_CONFIG", message },
            checks: [],
          },
          null,
          2,
        )}\n`,
      );
      return 2;
    }
    throw new CliError(message, 2);
  }

  const checks: CheckResult[] = [];
  for (const id of CHECK_IDS) {
    const checkConfig = config.checks[id];
    if (checkConfig)
      checks.push(checkConfiguredTool(id, checkConfig, projectRoot));
  }

  let environmentIssues;
  try {
    environmentIssues = await validateEnvironmentFiles(
      projectRoot,
      config.environment,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: false,
            config: CONFIG_FILENAME,
            projectRoot,
            error: { code: "CHECK_ERROR", message },
            checks,
          },
          null,
          2,
        )}\n`,
      );
      return 2;
    }
    throw new CliError(message, 2);
  }
  const environmentResult: CheckResult = {
    id: "environment",
    status: environmentIssues.length === 0 ? "pass" : "fail",
    required: true,
    expected: "all template keys present",
    actual:
      environmentIssues.length === 0
        ? "valid"
        : `${environmentIssues.length} issue(s)`,
  };
  if (environmentIssues.length > 0) {
    environmentResult.detail = environmentIssues
      .map((issue) => `${issue.target}: ${issue.message}`)
      .join("; ");
    environmentResult.fix =
      "Run neon env setup, then add any missing values.";
  }
  checks.push(environmentResult);

  const failures = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");
  const ok =
    failures.length === 0 && (!options.strict || warnings.length === 0);

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok,
          config: CONFIG_FILENAME,
          projectRoot,
          checks,
        },
        null,
        2,
      )}\n`,
    );
    return ok ? 0 : 1;
  }

  process.stdout.write(`${heading("Doctor", { noColor: options.noColor })}\n`);
  process.stdout.write(`Project  ${projectRoot}\n`);
  process.stdout.write(`Config   ${CONFIG_FILENAME}\n\n`);
  for (const check of checks) printCheck(check, options.noColor);

  process.stdout.write("\n");
  if (ok) {
    process.stdout.write(
      `${success(`Project ready${warnings.length > 0 ? ` with ${warnings.length} warning(s)` : ""}.`, { noColor: options.noColor })}\n`,
    );
  } else {
    process.stdout.write(
      `${failure(`${failures.length} required check(s) failed${options.strict && warnings.length > 0 ? `; ${warnings.length} warning(s) are strict` : ""}.`, { noColor: options.noColor })}\n`,
    );
  }
  return ok ? 0 : 1;
}
