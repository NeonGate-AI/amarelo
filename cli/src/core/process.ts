import { spawnSync } from "node:child_process";

export interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
  errorCode?: string;
}

export interface RunOptions {
  cwd?: string;
  input?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}

export function runCommand(
  command: string,
  arguments_: string[] = [],
  options: RunOptions = {},
): CommandResult {
  const windowsCommandShim =
    process.platform === "win32" &&
    ["npm", "npx", "pnpm", "yarn"].includes(command);
  const executable = windowsCommandShim ? `${command}.cmd` : command;
  const result = spawnSync(executable, arguments_, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    input: options.input,
    shell: windowsCommandShim,
    timeout: options.timeout ?? 10_000,
    windowsHide: true,
  });

  const commandResult: CommandResult = {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };

  const error = result.error as NodeJS.ErrnoException | undefined;
  if (error?.code) commandResult.errorCode = error.code;

  return commandResult;
}

export function commandVersion(
  command: string,
  arguments_: string[] = ["--version"],
  cwd?: string,
): string | null {
  const result = runCommand(command, arguments_, cwd ? { cwd } : {});
  if (result.status !== 0) return null;

  return result.stdout.trim() || result.stderr.trim() || null;
}
