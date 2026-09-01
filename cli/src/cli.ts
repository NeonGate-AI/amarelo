#!/usr/bin/env node

import path from "node:path";

import { runChangelogCommand } from "./commands/changelog.command.js";
import { runCleanupCommand } from "./commands/cleanup.command.js";
import { runDoctorCommand } from "./commands/doctor.command.js";
import { runEnvSetupCommand } from "./commands/env-setup.command.js";
import { runEnvValidateCommand } from "./commands/env-validate.command.js";
import { runFormatCommand } from "./commands/format.command.js";
import { runHelpCommand } from "./commands/help.command.js";
import {
  runSetupCommand,
  type SetupCommandOptions,
} from "./commands/setup.command.js";
import { configPath } from "./core/config.js";
import { CliError } from "./core/errors.js";
import { isRegularFile, pathExists } from "./core/filesystem.js";
import { failure, printBanner } from "./core/output.js";
import { resolveProjectRoot, setProjectRootOverride } from "./core/project.js";
import { isInteractive } from "./core/prompt.js";
import { packageVersion } from "./core/version.js";

interface GlobalArguments {
  arguments_: string[];
  noColor: boolean;
}

function parseGlobalArguments(rawArguments: string[]): GlobalArguments {
  const arguments_ = [...rawArguments];
  const noColorIndex = arguments_.indexOf("--no-color");
  const noColor = noColorIndex >= 0;
  if (noColor) arguments_.splice(noColorIndex, 1);

  const cwdIndex = arguments_.indexOf("--cwd");
  if (cwdIndex >= 0) {
    const requestedDirectory = arguments_[cwdIndex + 1];
    if (!requestedDirectory)
      throw new CliError("--cwd requires a directory.", 2);
    const resolvedDirectory = path.resolve(process.cwd(), requestedDirectory);
    process.chdir(resolvedDirectory);
    setProjectRootOverride(resolvedDirectory);
    arguments_.splice(cwdIndex, 2);
  }

  return { arguments_, noColor };
}

function setupOptions(
  arguments_: string[],
  noColor: boolean,
): SetupCommandOptions {
  return {
    assumeYes:
      arguments_.includes("--yes") || arguments_.includes("--non-interactive"),
    force: arguments_.includes("--force"),
    offline: arguments_.includes("--offline"),
    skipInstall: arguments_.includes("--skip-install"),
    noColor,
  };
}

function formatOptions(arguments_: string[]): {
  write: boolean;
  check: boolean;
} {
  return {
    write: arguments_.includes("--write"),
    check: arguments_.includes("--check"),
  };
}

async function run(rawArguments: string[]): Promise<number> {
  const { arguments_, noColor } = parseGlobalArguments(rawArguments);
  const command = arguments_[0];

  if (command === "--version" || command === "-v") {
    process.stdout.write(`${packageVersion()}\n`);
    return 0;
  }

  if (command === "--help" || command === "-h" || command === "help") {
    return runHelpCommand(noColor);
  }

  if (!command) {
    if (!isInteractive()) return runHelpCommand(noColor);
    printBanner({ noColor });
    return runSetupCommand(setupOptions([], noColor));
  }

  if (command === "setup") {
    if (arguments_.includes("--help") || arguments_.includes("-h")) {
      process.stdout.write(
        "Usage: neon setup [--yes] [--offline] [--skip-install] [--force]\n",
      );
      return 0;
    }
    printBanner({ noColor });
    return runSetupCommand(setupOptions(arguments_.slice(1), noColor));
  }

  if (command === "env") {
    const subcommand = arguments_[1];
    if (subcommand === "setup") {
      const projectRoot = await resolveProjectRoot();
      if (!(await pathExists(configPath(projectRoot)))) {
        if (!isInteractive() && !arguments_.includes("--yes")) {
          throw new CliError(
            "Environment setup needs doctor.config.json. Run the bootstrap setup first or pass --yes for inferred defaults.",
            2,
          );
        }
        printBanner({ noColor });
        return runSetupCommand(setupOptions(arguments_.slice(2), noColor));
      }
      return runEnvSetupCommand(noColor);
    }
    if (subcommand === "validate") return runEnvValidateCommand(noColor);
    process.stdout.write(
      "Usage: neon env <setup|validate>\n\n  setup     Create missing env files\n  validate  Check template keys\n",
    );
    return subcommand ? 2 : 0;
  }

  if (command === "changelog") {
    if (arguments_.includes("--help") || arguments_.includes("-h")) {
      process.stdout.write(
        "Usage: neon changelog <product> [--path <file>] [--editor <command>]\n",
      );
      return 0;
    }
    return runChangelogCommand(arguments_.slice(1), noColor);
  }

  if (command === "cleanup")
    return runCleanupCommand(arguments_.slice(1), noColor);

  if (command === "doctor") {
    return runDoctorCommand({
      json: arguments_.includes("--json"),
      strict: arguments_.includes("--strict"),
      noColor,
    });
  }

  if (command === "format") {
    const requestedPath = arguments_.find(
      (argument, index) => index > 0 && !argument.startsWith("--"),
    );
    if (!requestedPath)
      throw new CliError("Usage: neon format <file> [--write | --check]", 2);
    return runFormatCommand(requestedPath, {
      ...formatOptions(arguments_),
      noColor,
    });
  }

  if (await isRegularFile(path.resolve(process.cwd(), command))) {
    return runFormatCommand(command, {
      ...formatOptions(arguments_.slice(1)),
      noColor,
    });
  }

  throw new CliError(
    `Unknown command or file: ${command}. Run \`neon --help\` for available commands.`,
    2,
  );
}

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const exitCode = error instanceof CliError ? error.exitCode : 1;
  process.stderr.write(
    `${failure(message, {
      noColor: process.argv.includes("--no-color"),
      stream: process.stderr,
    })}\n`,
  );
  process.exitCode = exitCode;
}
