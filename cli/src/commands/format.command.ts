import { lstat } from "node:fs/promises";
import path from "node:path";

import { format, resolveConfig, type BuiltInParserName } from "prettier";

import {
  isRegularFile,
  readUtf8File,
  writeFileAtomically,
} from "../core/filesystem.js";
import { runCommand } from "../core/process.js";

const PARSERS: Readonly<Record<string, BuiltInParserName>> = {
  ".json": "json",
  ".jsonc": "jsonc",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".md": "markdown",
  ".mdx": "mdx",
  ".js": "babel",
  ".jsx": "babel",
  ".mjs": "babel",
  ".cjs": "babel",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
};

export const SUPPORTED_EXTENSIONS = Object.freeze(Object.keys(PARSERS));

export interface FormatCommandOptions {
  write: boolean;
  check: boolean;
  noColor: boolean;
}

async function formatWithPrettier(
  filePath: string,
  source: string,
): Promise<string> {
  const extension = path.extname(filePath).toLowerCase();
  const parser = PARSERS[extension];
  if (!parser) {
    throw new Error(
      `Unsupported file extension ${extension || "(none)"}. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}.`,
    );
  }

  const projectOptions = (await resolveConfig(filePath)) ?? {};
  return format(source, { ...projectOptions, filepath: filePath, parser });
}

function formatJsonForDisplay(
  filePath: string,
  source: string,
  noColor: boolean,
): string | null {
  if (path.extname(filePath).toLowerCase() !== ".json") return null;

  const colorArgument =
    process.stdout.isTTY && !process.env.NO_COLOR && !noColor ? "-C" : "-M";
  const result = runCommand("jq", [colorArgument, "."], {
    cwd: path.dirname(filePath),
    input: source,
  });

  if (result.errorCode === "ENOENT") return null;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `jq could not format ${filePath}.`);
  }

  return result.stdout;
}

export async function runFormatCommand(
  requestedPath: string,
  options: FormatCommandOptions,
): Promise<number> {
  if (options.write && options.check) {
    throw new Error("Use either --write or --check, not both.");
  }

  const filePath = path.resolve(process.cwd(), requestedPath);
  if (!(await isRegularFile(filePath))) {
    throw new Error(
      `File not found, not regular, or is a symbolic link: ${requestedPath}`,
    );
  }

  const source = await readUtf8File(filePath);

  if (!options.write && !options.check) {
    const jqOutput = formatJsonForDisplay(filePath, source, options.noColor);
    process.stdout.write(
      jqOutput ?? (await formatWithPrettier(filePath, source)),
    );
    return 0;
  }

  const formatted = await formatWithPrettier(filePath, source);
  if (options.check) {
    if (formatted === source) {
      process.stderr.write(`${requestedPath} is formatted.\n`);
      return 0;
    }
    process.stderr.write(`${requestedPath} needs formatting.\n`);
    return 1;
  }

  if (formatted === source) {
    process.stderr.write(`${requestedPath} is unchanged.\n`);
    return 0;
  }

  const fileStat = await lstat(filePath);
  await writeFileAtomically(filePath, formatted, fileStat.mode);
  process.stderr.write(`Formatted ${requestedPath}.\n`);
  return 0;
}
