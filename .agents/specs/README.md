# Amarelo Specifications

## Scope of this prototype

The specifications describe the currently approved prototype surfaces. They do
not define a clinically validated or production-ready mental-health platform.

Priority vocabulary:

- `MUST` — required for the current delivery;
- `SHOULD` — required for a coherent experience;
- `COULD` — useful prototype behavior, not an MVP requirement;
- `LATER` — depends on validation or infrastructure that does not exist yet;
- `OUT OF SCOPE` — must not be changed in the current delivery.

## Codex effort selection

Every specification that guides non-trivial Codex work must apply
[`../rules/codex-prompt-effort-selection.md`](../rules/codex-prompt-effort-selection.md)
and record the selected work classification and model configuration. This rule
does not replace an ADR.

```text
WORK_CLASSIFICATION: [matrix category]
MODEL_CONFIGURATION: [selected configuration]
RATIONALE: [short rationale when the choice is not obvious]
```

## Product surfaces

| Area | Status | Primary document |
|---|---|---|
| Landing | MUST | `landing/overview.md` |
| Console | MUST | `console/overview.md` |
| Design foundation | MUST | `shared/design-foundation.md` |
| Agents and orbs | PROTOTYPE | `shared/agents-and-orbs.md` |
| Mobile | PROTOTYPE | `mobile/voice-experience.md` |
| Onboarding | OUT OF SCOPE | `.gitkeep` |
| Docs app | OUT OF SCOPE | `.gitkeep` |

## Verification commands

```sh
pnpm --filter @repo/ds build
pnpm --filter landing build
pnpm --filter console build
pnpm --filter mobile typecheck
pnpm --filter mobile build
pnpm exec biome check apps/landing apps/console apps/mobile packages/design-system .agents
pnpm --filter landing exec tsc --noEmit
pnpm --filter console exec tsc --noEmit
```

## Permanent boundaries

- Do not use legacy SIM documents as Amarelo product rules.
- Do not redesign the console shell without an approved specification.
- Do not present prototypes as diagnosis, treatment, prevention, or emergency
  support.
- Do not implement production authentication, conversational AI, persistence,
  or data sharing without their own approved contracts.
- Do not modify `apps/onboarding` or `apps/docs` as part of the mobile voice
  prototype.
