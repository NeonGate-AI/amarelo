# Mobile Voice Experience Prototype

- **Status:** Approved for prototype implementation
- **Date:** 2026-08-10
- **Related decisions:** ADR-003, ADR-006, ADR-010

```text
WORK_CLASSIFICATION: Feature normal with bounded platform architecture
MODEL_CONFIGURATION: Terra High
RATIONALE: The work creates a new Expo surface and audio boundary while keeping production services explicitly deferred.
```

## 1. Objective

Create the first runnable Amarelo mobile vertical slice. The application is a
minimal voice-presence surface, not a mobile copy of the Web console.

The prototype must demonstrate this product division:

```text
MOBILE = CONVERSATION
WEB = CONTEXT + CONTROL
```

Success means a reviewer can open the native app, pass through an explicitly
non-production access gate, grant microphone permission, see a native
Amarelo-owned Orb react to real microphone amplitude, switch theme, and end the
session without encountering chat, transcript, dashboard, or health-metric UI.

## 2. Repository baseline

- `apps/mobile` contains only `.gitkeep` before this change.
- The repository is a pnpm/Turborepo monorepo.
- `@repo/ds` currently exposes CSS foundations and a Web-only `SiriOrb`.
- The repository does not currently contain `@repo/react-web` or
  `@repo/react-native` packages.
- ADR-003 already establishes `APP = CONVERSATION` and
  `WEB = CONTEXT + CONTROL` as a prototype hypothesis.
- Authentication, conversational AI transport, memory, persistence, and data
  sharing do not exist in mobile runtime.

## 3. Technology contract

The prototype MUST use:

- Expo SDK 57 and React Native;
- TypeScript in strict mode;
- NativeWind as the styling adapter required by the selected React Native
  Reusables source components;
- locally controlled React Native Reusables primitives for ordinary controls;
- `expo-audio` PCM microphone streaming for real input amplitude;
- `expo-linear-gradient` and native animation primitives for the first-party
  Orb renderer;
- the repository's Amarelo color direction.

The prototype MUST NOT:

- mount the Web AI Elements Persona component in React Native;
- copy or embed a Persona `.riv` asset without verified provenance, license,
  state-machine names, and numeric inputs;
- add the Rive native runtime before an approved asset and renderer contract
  require it;
- create `packages/react-native` before demonstrated cross-app ownership;
- move or refactor the existing Web Orb;
- select a production authentication vendor;
- connect to an AI model, Realtime API, WebSocket, memory store, or backend;
- persist or upload microphone buffers;
- display transcripts, messages, histories, dashboards, or navigation tabs.

## 4. Product flow

```text
Prototype access gate
        |
        v
Native voice surface
        |
        +-- theme control
        +-- audio-reactive AgentOrb
        +-- end-session control
```

### Prototype access gate

The gate MUST expose sign-in and sign-up intent without pretending that a real
account is created. Copy and accessibility hints MUST state that the action
opens a local prototype only.

Production authentication is `LATER` and requires a separate decision.

### Voice surface

On entry, the app SHOULD request microphone permission and start a native PCM
stream after permission is granted. The stream MUST remain local in this
prototype and MUST stop when the session ends or the screen unmounts.

The surface MUST contain only:

- a minimal theme control near the top-right;
- the `AgentOrb` as the dominant element;
- a short accessible state label;
- a bottom-center end-session control;
- concise permission/error recovery when required.

## 5. AgentOrb contract

```ts
interface AgentOrbProps {
  amplitude?: number
  state?: AgentOrbState
}

type AgentOrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
```

Requirements:

- `amplitude` is normalized to `0..1` at the component boundary.
- The Orb translates semantic state and amplitude into native visual motion.
- The Orb does not know about models, protocols, prompts, transcripts, tools,
  memory, or persistence.
- State remains understandable through adjacent accessible text; color and
  motion are never the only signals.
- Reduced-motion preference disables continuous decorative rotation and
  amplitude scaling.
- The renderer remains app-colocated until reuse is demonstrated.

`thinking` and `speaking` are supported by the renderer contract but MUST NOT be
faked by the prototype when no AI runtime exists.

## 6. Voice-session boundary

The voice-session hook owns:

- microphone permission;
- PCM stream start/stop lifecycle;
- local RMS amplitude calculation;
- normalized amplitude throttling;
- session state and recoverable errors.

It does not own:

- network transport;
- AI orchestration;
- transcription;
- playback;
- conversation storage;
- journal or memory generation.

The buffer callback MUST calculate amplitude and then discard the buffer. No
recording file or transcript is created by this prototype.

## 7. Theme and design

- Support light and dark modes from the primary voice surface.
- Use the Amarelo yellow anchor `#FAD715` and warm neutral direction already
  present in `packages/design-system/foundation`.
- Keep the canvas quiet and the Orb visually dominant.
- Use comfortable touch targets of at least 44 by 44 points.
- Use Portuguese for intentional end-user prototype copy and English for code,
  documentation, comments, and developer-facing messages.

## 8. Accessibility

- Every icon-only control MUST have an accessible label and hint.
- Dynamic voice state and permission errors MUST be announced.
- Controls MUST remain operable with screen readers and switch access.
- The interface MUST preserve sufficient contrast in both themes.
- Reduced-motion preference MUST be honored.
- The prototype access gate MUST not imply that a real authentication action
  occurred.

## 9. Explicit non-goals

- Real sign in or sign up.
- Google, Apple, passkey, email, or password integration.
- AI responses or synthesized audio playback.
- Barge-in or interruption logic.
- Rive asset integration.
- Agent selection.
- Transcript UI or message bubbles.
- Dashboard, charts, journal, memory, permissions, network, or professional
  management.
- Background recording.
- Production privacy, retention, or consent flows.
- App Store or Play Store release configuration.

## 10. Acceptance criteria

- `apps/mobile` is a valid Expo workspace package.
- The app reaches the prototype gate without a backend.
- Both access actions transparently open the same local prototype and do not
  claim to authenticate.
- Granting microphone permission starts a PCM stream.
- Real PCM samples drive a normalized `AgentOrb` amplitude.
- Ending the session stops microphone capture and returns to the access gate.
- Permission denial produces an accessible recovery action.
- Theme switching works from the voice surface.
- No transcript, chat, dashboard, or navigation chrome is present.
- No AI Elements, Persona, `.riv`, Rive runtime, auth vendor, or AI SDK
  dependency is added.
- TypeScript, Biome, Expo Doctor, and an Android export pass.
- No unrelated landing, console, CLI, AI, onboarding, or docs-app source is
  changed.

## 11. Verification

```sh
pnpm install
pnpm --filter mobile typecheck
pnpm exec biome check apps/mobile
pnpm dlx expo-doctor@latest apps/mobile
pnpm --filter mobile build
git diff --check
```

Manual device verification remains required for microphone permission, actual
amplitude response, safe-area placement, screen-reader announcements, and
reduced-motion behavior.

## 12. Deferred decisions

- Production authentication provider and session persistence.
- Conversational AI and realtime transport.
- Agent audio playback and output-amplitude sampling.
- Persona asset provenance and whether its state model is reusable.
- Rive runtime selection and development-build requirements.
- Whether an actual shared native package is justified.
- The post-session destination once Web context and control flows exist.
