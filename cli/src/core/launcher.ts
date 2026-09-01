import { appendFile, chmod, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { pathExists, writeFileAtomically } from "./filesystem.js";

const LAUNCHER_MARKER = "// Managed by @neongate-ai/neon";
const PATH_BLOCK_START = "# >>> Neongate Neon >>>";
const PATH_BLOCK_END = "# <<< Neongate Neon <<<";

export interface LauncherInstallResult {
  launcherPath: string | null;
  pathReady: boolean;
  profilePath: string | null;
  supported: boolean;
}

function launcherDirectory(): string {
  const override = process.env.NEON_LAUNCHER_DIR?.trim();
  return override
    ? path.resolve(override)
    : path.join(homedir(), ".local", "bin");
}

function pathContains(directory: string): boolean {
  const entries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
  return entries.includes(path.resolve(directory));
}

function shellProfilePath(): string | null {
  const shell = path.basename(process.env.SHELL ?? "");
  if (shell === "zsh") return path.join(homedir(), ".zshrc");
  if (shell === "bash") return path.join(homedir(), ".bashrc");
  return null;
}

async function ensureLauncherDirectoryOnPath(directory: string): Promise<string | null> {
  if (pathContains(directory)) return null;
  if (process.env.NEON_LAUNCHER_DIR) return null;

  const profilePath = shellProfilePath();
  if (!profilePath) return null;
  const existing = (await pathExists(profilePath))
    ? await readFile(profilePath, "utf8")
    : "";
  if (existing.includes(PATH_BLOCK_START)) return profilePath;

  const prefix = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  const block = `${prefix}${PATH_BLOCK_START}\nexport PATH="$HOME/.local/bin:$PATH"\n${PATH_BLOCK_END}\n`;
  await appendFile(profilePath, block, "utf8");
  return profilePath;
}

function posixLauncher(): string {
  return `#!/usr/bin/env node\n${LAUNCHER_MARKER}\nconst fs = require("node:fs");\nconst path = require("node:path");\nconst { spawnSync } = require("node:child_process");\n\nfunction run(cliPath) {\n  const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {\n    cwd: process.cwd(),\n    env: process.env,\n    stdio: "inherit"\n  });\n  process.exit(result.status ?? 1);\n}\n\nlet current = process.cwd();\nwhile (true) {\n  const projectManifestPath = path.join(current, "package.json");\n  const projectCliPath = path.join(current, "dist", "cli.js");\n  try {\n    const projectManifest = JSON.parse(fs.readFileSync(projectManifestPath, "utf8"));\n    if (projectManifest.name === "@neongate-ai/neon" && fs.statSync(projectCliPath).isFile()) {\n      run(projectCliPath);\n    }\n  } catch {}\n\n  const packageRoot = path.join(current, "node_modules", "@neongate-ai", "neon");\n  const manifestPath = path.join(packageRoot, "package.json");\n  const cliPath = path.join(packageRoot, "dist", "cli.js");\n  try {\n    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));\n    if (manifest.name === "@neongate-ai/neon" && fs.statSync(cliPath).isFile()) {\n      run(cliPath);\n    }\n  } catch {}\n\n  const parent = path.dirname(current);\n  if (parent === current) break;\n  current = parent;\n}\n\nprocess.stderr.write("Neon is not installed in this project. Bootstrap it once with 'pnpm neon' from the project root.\\n");\nprocess.exit(127);\n`;
}

export async function installLocalProjectLauncher(
  force: boolean,
): Promise<LauncherInstallResult> {
  if (process.platform === "win32") {
    return {
      launcherPath: null,
      pathReady: false,
      profilePath: null,
      supported: false,
    };
  }

  const directory = launcherDirectory();
  const launcherPath = path.join(directory, "neon");
  if (await pathExists(launcherPath)) {
    const existing = await readFile(launcherPath, "utf8").catch(() => "");
    if (!existing.includes(LAUNCHER_MARKER) && !force) {
      throw new Error(
        `Refusing to replace existing launcher at ${launcherPath}. Re-run setup with --force if it belongs to Neon.`,
      );
    }
  }

  await writeFileAtomically(launcherPath, posixLauncher(), 0o755);
  await chmod(launcherPath, 0o755);
  const profilePath = await ensureLauncherDirectoryOnPath(directory);

  return {
    launcherPath,
    pathReady: pathContains(directory),
    profilePath,
    supported: true,
  };
}
