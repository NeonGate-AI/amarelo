import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import semver from "semver";

import { runDoctorCommand } from "./doctor.command.js";
import {
  CONFIG_FILENAME,
  DEFAULT_CLEANUP_CONFIG,
  DEFAULT_ENVIRONMENT_CONFIG,
  configPath,
  loadDoctorConfig,
} from "../core/config.js";
import type { DoctorConfig, ToolCheckConfig } from "../core/config.types.js";
import { setupEnvironmentFiles } from "../core/environment.js";
import { ensureGitignoreEntry } from "../core/gitignore.js";
import { installLocalProjectLauncher } from "../core/launcher.js";
import { CliError } from "../core/errors.js";
import {
  detectIndentation,
  detectLineEnding,
  pathExists,
  writeFileAtomically,
} from "../core/filesystem.js";
import { heading, info, success, warning } from "../core/output.js";
import { commandVersion, runCommand } from "../core/process.js";
import { assertSafeProjectRoot, resolveProjectRoot } from "../core/project.js";
import {
  createPromptSession,
  isInteractive,
  type PromptSession,
} from "../core/prompt.js";
import { packageVersion } from "../core/version.js";

const PACKAGE_NAME = "@neongate-ai/neon";

function currentPackageSpec(): string {
  const version = packageVersion();
  return version === "unknown" ? PACKAGE_NAME : `${PACKAGE_NAME}@${version}`;
}

function schemaReference(): string {
  return `https://unpkg.com/${currentPackageSpec()}/doctor.config.schema.json`;
}

interface PackageManifest {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: { node?: string };
  packageManager?: string;
  [key: string]: unknown;
}

export interface SetupCommandOptions {
  assumeYes: boolean;
  force: boolean;
  offline: boolean;
  skipInstall: boolean;
  noColor: boolean;
}

function majorRange(version: string): string {
  const parsed = semver.coerce(version);
  return parsed ? `>=${parsed.major}.0.0 <${parsed.major + 1}.0.0` : "*";
}

function exactVersion(rawVersion: string | null): string | null {
  if (!rawVersion) return null;
  const complete = rawVersion.match(
    /(?:^|[^0-9])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/u,
  )?.[1];
  if (complete) return semver.valid(complete) ? complete : null;
  return semver.coerce(rawVersion)?.version ?? null;
}

async function readPackageManifest(projectRoot: string): Promise<{
  filePath: string;
  content: string;
  manifest: PackageManifest;
}> {
  const filePath = path.join(projectRoot, "package.json");
  if (!(await pathExists(filePath))) {
    throw new CliError(
      "Neon setup requires a package.json in the project root.",
      2,
    );
  }

  const content = await readFile(filePath, "utf8");
  let manifest: PackageManifest;
  try {
    manifest = JSON.parse(content) as PackageManifest;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(`Cannot parse package.json: ${detail}`, 2);
  }
  return { filePath, content, manifest };
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
      ? exactVersion(manifest.version)
      : null;
  } catch {
    return null;
  }
}

async function projectUsesTypeScript(
  projectRoot: string,
  manifest: PackageManifest,
): Promise<boolean> {
  if (manifest.dependencies?.typescript || manifest.devDependencies?.typescript)
    return true;
  return (await readdir(projectRoot)).some(
    (name) =>
      name === "tsconfig.json" ||
      (name.startsWith("tsconfig.") && name.endsWith(".json")),
  );
}

async function projectUsesDocker(projectRoot: string): Promise<boolean> {
  const names = new Set(
    (await readdir(projectRoot)).map((name) => name.toLowerCase()),
  );
  return (
    names.has("dockerfile") ||
    names.has("compose.yml") ||
    names.has("compose.yaml") ||
    names.has("docker-compose.yml") ||
    names.has("docker-compose.yaml")
  );
}

async function discoverTemplateNames(projectRoot: string): Promise<string[]> {
  const excluded = new Set(DEFAULT_ENVIRONMENT_CONFIG.excludeDirectories);
  const names = new Set(DEFAULT_ENVIRONMENT_CONFIG.templates);

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!excluded.has(entry.name))
          await visit(path.join(directory, entry.name));
        continue;
      }
      if (
        entry.isFile() &&
        (entry.name.endsWith(".example") ||
          entry.name.endsWith(".template") ||
          entry.name.endsWith(".sample")) &&
        entry.name.startsWith(".env")
      ) {
        names.add(entry.name);
      }
    }
  }

  await visit(projectRoot);
  return [...names].sort();
}

function configuredPnpmVersion(manifest: PackageManifest): string | null {
  const match = manifest.packageManager?.match(/^pnpm@(.+)$/u);
  return match?.[1] && semver.valid(match[1]) ? match[1] : null;
}

function registryLatest(
  packageName: string,
  projectRoot: string,
): string | null {
  const result = runCommand("npm", ["view", packageName, "version", "--json"], {
    cwd: projectRoot,
    timeout: 15_000,
  });
  if (result.status !== 0) return null;

  try {
    const value = JSON.parse(result.stdout) as unknown;
    return typeof value === "string" && semver.valid(value) ? value : null;
  } catch {
    return null;
  }
}

function resolveLatestRequirement(
  input: string,
  packageName: string,
  fallbackVersion: string | null,
  projectRoot: string,
  offline: boolean,
  style: "exact" | "caret",
): string {
  if (input !== "latest") {
    if (!semver.validRange(input))
      throw new CliError(`Invalid semver range: ${input}`, 2);
    return input;
  }

  const resolved = offline ? null : registryLatest(packageName, projectRoot);
  const concrete = resolved ?? fallbackVersion;
  if (!concrete) {
    throw new CliError(
      `Could not resolve latest ${packageName}. Re-run online or provide an explicit version range.`,
      2,
    );
  }
  return style === "caret" ? `^${concrete}` : concrete;
}

function packageHasNeon(manifest: PackageManifest): boolean {
  return Boolean(
    manifest.dependencies?.[PACKAGE_NAME] ||
    manifest.devDependencies?.[PACKAGE_NAME],
  );
}

function packageHasNeonScript(manifest: PackageManifest): boolean {
  return manifest.scripts?.neon === "neon";
}

async function writePackageManifest(
  filePath: string,
  originalContent: string,
  manifest: PackageManifest,
): Promise<void> {
  const indentation = detectIndentation(originalContent);
  const lineEnding = detectLineEnding(originalContent);
  const serialized = `${JSON.stringify(manifest, null, indentation).replace(/\n/gu, lineEnding)}${lineEnding}`;
  await writeFileAtomically(filePath, serialized);
}

async function promptConfiguration(
  prompt: PromptSession,
  projectRoot: string,
  manifest: PackageManifest,
  existing: DoctorConfig | null,
  options: SetupCommandOptions,
): Promise<DoctorConfig> {
  const currentNode = exactVersion(process.version) ?? process.version;
  const nodeDefault =
    existing?.checks.node.version ??
    manifest.engines?.node ??
    majorRange(currentNode);
  const nodeRange = await prompt.input("Supported Node version", nodeDefault);
  if (!semver.validRange(nodeRange))
    throw new CliError(`Invalid Node semver range: ${nodeRange}`, 2);

  const installedPnpm =
    configuredPnpmVersion(manifest) ??
    exactVersion(commandVersion("pnpm", ["--version"], projectRoot));
  const pnpmDefault = existing?.checks.pnpm.version ?? installedPnpm ?? undefined;
  const pnpmInput = await prompt.input(
    "Which version of pnpm do you use?",
    pnpmDefault,
  );
  const pnpmRange = resolveLatestRequirement(
    pnpmInput,
    "pnpm",
    installedPnpm,
    projectRoot,
    options.offline,
    "exact",
  );

  const detectedTypeScript = await projectUsesTypeScript(projectRoot, manifest);
  const usesTypeScript = await prompt.confirm(
    "Does this project use TypeScript?",
    existing?.checks.typescript !== undefined || detectedTypeScript,
  );

  let typeScriptCheck: ToolCheckConfig | undefined;
  if (usesTypeScript) {
    const installedTypeScript = localPackageVersion(projectRoot, "typescript");
    const declaredTypeScript =
      manifest.devDependencies?.typescript ?? manifest.dependencies?.typescript;
    const typeScriptDefault =
      existing?.checks.typescript?.version ??
      installedTypeScript ??
      (declaredTypeScript && semver.validRange(declaredTypeScript)
        ? declaredTypeScript
        : undefined);
    const typeScriptInput = await prompt.input(
      "Which version of TypeScript do you use?",
      typeScriptDefault,
    );
    typeScriptCheck = {
      required: true,
      version: resolveLatestRequirement(
        typeScriptInput,
        "typescript",
        installedTypeScript,
        projectRoot,
        options.offline,
        "caret",
      ),
    };
  }

  const requireJq = await prompt.confirm(
    "Does this project require jq?",
    existing?.checks.jq.required ?? false,
  );
  const jqRange = await prompt.input(
    "Required jq version",
    existing?.checks.jq.version ?? "*",
  );
  if (!semver.validRange(jqRange))
    throw new CliError(`Invalid jq semver range: ${jqRange}`, 2);

  const detectedDocker = await projectUsesDocker(projectRoot);
  const usesDocker = await prompt.confirm(
    "Does this project require Docker?",
    existing?.checks.docker !== undefined || detectedDocker,
  );

  let dockerCheck: ToolCheckConfig | undefined;
  if (usesDocker) {
    const dockerRange = await prompt.input(
      "Required Docker version",
      existing?.checks.docker?.version ?? "*",
    );
    if (!semver.validRange(dockerRange)) {
      throw new CliError(`Invalid Docker semver range: ${dockerRange}`, 2);
    }
    dockerCheck = {
      required: true,
      version: dockerRange,
      daemon: await prompt.confirm(
        "Must the Docker daemon be running?",
        existing?.checks.docker?.daemon ?? true,
      ),
    };
  }

  const checks: DoctorConfig["checks"] = {
    node: { required: true, version: nodeRange },
    pnpm: { required: true, version: pnpmRange },
    jq: { required: requireJq, version: jqRange },
  };
  if (typeScriptCheck) checks.typescript = typeScriptCheck;
  if (dockerCheck) checks.docker = dockerCheck;

  return {
    $schema: schemaReference(),
    schemaVersion: 1,
    checks,
    environment: {
      templates:
        existing?.environment.templates ??
        (await discoverTemplateNames(projectRoot)),
      excludeDirectories:
        existing?.environment.excludeDirectories ??
        DEFAULT_ENVIRONMENT_CONFIG.excludeDirectories,
    },
    cleanup: existing?.cleanup ?? DEFAULT_CLEANUP_CONFIG,
  };
}

function inferredConfiguration(
  projectRoot: string,
  manifest: PackageManifest,
  existing: DoctorConfig | null,
  templates: string[],
): DoctorConfig {
  if (existing) return existing;

  const currentNode = exactVersion(process.version) ?? process.version;
  const pnpm =
    configuredPnpmVersion(manifest) ??
    exactVersion(commandVersion("pnpm", ["--version"], projectRoot));
  if (!pnpm)
    throw new CliError(
      "pnpm is required to create a default configuration.",
      2,
    );

  const checks: DoctorConfig["checks"] = {
    node: {
      required: true,
      version: manifest.engines?.node ?? majorRange(currentNode),
    },
    pnpm: { required: true, version: pnpm },
    jq: { required: false, version: "*" },
  };
  const typescript = localPackageVersion(projectRoot, "typescript");
  if (typescript)
    checks.typescript = { required: true, version: `^${typescript}` };

  return {
    $schema: schemaReference(),
    schemaVersion: 1,
    checks,
    environment: {
      templates,
      excludeDirectories: DEFAULT_ENVIRONMENT_CONFIG.excludeDirectories,
    },
    cleanup: DEFAULT_CLEANUP_CONFIG,
  };
}

export async function runSetupCommand(
  options: SetupCommandOptions,
): Promise<number> {
  if (!options.assumeYes && !isInteractive()) {
    throw new CliError(
      "Interactive setup requires a terminal. Use --yes with explicit defaults in automation.",
      2,
    );
  }

  const projectRoot = await resolveProjectRoot();
  assertSafeProjectRoot(projectRoot);
  const packageData = await readPackageManifest(projectRoot);

  let existing: DoctorConfig | null = null;
  if (await pathExists(configPath(projectRoot))) {
    try {
      existing = await loadDoctorConfig(projectRoot);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(detail, 2);
    }
  }

  const prompt = options.assumeYes ? null : createPromptSession();
  try {
    const templates = await discoverTemplateNames(projectRoot);
    const config = prompt
      ? await promptConfiguration(
          prompt,
          projectRoot,
          packageData.manifest,
          existing,
          options,
        )
      : inferredConfiguration(
          projectRoot,
          packageData.manifest,
          existing,
          templates,
        );

    const runningInPackageRepository =
      packageData.manifest.name === PACKAGE_NAME;
    const alreadyInstalled =
      packageHasNeon(packageData.manifest) || runningInPackageRepository;
    const shouldInstall =
      !options.skipInstall &&
      !alreadyInstalled &&
      (prompt
        ? await prompt.confirm(
            `Install ${PACKAGE_NAME} as a dev dependency?`,
            true,
          )
        : true);
    const commandWillRemainAvailable = alreadyInstalled || shouldInstall;

    const existingNeonScript = packageData.manifest.scripts?.neon;
    const canWriteScript =
      commandWillRemainAvailable &&
      (existingNeonScript === undefined ||
        existingNeonScript === "neon" ||
        options.force ||
        (prompt
          ? await prompt.confirm(
              `package.json already defines \"neon\": \"${existingNeonScript}\". Replace it?`,
              false,
            )
          : false));

    process.stdout.write(
      `${heading("Setup preview", { noColor: options.noColor })}\n`,
    );
    process.stdout.write(
      `${info(`Project: ${projectRoot}`, { noColor: options.noColor })}\n`,
    );
    process.stdout.write(
      `${info(`Write local config: ${CONFIG_FILENAME}`, { noColor: options.noColor })}\n`,
    );
    process.stdout.write(
      `${info(`Ensure .gitignore contains ${CONFIG_FILENAME}`, { noColor: options.noColor })}\n`,
    );
    if (commandWillRemainAvailable) {
      process.stdout.write(
        `${info("Install a user launcher that resolves the project-local Neon binary", { noColor: options.noColor })}\n`,
      );
    }
    process.stdout.write(
      `${info(
        canWriteScript
          ? 'Ensure script: "neon": "neon"'
          : commandWillRemainAvailable
            ? "Keep existing neon script"
            : "Skip neon script because the package will not be installed",
        { noColor: options.noColor },
      )}\n`,
    );
    if (shouldInstall) {
      process.stdout.write(
        `${info(`Install dev dependency: ${currentPackageSpec()}`, { noColor: options.noColor })}\n`,
      );
    }
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);

    if (prompt && !(await prompt.confirm("Apply this setup?", true))) {
      process.stdout.write("Setup cancelled.\n");
      return 0;
    }

    if (shouldInstall) {
      const installArguments = ["add", "--save-dev"];
      if (await pathExists(path.join(projectRoot, "pnpm-workspace.yaml"))) {
        installArguments.push("--workspace-root");
      }
      installArguments.push(currentPackageSpec());
      const install = runCommand("pnpm", installArguments, {
        cwd: projectRoot,
        timeout: 120_000,
      });
      if (install.status !== 0) {
        throw new Error(
          install.stderr.trim() || `Could not install ${PACKAGE_NAME}.`,
        );
      }
      packageData.content = await readFile(packageData.filePath, "utf8");
      packageData.manifest = JSON.parse(packageData.content) as PackageManifest;
    }

    if (canWriteScript && !packageHasNeonScript(packageData.manifest)) {
      packageData.manifest.scripts = {
        ...(packageData.manifest.scripts ?? {}),
        neon: "neon",
      };
      await writePackageManifest(
        packageData.filePath,
        packageData.content,
        packageData.manifest,
      );
    } else if (commandWillRemainAvailable && !canWriteScript) {
      process.stdout.write(
        `${warning("Existing package.json neon script was preserved. Use --force to replace it.", { noColor: options.noColor })}\n`,
      );
    } else if (!commandWillRemainAvailable) {
      process.stdout.write(
        `${warning(`Neon was not installed, so no package script was added. Install ${currentPackageSpec()} in the project and run the bootstrap package script once.`, { noColor: options.noColor })}\n`,
      );
    }

    await writeFileAtomically(
      configPath(projectRoot),
      `${JSON.stringify(config, null, 2)}\n`,
    );
    await ensureGitignoreEntry(projectRoot, CONFIG_FILENAME);

    if (commandWillRemainAvailable) {
      const launcher = await installLocalProjectLauncher(options.force);
      if (!launcher.supported) {
        process.stdout.write(
          `${warning("Direct project-local launcher setup is not yet supported on Windows. Keep using the package script there.", { noColor: options.noColor })}\n`,
        );
      } else if (launcher.launcherPath) {
        process.stdout.write(
          `${success(`Installed Neon launcher at ${launcher.launcherPath}.`, { noColor: options.noColor })}\n`,
        );
        if (!launcher.pathReady) {
          const profileHint = launcher.profilePath
            ? ` Restart the shell or source ${launcher.profilePath} once.`
            : " Add its directory to PATH before using neon directly.";
          process.stdout.write(
            `${warning(`The launcher directory is not in the current PATH.${profileHint}`, { noColor: options.noColor })}\n`,
          );
        }
      }
    }

    const environment = await setupEnvironmentFiles(
      projectRoot,
      config.environment,
    );

    process.stdout.write(
      `${success(`Wrote ${CONFIG_FILENAME}; created ${environment.created.length} environment file(s), skipped ${environment.skipped.length}.`, { noColor: options.noColor })}\n`,
    );
    process.stdout.write(
      `${info("Running Doctor…", { noColor: options.noColor })}\n\n`,
    );
    return runDoctorCommand({
      json: false,
      strict: false,
      noColor: options.noColor,
    });
  } finally {
    prompt?.close();
  }
}
