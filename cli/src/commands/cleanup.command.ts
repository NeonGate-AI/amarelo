import { lstatSync } from "node:fs";
import { lstat, readdir, rm } from "node:fs/promises";
import path from "node:path";

import {
  CONFIG_FILENAME,
  DEFAULT_CLEANUP_CONFIG,
  configPath,
  loadDoctorConfig,
} from "../core/config.js";
import type { CleanupConfig } from "../core/config.types.js";
import { pathExists } from "../core/filesystem.js";
import {
  formatBytes,
  heading,
  info,
  success,
  warning,
} from "../core/output.js";
import { runCommand } from "../core/process.js";
import { assertSafeProjectRoot, resolveProjectRoot } from "../core/project.js";
import { createPromptSession, isInteractive } from "../core/prompt.js";

interface CleanupTarget {
  absolutePath: string;
  relativePath: string;
  bytes: number;
}

interface CleanupDiscovery {
  targets: CleanupTarget[];
  protectedPaths: string[];
}

function normalizeRelative(value: string): string {
  return value.split(path.sep).join("/");
}

function wildcardToRegularExpression(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replace(/\*/gu, ".*");
  return new RegExp(`^${escaped}$`, "u");
}

function matchesPattern(
  relativePath: string,
  basename: string,
  pattern: string,
): boolean {
  const normalizedPattern = normalizeRelative(pattern);
  const candidate = normalizedPattern.includes("/")
    ? normalizeRelative(relativePath)
    : basename;
  return wildcardToRegularExpression(normalizedPattern).test(candidate);
}

async function calculateSize(targetPath: string): Promise<number> {
  const targetStat = await lstat(targetPath);
  if (!targetStat.isDirectory() || targetStat.isSymbolicLink())
    return targetStat.size;

  let total = 0;
  for (const entry of await readdir(targetPath, { withFileTypes: true })) {
    total += await calculateSize(path.join(targetPath, entry.name));
  }
  return total;
}

function trackedFiles(projectRoot: string): string[] {
  const insideWorkTree = runCommand(
    "git",
    ["rev-parse", "--is-inside-work-tree"],
    { cwd: projectRoot },
  );
  if (insideWorkTree.status !== 0) {
    let directory = path.resolve(projectRoot);
    let gitMetadataFound = false;
    while (true) {
      try {
        lstatSync(path.join(directory, ".git"));
        gitMetadataFound = true;
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          gitMetadataFound = true;
          break;
        }
      }
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }

    const externalGitMetadata = Boolean(
      process.env.GIT_DIR || process.env.GIT_WORK_TREE,
    );
    const notRepository = /not a git repository/iu.test(insideWorkTree.stderr);
    if (
      (insideWorkTree.errorCode === "ENOENT" || notRepository) &&
      !gitMetadataFound &&
      !externalGitMetadata
    )
      return [];
    throw new Error(
      "Git repository status could not be established, so cleanup stopped without deleting anything.",
    );
  }

  const result = runCommand("git", ["ls-files", "-z"], { cwd: projectRoot });
  if (result.status !== 0) {
    throw new Error(
      "Git could not enumerate tracked files, so cleanup stopped without deleting anything.",
    );
  }
  return result.stdout.split("\0").filter(Boolean).map(normalizeRelative);
}

function containsTrackedFile(relativePath: string, tracked: string[]): boolean {
  const normalized = normalizeRelative(relativePath);
  return tracked.some(
    (candidate) =>
      candidate === normalized || candidate.startsWith(`${normalized}/`),
  );
}

async function discoverCleanupTargets(
  projectRoot: string,
  config: CleanupConfig,
  includeDependencies: boolean,
): Promise<CleanupDiscovery> {
  const unsafePatterns = [...config.directories, ...config.files].filter(
    (pattern) =>
      pattern === "." ||
      pattern === "/" ||
      pattern === "*" ||
      pattern === "**" ||
      path.isAbsolute(pattern) ||
      normalizeRelative(pattern).split("/").includes("..") ||
      normalizeRelative(pattern).split("/").includes(".git"),
  );
  if (unsafePatterns.length > 0) {
    throw new Error(
      `Unsafe cleanup patterns in doctor.config.json: ${unsafePatterns.join(", ")}.`,
    );
  }

  const directoryPatterns = config.directories.filter((pattern) => {
    const segments = normalizeRelative(pattern).split("/");
    return (
      !segments.includes("node_modules") && !segments.includes(".pnpm-store")
    );
  });
  if (includeDependencies)
    directoryPatterns.push("node_modules", ".pnpm-store");

  const tracked = trackedFiles(projectRoot);
  const targets: CleanupTarget[] = [];
  const protectedPaths: string[] = [];

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalizeRelative(
        path.relative(projectRoot, absolutePath),
      );

      if (entry.name === ".git" || entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        const dependencyDirectory =
          entry.name === "node_modules" || entry.name === ".pnpm-store";
        if (dependencyDirectory && !includeDependencies) continue;
        const matched = directoryPatterns.some((pattern) =>
          matchesPattern(relativePath, entry.name, pattern),
        );

        if (matched) {
          if (containsTrackedFile(relativePath, tracked))
            protectedPaths.push(relativePath);
          else {
            targets.push({
              absolutePath,
              relativePath,
              bytes: await calculateSize(absolutePath),
            });
          }
          continue;
        }

        if (!dependencyDirectory) await visit(absolutePath);
        continue;
      }

      if (
        entry.isFile() &&
        config.files.some((pattern) =>
          matchesPattern(relativePath, entry.name, pattern),
        )
      ) {
        if (containsTrackedFile(relativePath, tracked))
          protectedPaths.push(relativePath);
        else {
          targets.push({
            absolutePath,
            relativePath,
            bytes: (await lstat(absolutePath)).size,
          });
        }
      }
    }
  }

  await visit(projectRoot);
  targets.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
  protectedPaths.sort();
  return { targets, protectedPaths };
}

async function cleanupConfig(projectRoot: string): Promise<CleanupConfig> {
  if (!(await pathExists(configPath(projectRoot))))
    return DEFAULT_CLEANUP_CONFIG;
  const config = await loadDoctorConfig(projectRoot);
  return config.cleanup ?? DEFAULT_CLEANUP_CONFIG;
}

export async function runCleanupCommand(
  arguments_: string[],
  noColor = false,
): Promise<number> {
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    process.stdout.write(
      "Usage: neon cleanup [--dry-run] [--yes] [--dependencies]\n\n" +
        "Previews generated artifacts, protects tracked files, and removes only confirmed targets.\n",
    );
    return 0;
  }

  const dryRun = arguments_.includes("--dry-run");
  const assumeYes =
    arguments_.includes("--yes") || arguments_.includes("--apply");
  const includeDependencies = arguments_.includes("--dependencies");
  const projectRoot = await resolveProjectRoot();
  assertSafeProjectRoot(projectRoot);

  const config = await cleanupConfig(projectRoot);
  const discovery = await discoverCleanupTargets(
    projectRoot,
    config,
    includeDependencies,
  );
  const totalBytes = discovery.targets.reduce(
    (sum, target) => sum + target.bytes,
    0,
  );

  process.stdout.write(`${heading("Cleanup preview", { noColor })}\n`);
  process.stdout.write(`${info(`Project: ${projectRoot}`, { noColor })}\n`);

  if (discovery.targets.length === 0) {
    process.stdout.write(`${success("Nothing to remove.", { noColor })}\n`);
    return 0;
  }

  for (const target of discovery.targets) {
    process.stdout.write(
      `  ${target.relativePath}  ${formatBytes(target.bytes)}\n`,
    );
  }
  process.stdout.write(
    `\n${discovery.targets.length} targets · ${formatBytes(totalBytes)}\n`,
  );

  if (discovery.protectedPaths.length > 0) {
    process.stdout.write(
      `${warning(`${discovery.protectedPaths.length} tracked paths were protected.`, { noColor })}\n`,
    );
  }

  if (dryRun) {
    process.stdout.write(
      `${success("Dry run complete. Nothing was removed.", { noColor })}\n`,
    );
    return 0;
  }

  if (!assumeYes) {
    if (!isInteractive()) {
      throw new Error(
        "Cleanup requires confirmation. Re-run with --yes or use --dry-run.",
      );
    }

    const prompt = createPromptSession();
    try {
      if (!(await prompt.confirm("Remove these generated artifacts?", false))) {
        process.stdout.write("Cleanup cancelled.\n");
        return 0;
      }
    } finally {
      prompt.close();
    }
  }

  for (const target of discovery.targets) {
    await rm(target.absolutePath, { force: true, recursive: true });
  }

  process.stdout.write(
    `${success(`Removed ${discovery.targets.length} targets and reclaimed ${formatBytes(totalBytes)}.`, { noColor })}\n`,
  );
  if (includeDependencies) {
    process.stdout.write(
      `${warning("Dependencies were removed; reinstall before running Neon again.", { noColor })}\n`,
    );
  }
  if (!(await pathExists(path.join(projectRoot, CONFIG_FILENAME)))) {
    process.stdout.write(
      `${info(`Run the bootstrap setup to create ${CONFIG_FILENAME}.`, { noColor })}\n`,
    );
  }
  return 0;
}
