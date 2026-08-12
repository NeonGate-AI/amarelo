# Amarelo mobile prototype

The mobile app is a bounded Expo prototype for the product hypothesis
`MOBILE = CONVERSATION`. It contains a transparent local access gate and a
voice surface whose native Orb reacts to real microphone amplitude.

## Run

From the repository root:

```bash
pnpm install
pnpm mobile
```

Open the app on Android or iOS and grant microphone permission. A physical
device gives the most representative microphone and motion check; Expo Go or a
development build can be used for this prototype.

## Verification

```bash
pnpm --filter mobile typecheck
pnpm --filter mobile build
pnpm dlx expo-doctor@latest apps/mobile
```

Manual checks are defined in
`.agents/specs/mobile/voice-experience.md`. In particular, verify permission
grant and denial, visible Orb response to speech, theme switching, reduced
motion, and session termination.

## Runtime boundaries

- PCM microphone buffers are reduced to an RMS amplitude and discarded.
- No recording, transcript, conversation, or account is persisted.
- No model, Realtime transport, Rive runtime, or production authentication
  provider is connected.
- `idle`, `listening`, `thinking`, `speaking`, and `error` are supported visual
  states. This slice only enters states backed by its real local runtime.

The Orb remains app-owned until a second native consumer demonstrates a shared
boundary. Shared React Native Reusables primitives and their provenance live in
`packages/react-mobile` and are consumed through `@repo/react-mobile/ui/*`.
