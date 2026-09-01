import { realpathSync } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { runCommand } from "./process.js";

let projectRootOverride: string | null = null;

export function setProjectRootOverride(projectRoot: string): void {
  projectRootOverride = path.resolve(projectRoot);
}

async function findUp(
  startDirectory: string,
  filename: string,
): Promise<string | null> {
  let current = path.resolve(startDirectory);

  while (true) {
    try {
      await access(path.join(current, filename));
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

export async function resolveProjectRoot(
  startDirectory = process.cwd(),
): Promise<string> {
  if (projectRootOverride) return projectRootOverride;

  const explicitConfigRoot = await findUp(startDirectory, "doctor.config.json");
  if (explicitConfigRoot) return explicitConfigRoot;

  const packageRoot = await findUp(startDirectory, "package.json");
  if (packageRoot) return packageRoot;

  const git = runCommand("git", ["rev-parse", "--show-toplevel"], {
    cwd: startDirectory,
  });
  if (git.status === 0 && git.stdout.trim())
    return path.resolve(git.stdout.trim());

  return path.resolve(startDirectory);
}

export function assertSafeProjectRoot(projectRoot: string): void {
  const canonicalize = (value: string): string => {
    const resolved = path.resolve(value);
    try {
      return realpathSync.native(resolved);
    } catch {
      return resolved;
    }
  };

  const resolved = canonicalize(projectRoot);
  const parsed = path.parse(resolved);
  const userHome = homedir();
  const home = userHome ? canonicalize(userHome) : null;

  if (resolved === parsed.root || resolved === home) {
    throw new Error(`Refusing to operate on unsafe project root: ${resolved}`);
  }
}
