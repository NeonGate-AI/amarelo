import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export interface PromptSession {
  input(question: string, defaultValue?: string): Promise<string>;
  confirm(question: string, defaultValue?: boolean): Promise<boolean>;
  close(): void;
}

export function isInteractive(): boolean {
  return Boolean(
    stdin.isTTY &&
    stdout.isTTY &&
    process.env.CI !== "true" &&
    process.env.CI !== "1",
  );
}

export function createPromptSession(): PromptSession {
  const readline = createInterface({ input: stdin, output: stdout });

  return {
    async input(question, defaultValue) {
      const suffix = defaultValue === undefined ? "" : ` [${defaultValue}]`;
      const answer = (await readline.question(`${question}${suffix}: `)).trim();
      return answer || defaultValue || "";
    },
    async confirm(question, defaultValue = true) {
      const hint = defaultValue ? "Y/n" : "y/N";
      const answer = (await readline.question(`${question} [${hint}] `))
        .trim()
        .toLowerCase();
      if (!answer) return defaultValue;
      return answer === "y" || answer === "yes";
    },
    close() {
      readline.close();
    },
  };
}
