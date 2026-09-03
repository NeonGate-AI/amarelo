---
title: Code style rules
scope: edited TypeScript, JavaScript, TSX, JSX, JSON, and configuration
authority: repository policy
---

# Code style rules

- Treat `biome.json`, package-level `tsconfig.json`, and framework configuration as executable style authority.
- Preserve strict TypeScript. Avoid `any`, unsafe assertions, and duplicated domain types; validate unknown input at boundaries.
- Prefer clear names, small functions, early returns, and explicit data flow over comments that restate code.
- Use existing local patterns before creating a helper, abstraction, dependency, or cross-package API.
- Follow the canonical AI filename, role-suffix, prompt-placement, and module-concern rules in `.agents/rules/source-organization.rule.md`.
- Keep public APIs minimal and typed. Do not export implementation details for convenience.
- Preserve PT-BR user-facing copy unless localization or content is in scope.
- Never edit generated output, `node_modules`, `.next`, `dist`, `.turbo`, or package-manager stores.
- Do not fix unrelated style violations in a scoped change.

Run the configured formatter or linter only on relevant source when practical. Do not hand-format against the repository configuration.
