import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface PackageVersion {
  version?: unknown;
}

export function packageVersion(): string {
  try {
    const manifestPath = fileURLToPath(
      new URL("../../package.json", import.meta.url),
    );
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as PackageVersion;
    return typeof manifest.version === "string" ? manifest.version : "unknown";
  } catch {
    return "unknown";
  }
}
