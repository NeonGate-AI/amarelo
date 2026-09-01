import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { CliError } from "../core/errors.js";
import { pathExists, writeFileAtomically } from "../core/filesystem.js";
import { info, success } from "../core/output.js";
import { commandVersion } from "../core/process.js";
import { assertSafeProjectRoot, resolveProjectRoot } from "../core/project.js";

interface ChangelogOptions {
  editor?: string;
  targetPath?: string;
}

function argumentValue(arguments_: string[], flag: string): string | undefined {
  const index = arguments_.indexOf(flag);
  if (index < 0) return undefined;
  const value = arguments_[index + 1];
  if (!value || value.startsWith("--")) {
    throw new CliError(`${flag} requires a value.`, 2);
  }
  return value;
}

function productArgument(arguments_: string[]): string | undefined {
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!argument) continue;
    if (argument === "--editor" || argument === "--path") {
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) continue;
    return argument;
  }
  return undefined;
}

function parseOptions(arguments_: string[]): ChangelogOptions {
  const editor = argumentValue(arguments_, "--editor");
  const targetPath = argumentValue(arguments_, "--path");
  return {
    ...(editor ? { editor } : {}),
    ...(targetPath ? { targetPath } : {}),
  };
}

function titleForProduct(product: string): string {
  const known: Record<string, string> = {
    amarelo: "Amarelo",
    neon: "Neon",
    neongate: "Neongate AI",
    orbz: "Orbz",
  };
  return (
    known[product] ??
    product
      .split("-")
      .filter(Boolean)
      .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
      .join(" ")
  );
}

function templateBlock(lineEnding: string): string {
  const lines = [
    "## Unreleased",
    "",
    "### Added",
    "",
    "- ",
    "",
    "### Changed",
    "",
    "- ",
    "",
    "### Fixed",
    "",
    "- ",
    "",
    "### Removed",
    "",
    "- ",
    "",
  ];
  return lines.join(lineEnding);
}

function insertTemplate(content: string, product: string): string {
  if (/^##\s+Unreleased\s*$/imu.test(content)) return content;

  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  const block = templateBlock(lineEnding);
  if (content.trim().length === 0) {
    return `# ${titleForProduct(product)} Changelog${lineEnding}${lineEnding}${block}`;
  }

  let insertAt = 0;
  if (content.startsWith(`---${lineEnding}`)) {
    const closing = content.indexOf(`${lineEnding}---${lineEnding}`, 3);
    if (closing >= 0) insertAt = closing + `${lineEnding}---${lineEnding}`.length;
  }

  const remainder = content.slice(insertAt);
  const leadingWhitespace = remainder.match(/^(?:[ \t]*\r?\n)*/u)?.[0] ?? "";
  const afterWhitespace = insertAt + leadingWhitespace.length;
  const h1 = content.slice(afterWhitespace).match(/^#\s+[^\r\n]+\r?\n/u)?.[0];
  if (h1) insertAt = afterWhitespace + h1.length;

  while (content.slice(insertAt).startsWith(lineEnding)) {
    insertAt += lineEnding.length;
  }

  const before = content.slice(0, insertAt).replace(/[ \t]+$/u, "");
  const after = content.slice(insertAt).replace(/^(?:\r?\n)+/u, "");
  return `${before}${lineEnding}${lineEnding}${block}${after ? `${lineEnding}${after}` : ""}`;
}

function ensureInsideProject(projectRoot: string, targetPath: string): void {
  const relative = path.relative(projectRoot, targetPath);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }
  throw new CliError("Changelog target must stay inside the current project.", 2);
}

function resolveEditor(explicit?: string): string {
  if (explicit) return explicit;
  if (process.env.VISUAL?.trim()) return process.env.VISUAL.trim();
  if (process.env.EDITOR?.trim()) return process.env.EDITOR.trim();
  if (commandVersion("code", ["--version"])) return "code --wait";
  if (commandVersion("nano", ["--version"])) return "nano";
  if (commandVersion("vim", ["--version"])) return "vim";
  throw new CliError(
    "No editor found. Set $VISUAL or $EDITOR, install VS Code/nano, or pass --editor.",
    2,
  );
}

interface EditorInvocation {
  arguments: string[];
  command: string;
}

function parseEditorCommand(editor: string): EditorInvocation {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (const character of editor.trim()) {
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (/\s/u.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (quote) throw new CliError("Editor command has an unclosed quote.", 2);
  if (current) tokens.push(current);

  const command = tokens.shift();
  if (!command) throw new CliError("Editor command cannot be empty.", 2);
  return { command, arguments: tokens };
}

function openEditor(editor: string, filePath: string, projectRoot: string): void {
  const invocation = parseEditorCommand(editor);
  const windowsCommandShim =
    process.platform === "win32" && /\.(?:cmd|bat)$/iu.test(invocation.command);
  const result = spawnSync(
    invocation.command,
    [...invocation.arguments, filePath],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
      shell: windowsCommandShim,
      windowsHide: false,
    },
  );

  if (result.error) {
    throw new CliError(
      `Could not open editor ${invocation.command}: ${result.error.message}`,
      1,
    );
  }
  if ((result.status ?? 1) !== 0) {
    throw new CliError(`Editor exited with status ${result.status ?? 1}.`, 1);
  }
}

export async function runChangelogCommand(
  arguments_: string[],
  noColor = false,
): Promise<number> {
  const product = productArgument(arguments_);
  if (!product) {
    throw new CliError(
      "Usage: neon changelog <product> [--path <file>] [--editor <command>]",
      2,
    );
  }
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(product)) {
    throw new CliError(
      "Product must be a lowercase slug such as orbz, amarelo, or neon.",
      2,
    );
  }

  const options = parseOptions(arguments_);
  const projectRoot = await resolveProjectRoot();
  assertSafeProjectRoot(projectRoot);
  const targetPath = path.resolve(
    projectRoot,
    options.targetPath ?? path.join("content", product, "changelog.mdx"),
  );
  ensureInsideProject(projectRoot, targetPath);

  if (!options.targetPath) {
    const productDirectory = path.dirname(targetPath);
    if (!(await pathExists(productDirectory))) {
      throw new CliError(
        `Docs product directory does not exist: ${path.relative(projectRoot, productDirectory)}.`,
        2,
      );
    }
  } else {
    await mkdir(path.dirname(targetPath), { recursive: true });
  }

  const current = (await pathExists(targetPath))
    ? await readFile(targetPath, "utf8")
    : "";
  const prepared = insertTemplate(current, product);
  if (prepared !== current) await writeFileAtomically(targetPath, prepared);

  const relativePath = path.relative(projectRoot, targetPath);
  process.stdout.write(
    `${success(`Prepared ${relativePath}`, { noColor })}\n`,
  );
  const editor = resolveEditor(options.editor);
  process.stdout.write(`${info(`Opening with ${editor}`, { noColor })}\n`);
  openEditor(editor, targetPath, projectRoot);
  return 0;
}
