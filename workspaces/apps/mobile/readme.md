# Mobile

Installable React/Vite PWA for Amarelo's voice-first product experience. The default surface remains voice-first and persists only the approved theme and volume preferences.

SPEC-009 provides a bounded synthetic text driver for engineering validation. It is rendered only when `VITE_AMARELO_TEXT_DRIVER=true`; local development may route `VITE_CONVERSATION_API_URL=/api` through the Vite proxy to `conversation-api`. Messages, responses, request state, and errors remain ephemeral and are excluded from service-worker runtime caches.

SPEC-032 adds an opt-in OpenAI Realtime WebRTC development seam. It is rendered only when `VITE_AMARELO_REALTIME_VOICE=true`. The browser sends its SDP offer to `/api/v1/realtime/session`, the existing Vite proxy forwards that request to `conversation-api`, and the standard `OPENAI_API_KEY` remains server-only. Microphone audio, model audio, Realtime events, and the synthetic `check_calendar` tool are ephemeral and are not runtime-cached.

## Run the Realtime voice demo

Start the existing API in one terminal. `AI_CONVERSATION_MODEL` remains required by the existing text-conversation composition even though the Realtime session itself is pinned to `gpt-realtime-2`.

```sh
OPENAI_API_KEY='<your-openai-api-key>' \
AI_CONVERSATION_MODEL='<your-existing-chat-model>' \
pnpm --filter conversation-api dev
```

Start Mobile in another terminal with the Realtime seam enabled:

```sh
VITE_AMARELO_REALTIME_VOICE=true pnpm --filter mobile dev
```

Open `http://127.0.0.1:3003`, choose **Iniciar voz**, and allow microphone access. A sample tool request is: “O dia 4 de setembro de 2026 às 10:00 está disponível?” The demo calendar is synthetic; it does not read a real calendar.

## Validate

```sh
pnpm --filter mobile typecheck
pnpm --filter mobile test
pnpm exec turbo run build --filter=mobile
```

Canonical product behavior remains in `.agents/specs/003-mobile-voice-experience.spec.md`; the bounded text integration contract is `.agents/specs/023-first-ana-pwa-conversation-baseline.spec.md`; the Realtime WebRTC development contract is `.agents/specs/032-realtime-2-webrtc-voice-agent.spec.md`.
