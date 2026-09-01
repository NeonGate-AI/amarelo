import { constants } from "node:fs";
import { copyFile, lstat, readdir } from "node:fs/promises";
import path from "node:path";

import type { EnvironmentConfig } from "./config.types.js";
import { isRegularFile, readUtf8File } from "./filesystem.js";

export interface EnvironmentTemplate {
  templatePath: string;
  targetPath: string;
  relativeTemplate: string;
  relativeTarget: string;
}

export interface EnvironmentSetupResult {
  created: string[];
  skipped: string[];
}

export interface EnvironmentValidationIssue {
  target: string;
  message: string;
}

function normalizeRelative(value: string): string {
  return value.split(path.sep).join("/");
}

function isExcludedDirectory(
  relativePath: string,
  name: string,
  excluded: Set<string>,
): boolean {
  return excluded.has(name) || excluded.has(normalizeRelative(relativePath));
}

function matchesTemplate(
  relativePath: string,
  name: string,
  templates: Set<string>,
): boolean {
  return templates.has(name) || templates.has(normalizeRelative(relativePath));
}

function targetName(templateName: string): string {
  for (const suffix of [".example", ".template", ".sample"]) {
    if (templateName.endsWith(suffix))
      return templateName.slice(0, -suffix.length);
  }

  throw new Error(`Unsupported environment template suffix: ${templateName}`);
}

export async function discoverEnvironmentTemplates(
  projectRoot: string,
  config: EnvironmentConfig,
): Promise<EnvironmentTemplate[]> {
  const templates = new Set(config.templates.map(normalizeRelative));
  const excluded = new Set(config.excludeDirectories.map(normalizeRelative));
  const discovered: EnvironmentTemplate[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(projectRoot, absolutePath);

      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!isExcludedDirectory(relativePath, entry.name, excluded))
          await visit(absolutePath);
        continue;
      }
      if (
        !entry.isFile() ||
        !matchesTemplate(relativePath, entry.name, templates)
      )
        continue;

      const targetPath = path.join(directory, targetName(entry.name));
      discovered.push({
        templatePath: absolutePath,
        targetPath,
        relativeTemplate: normalizeRelative(relativePath),
        relativeTarget: normalizeRelative(
          path.relative(projectRoot, targetPath),
        ),
      });
    }
  }

  await visit(projectRoot);
  discovered.sort((left, right) =>
    left.relativeTemplate.localeCompare(right.relativeTemplate),
  );

  const targets = new Map<string, string>();
  for (const template of discovered) {
    const previous = targets.get(template.targetPath);
    if (previous) {
      throw new Error(
        `Environment templates ${previous} and ${template.relativeTemplate} both map to ${template.relativeTarget}.`,
      );
    }
    targets.set(template.targetPath, template.relativeTemplate);
  }

  return discovered;
}

export async function setupEnvironmentFiles(
  projectRoot: string,
  config: EnvironmentConfig,
): Promise<EnvironmentSetupResult> {
  const result: EnvironmentSetupResult = { created: [], skipped: [] };
  const templates = await discoverEnvironmentTemplates(projectRoot, config);

  for (const template of templates) {
    try {
      await copyFile(
        template.templatePath,
        template.targetPath,
        constants.COPYFILE_EXCL,
      );
      result.created.push(template.relativeTarget);
    } catch (error) {
      const filesystemError = error as NodeJS.ErrnoException;
      if (filesystemError.code !== "EEXIST") throw error;

      const targetStat = await lstat(template.targetPath);
      if (targetStat.isSymbolicLink()) {
        throw new Error(
          `Refusing to use environment target ${template.relativeTarget}: the path is a symbolic link.`,
        );
      }
      if (!targetStat.isFile()) {
        throw new Error(
          `Refusing to use environment target ${template.relativeTarget}: the path is not a regular file.`,
        );
      }
      result.skipped.push(template.relativeTarget);
    }
  }

  return result;
}

function extractEnvironmentKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const line of content.split(/\r?\n/u)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/u);
    if (match?.[1]) keys.add(match[1]);
  }
  return keys;
}

export async function validateEnvironmentFiles(
  projectRoot: string,
  config: EnvironmentConfig,
): Promise<EnvironmentValidationIssue[]> {
  const issues: EnvironmentValidationIssue[] = [];
  const templates = await discoverEnvironmentTemplates(projectRoot, config);

  for (const template of templates) {
    if (!(await isRegularFile(template.targetPath))) {
      issues.push({
        target: template.relativeTarget,
        message: `missing or unsafe file for ${template.relativeTemplate}`,
      });
      continue;
    }

    const expectedKeys = extractEnvironmentKeys(
      await readUtf8File(template.templatePath),
    );
    const actualKeys = extractEnvironmentKeys(
      await readUtf8File(template.targetPath),
    );

    for (const key of expectedKeys) {
      if (!actualKeys.has(key)) {
        issues.push({
          target: template.relativeTarget,
          message: `missing key ${key}`,
        });
      }
    }
  }

  return issues;
}
