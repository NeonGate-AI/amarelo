import { heading, printBanner } from "../core/output.js";

export function runHelpCommand(noColor = false): number {
  printBanner({ noColor });
  process.stdout.write(`${heading("Usage", { noColor })}
  neon                              Start interactive project setup
  neon <command> [options]
  neon <file> [--write | --check]   Format a file by extension

${heading("Commands", { noColor })}
  setup                 Run or update project setup
  changelog <product>   Prepare and open a product changelog MDX file
  env setup             Create local environment files from templates
  env validate          Validate environment files against templates
  cleanup               Preview and remove generated project artifacts
  doctor                Check configured project requirements
  format <file>         Format a supported document

${heading("Formatting", { noColor })}
  JSON, JSONC, YAML, HTML, CSS, Markdown, JavaScript, JSX,
  TypeScript, and TSX

${heading("Options", { noColor })}
  -h, --help      Show help
  -v, --version   Show version
      --no-color  Disable ANSI colors
      --cwd <dir> Run against an exact project directory

${heading("Bootstrap", { noColor })}
  pnpm neon             Run setup once from a project with Neon installed

${heading("After setup", { noColor })}
  neon doctor
  neon changelog amarelo
  neon package.json
  neon src/component.tsx --check
  neon config.yml --write
`);
  return 0;
}
