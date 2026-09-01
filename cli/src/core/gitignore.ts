import { readFile } from "node:fs/promises";
import path from "node:path";

import { pathExists, writeFileAtomically } from "./filesystem.js";

export async function ensureGitignoreEntry(
  projectRoot: string,
  entry: string,
): Promise<boolean> {
  const filePath = path.join(projectRoot, ".gitignore");
  const existing = (await pathExists(filePath))
    ? await readFile(filePath, "utf8")
    : "";
  const lines = existing.split(/\r?\n/u).map((line) => line.trim());
  if (lines.includes(entry)) return false;

  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  await writeFileAtomically(filePath, `${prefix}${entry}\n`);
  return true;
}
