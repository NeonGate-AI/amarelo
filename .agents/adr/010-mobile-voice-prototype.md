# ADR-010: Build the first mobile voice surface with native platform boundaries

- **Status:** Accepted for prototype implementation
- **Date:** 2026-08-10

## Context

ADR-003 establishes the product hypothesis `APP = CONVERSATION` and
`WEB = CONTEXT + CONTROL`, but `apps/mobile` is currently empty. The requested
mobile direction requires an immediate, voice-first surface whose Orb reacts to
sound without turning the app into a chat or dashboard.

AI Elements Persona is a WebGL2 React component. Rive provides a React Native
runtime, but the Persona `.riv` assets, state-machine contract, numeric inputs,
and asset-level reuse terms have not been verified for this repository.
Authentication and conversational AI providers are also undecided.

## Decision

For the first prototype:

- use Expo SDK 57 and React Native;
- use locally controlled React Native Reusables source primitives with
  NativeWind for ordinary controls;
- keep `AgentOrb` app-colocated and Amarelo-owned;
- implement the first Orb renderer with native views, gradients, and animation;
- capture real microphone PCM through `expo-audio` and derive local RMS
  amplitude for the Orb;
- keep authentication as an explicitly labeled local prototype gate;
- keep AI transport, playback, persistence, transcript, and memory out of the
  runtime;
- defer Rive until the exact asset and state contract are approved;
- defer `packages/react-native` until reuse or another explicit ownership reason
  exists;
- do not change the current Web Orb or its package ownership in this work.

## Alternatives considered

### Mount AI Elements Persona directly in React Native

Rejected. The published component is WebGL2/browser-oriented and is not a
native React Native renderer.

### Add the Rive runtime and copy Persona assets immediately

Deferred. Runtime support exists, but embedding an unverified asset would make
provenance and state-machine assumptions part of the product architecture.

### Share the current Web Orb implementation

Rejected. The current component depends on DOM, CSS, and Motion for React. Web
and Native should share semantic intent, not a renderer.

### Create `@repo/react-native` before implementing the app

Deferred. One consumer does not yet demonstrate shared package ownership.

### Choose production authentication now

Rejected for this prototype. The product direction explicitly leaves the
provider unresolved, and provider selection would introduce a durable security
and identity decision unrelated to validating the voice surface.

## Consequences

- The prototype can run without backend credentials or an authentication
  vendor.
- Microphone amplitude is real, while thinking and speaking states are not
  simulated.
- No conversation data leaves the device in this iteration.
- The initial native Orb may later be replaced behind the same semantic API.
- Rive integration will require a follow-up decision with asset provenance,
  development-build implications, state mapping, and output-amplitude tests.
- The Web renderer remains unchanged and may be reconciled separately.
