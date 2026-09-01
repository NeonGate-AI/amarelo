import { Writable } from "node:stream";

const RESET = "\u001B[0m";
const DIM = "\u001B[2m";
const BOLD = "\u001B[1m";

const BRAND = {
  cyan: "\u001B[38;2;0;233;255m",
  violet: "\u001B[38;2;108;92;255m",
  pink: "\u001B[38;2;255;77;222m",
  peach: "\u001B[38;2;255;176;122m",
  green: "\u001B[38;2;80;220;160m",
  yellow: "\u001B[38;2;255;202;92m",
  red: "\u001B[38;2;255;95;120m",
} as const;

const LOGO_LINES: ReadonlyArray<readonly [string, string, string, string]> = [
  ["███╗   ██╗", "███████╗", " ██████╗ ", "███╗   ██╗"],
  ["████╗  ██║", "██╔════╝", "██╔═══██╗", "████╗  ██║"],
  ["██╔██╗ ██║", "█████╗  ", "██║   ██║", "██╔██╗ ██║"],
  ["██║╚██╗██║", "██╔══╝  ", "██║   ██║", "██║╚██╗██║"],
  ["██║ ╚████║", "███████╗", "╚██████╔╝", "██║ ╚████║"],
  ["╚═╝  ╚═══╝", "╚══════╝", " ╚═════╝ ", "╚═╝  ╚═══╝"],
];

export interface OutputOptions {
  noColor?: boolean;
  stream?: Writable;
}

function supportsColor(options: OutputOptions = {}): boolean {
  const stream = options.stream ?? process.stdout;
  const hasTty = "isTTY" in stream && Boolean(stream.isTTY);

  return (
    !options.noColor &&
    !process.env.NO_COLOR &&
    process.env.TERM !== "dumb" &&
    (hasTty || process.env.FORCE_COLOR === "1")
  );
}

function paint(value: string, color: string, enabled: boolean): string {
  return enabled ? `${color}${value}${RESET}` : value;
}

export function printBanner(options: OutputOptions = {}): void {
  const stream = options.stream ?? process.stdout;
  const colored = supportsColor({ ...options, stream });
  const colors = [BRAND.cyan, BRAND.violet, BRAND.pink, BRAND.peach] as const;

  stream.write("\n");
  for (const line of LOGO_LINES) {
    const rendered = line
      .map((part, index) => paint(part, colors[index] ?? "", colored))
      .join(" ");
    stream.write(`${rendered}\n`);
  }

  const subtitle = "Neongate AI · Developer CLI";
  stream.write(
    colored ? `\n${DIM}${subtitle}${RESET}\n\n` : `\n${subtitle}\n\n`,
  );
}

export function heading(value: string, options: OutputOptions = {}): string {
  return supportsColor(options) ? `${BOLD}${value}${RESET}` : value;
}

export function success(value: string, options: OutputOptions = {}): string {
  return `${paint("✓", BRAND.green, supportsColor(options))} ${value}`;
}

export function warning(value: string, options: OutputOptions = {}): string {
  return `${paint("!", BRAND.yellow, supportsColor(options))} ${value}`;
}

export function failure(value: string, options: OutputOptions = {}): string {
  return `${paint("✗", BRAND.red, supportsColor(options))} ${value}`;
}

export function info(value: string, options: OutputOptions = {}): string {
  return `${paint("•", BRAND.cyan, supportsColor(options))} ${value}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 ** 2) return `${(bytes / 1_024).toFixed(1)} KiB`;
  if (bytes < 1_024 ** 3) return `${(bytes / 1_024 ** 2).toFixed(1)} MiB`;
  return `${(bytes / 1_024 ** 3).toFixed(1)} GiB`;
}
