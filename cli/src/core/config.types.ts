export const CHECK_IDS = [
  "node",
  "pnpm",
  "typescript",
  "jq",
  "docker",
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

export interface ToolCheckConfig {
  version: string;
  required: boolean;
  daemon?: boolean;
}

export interface EnvironmentConfig {
  templates: string[];
  excludeDirectories: string[];
}

export interface CleanupConfig {
  directories: string[];
  files: string[];
}

export interface DoctorConfig {
  $schema?: string;
  schemaVersion: 1;
  checks: Partial<Record<CheckId, ToolCheckConfig>> & {
    node: ToolCheckConfig;
    pnpm: ToolCheckConfig;
    jq: ToolCheckConfig;
  };
  environment: EnvironmentConfig;
  cleanup?: CleanupConfig;
}

export interface CheckResult {
  id: CheckId | "environment";
  status: "pass" | "fail" | "warn" | "skip";
  required: boolean;
  expected: string | null;
  actual: string | null;
  detail?: string;
  fix?: string;
}
