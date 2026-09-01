import { CONFIG_FILENAME, loadDoctorConfig } from "../core/config.js";
import { setupEnvironmentFiles } from "../core/environment.js";
import { heading, info, success } from "../core/output.js";
import { resolveProjectRoot } from "../core/project.js";

export async function runEnvSetupCommand(noColor = false): Promise<number> {
  const projectRoot = await resolveProjectRoot();
  const config = await loadDoctorConfig(projectRoot);
  const result = await setupEnvironmentFiles(projectRoot, config.environment);

  process.stdout.write(`${heading("Environment setup", { noColor })}\n`);
  process.stdout.write(
    `${info(`Configuration: ${CONFIG_FILENAME}`, { noColor })}\n`,
  );

  for (const target of result.created)
    process.stdout.write(`  created  ${target}\n`);
  for (const target of result.skipped)
    process.stdout.write(`  skipped  ${target}\n`);

  if (result.created.length === 0 && result.skipped.length === 0) {
    process.stdout.write(
      `${success("No environment templates were found.", { noColor })}\n`,
    );
  } else {
    process.stdout.write(
      `${success(`Created ${result.created.length}; skipped ${result.skipped.length} existing files.`, { noColor })}\n`,
    );
  }
  return 0;
}
