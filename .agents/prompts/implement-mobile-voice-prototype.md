# MODE: AMARELO MOBILE VOICE PROTOTYPE — EXECUTION

You are working inside the current Amarelo monorepo.

Implement the approved first native mobile voice vertical slice. Treat
`.agents/specs/mobile/voice-experience.md` and ADR-010 as the executable
contract.

```text
WORK_CLASSIFICATION: Feature normal with bounded platform architecture
MODEL_CONFIGURATION: Terra High
RATIONALE: The task creates one Expo surface and a real audio boundary while production services remain deferred.
```

## Source precedence

1. Explicit instructions in this prompt.
2. `.agents/specs/mobile/voice-experience.md`.
3. ADR-010 and ADR-003.
4. Current repository implementation for observed facts.
5. Applicable repository rules and skills.
6. Official Expo, React Native Reusables, AI Elements, and Rive documentation.

Do not resolve contradictions silently. Stop if a contradiction would change
product, security, privacy, data ownership, or package ownership beyond this
contract.

## Authorized change surface

You MAY modify:

- `apps/mobile/**`;
- the root `package.json` only for a mobile convenience script;
- `pnpm-lock.yaml` as produced by dependency installation;
- `.agents/specs/README.md` to remove the obsolete mobile exclusion;
- `.agents/specs/mobile/**`;
- `.agents/adr/010-mobile-voice-prototype.md`;
- this prompt.

You MUST NOT modify:

- landing or console source;
- the current Web Orb or design-system implementation;
- CLI source;
- AI runtime source;
- onboarding or docs-app source;
- existing ADR decisions other than adding cross-references when necessary;
- tests or checks to hide failures;
- Git history or commits.

## Required implementation

1. Scaffold `apps/mobile` as an Expo SDK 57 TypeScript workspace package.
2. Configure NativeWind and copy only the React Native Reusables primitives
   actually used by the prototype.
3. Preserve upstream provenance and license for copied primitives.
4. Implement a transparent prototype access gate with sign-in and sign-up
   intent. It must state that no real account is created.
5. Implement the primary voice surface with:
   - top-right theme control;
   - dominant `AgentOrb`;
   - accessible state text;
   - bottom-center end-session control;
   - permission and error recovery.
6. Implement an Amarelo-owned native `AgentOrb` with the semantic states
   `idle`, `listening`, `thinking`, `speaking`, and `error` plus normalized
   amplitude `0..1`.
7. Use `expo-audio` native PCM streaming. Calculate RMS input amplitude, update
   the Orb at a bounded rate, and discard every buffer after calculation.
8. Stop the stream on session end and unmount.
9. Honor reduced motion and accessibility labels/live announcements.
10. Keep deliberate end-user copy in Portuguese and developer-facing content
    in English.

## Forbidden substitutions

- Do not install AI Elements in React Native.
- Do not copy Persona Web code or `.riv` assets.
- Do not install a Rive runtime without an approved asset contract.
- Do not choose Clerk, Auth0, Firebase, Supabase Auth, or another production
  identity provider.
- Do not mock an AI response, transcript, thinking delay, or speaking state.
- Do not add chat messages, text input, history, tabs, dashboard, cards, health
  metrics, journal, memory, sharing, or network calls.
- Do not create `packages/react-native` for one consumer.
- Do not refactor unrelated Web or design-system code.

## Validation gates

Run and report:

```sh
pnpm install
pnpm --filter mobile typecheck
pnpm exec biome check apps/mobile
pnpm dlx expo-doctor@latest apps/mobile
pnpm --filter mobile build
git diff --check
git status --short
```

Inspect the complete diff and confirm:

- only authorized paths changed;
- no microphone buffer is persisted or transmitted;
- no fake authentication or AI capability is presented as real;
- no transcript, chat, dashboard, or navigation chrome exists;
- no AI Elements, Persona, Rive, auth vendor, or AI SDK dependency exists;
- copied vendor code retains provenance and its license;
- the mobile build is independently runnable.

Manual device checks that cannot run in the current environment must be listed,
not claimed as passed.

## Stop conditions

Stop without improvising if:

- the repository has conflicting user changes;
- a production auth or AI provider becomes necessary;
- a Persona/Rive asset must be copied to continue;
- microphone handling would persist or transmit data;
- a required change falls outside the authorized paths;
- validation reveals a pre-existing failure unrelated to mobile.

## Final report

Return:

- refined scope implemented;
- files changed;
- dependencies added and why;
- commands and results;
- manual checks still required;
- deferred decisions;
- exact remaining blockers, if any.

Do not claim production readiness. Do not commit.
