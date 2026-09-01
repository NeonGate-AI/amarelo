import { loadDoctorConfig } from "../core/config.js";
import {
  discoverEnvironmentTemplates,
  validateEnvironmentFiles,
} from "../core/environment.js";
import { failure, heading, success } from "../core/output.js";
import { resolveProjectRoot } from "../core/project.js";

export async function runEnvValidateCommand(noColor = false): Promise<number> {
  const projectRoot = await resolveProjectRoot();
  const config = await loadDoctorConfig(projectRoot);
  const templates = await discoverEnvironmentTemplates(
    projectRoot,
    config.environment,
  );
  const issues = await validateEnvironmentFiles(
    projectRoot,
    config.environment,
  );

  process.stdout.write(`${heading("Environment validation", { noColor })}\n`);
  if (templates.length === 0) {
    process.stdout.write(
      `${success("No environment templates were found.", { noColor })}\n`,
    );
    return 0;
  }

  if (issues.length === 0) {
    process.stdout.write(
      `${success(`${templates.length} environment file${templates.length === 1 ? "" : "s"} valid.`, { noColor })}\n`,
    );
    return 0;
  }

  for (const issue of issues) {
    process.stdout.write(
      `  ${failure(issue.target, { noColor })}: ${issue.message}\n`,
    );
  }
  process.stdout.write(
    `${failure(`${issues.length} environment issue${issues.length === 1 ? "" : "s"}.`, { noColor })}\n`,
  );
  return 1;
}
