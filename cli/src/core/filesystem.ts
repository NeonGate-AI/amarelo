import {
  chmod,
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function isRegularFile(filePath: string): Promise<boolean> {
  try {
    const fileStat = await lstat(filePath);
    return fileStat.isFile() && !fileStat.isSymbolicLink();
  } catch {
    return false;
  }
}

export async function readUtf8File(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

export async function writeFileAtomically(
  filePath: string,
  content: string,
  mode?: number,
): Promise<void> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });

  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  try {
    await writeFile(temporaryPath, content, "utf8");
    if (mode !== undefined) await chmod(temporaryPath, mode);
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export function detectIndentation(content: string): string {
  const match = content.match(/^([ \t]+)"/m);
  return match?.[1] ?? "  ";
}

export function detectLineEnding(content: string): "\n" | "\r\n" {
  return content.includes("\r\n") ? "\r\n" : "\n";
}
