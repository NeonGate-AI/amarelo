---
id: SPEC-032
title: Add a minimal Realtime 2 WebRTC voice agent
type: feature
status: in-progress
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/mobile
  - workspaces/apps/conversation-api
context:
  - .agents/context/workflows/mobile.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/002-code-style.rule.md
  - .agents/rules/004-import-boundaries.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/009-react-and-next.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0006-mobile-react-vite-pwa.adr.md
  - .agents/adrs/0020-conversation-agent-port.adr.md
  - .agents/adrs/0023-direct-ai-conversation-topology.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-032: Add a minimal Realtime 2 WebRTC voice agent

## Problem Statement

The Mobile PWA is voice-first, but its current real provider integration is a bounded text-turn baseline. It has no browser microphone transport, model audio playback, WebRTC Realtime session, or Realtime function-call example. A minimal implementation is needed to prove the direct browser-to-provider voice path without exposing the standard OpenAI API key or moving AI orchestration into the application server.

## Solution

Add a small developer-facing Realtime voice seam to the existing Mobile PWA and `conversation-api`.

The browser creates an `RTCPeerConnection`, sends microphone audio, plays the remote model audio track, and opens an `oai-events` data channel. It POSTs its raw SDP offer to the existing application server. The server uses `OPENAI_API_KEY` only to create the WebRTC call by POSTing to `https://api.openai.com/v1/realtime/calls` with multipart `FormData` string fields named exactly `sdp` and `session`, then returns the upstream SDP answer.

The Realtime session uses `gpt-realtime-2`. After the data channel opens, the browser registers one sample function tool with `session.update`: `check_calendar(date, time)`. Tool calls are executed locally against synthetic deterministic demo availability, returned with `conversation.item.create` as `function_call_output`, and followed by `response.create`.

## User Stories

1. As a developer, I can start a Realtime voice session from the existing PWA and speak with `gpt-realtime-2` over WebRTC.
2. As a security reviewer, I can verify that `OPENAI_API_KEY` remains server-side and that browser SDP is exchanged through a narrow session endpoint.
3. As a developer, I can ask the voice model whether a sample date/time is available and observe a complete Realtime function-call round trip.
4. As a user of the demo, I can stop the session and have microphone tracks, peer connection, data channel and audio output cleaned up.

## Scope

- Existing `workspaces/apps/mobile` PWA only; no second web application.
- Existing `workspaces/apps/conversation-api` only; no new backend service.
- Browser microphone capture and model audio output through WebRTC.
- A same-origin browser call to `/api/v1/realtime/session`, mapped by the existing Vite proxy to server route `/v1/realtime/session` in local development.
- Server exchange with OpenAI `POST /v1/realtime/calls` using standard `OPENAI_API_KEY`.
- `oai-events` data channel lifecycle and one synthetic `check_calendar(date, time)` tool.
- Minimal setup/run documentation and deterministic tests around pure/tool and server seams.

## Implementation Decisions

- Follow the current OpenAI Realtime WebRTC application-server pattern: the browser sends raw `application/sdp` to the application server; the application server submits multipart `FormData` to OpenAI.
- The OpenAI multipart body contains plain string fields named `sdp` and `session`. `Blob`, `File`, file uploads, and a manually authored multipart `Content-Type` header are prohibited.
- `session` serializes a Realtime session with `type: "realtime"`, `model: "gpt-realtime-2"`, and audio output voice `marin`.
- The standard OpenAI API key never enters Mobile source, response payloads, logs, or browser-visible configuration.
- Browser ownership is intentionally narrow: WebRTC transport, microphone/audio attachment, Realtime client events, and execution of the synthetic sample tool. This does not reintroduce a server AI orchestrator and does not bypass Conversation or Memory Nucleus for durable application state.
- Tool registration happens over `oai-events` with a `session.update` containing one function tool named `check_calendar`, with required string parameters `date` and `time` and `additionalProperties: false`.
- The demo calendar is synthetic and deterministic: valid ISO date plus `HH:mm` times are available Monday-Friday from 09:00 inclusive to 17:00 exclusive, except 12:00-12:59; other inputs or times are unavailable. The result contains only the requested date/time and boolean availability.
- Tool output is sent as JSON text in a `function_call_output` item using the received `call_id`, then the browser emits `response.create`.
- No audio, transcript, tool arguments, responses, or Realtime session data are persisted or service-worker runtime-cached.
- The minimal Realtime UI is explicitly opt-in for development through `VITE_AMARELO_REALTIME_VOICE=true`; the default product surface remains unchanged when the flag is absent.

## Testing Decisions

### Primary seam

Fastify `app.inject()` verifies the public `/v1/realtime/session` contract with an injected fetch double: raw SDP is accepted, the OpenAI call URL/method/auth are correct, `FormData` contains string `sdp` and `session` fields, and the SDP answer is returned without exposing credentials.

### Secondary seams

- Pure Mobile tool tests verify valid/invalid date-time behavior and deterministic synthetic availability.
- Mobile build/typecheck verify browser WebRTC types and the opt-in UI integration.
- Manual local browser smoke verifies microphone permission, remote audio, data-channel open, session update, tool round trip and cleanup because CI cannot establish a real microphone/WebRTC media path.

### Fixtures and privacy

Use synthetic SDP, synthetic dates/times and fake API keys in automated tests. Do not capture or commit real microphone audio, transcripts, provider responses, private calendar data, user history, Memory content or credentials.

### Required validation

Run the focused `conversation-api` tests/typecheck, Mobile tests/typecheck/build, repository formatting/audits applicable to edited files, and a final diff review against this spec. A live provider smoke is optional and must use local credentials only.

## Acceptance Criteria

- [ ] Mobile can opt into a minimal `gpt-realtime-2` WebRTC voice agent without adding a second app.
- [ ] Browser microphone input is added to `RTCPeerConnection` and model audio output is attached from the remote track.
- [ ] The browser creates an `oai-events` data channel and uses it for Realtime client/server events.
- [ ] The server endpoint uses `OPENAI_API_KEY` and posts to `https://api.openai.com/v1/realtime/calls` with plain multipart string fields named exactly `sdp` and `session`; no multipart file upload is used.
- [ ] The serialized session uses `type: realtime` and model `gpt-realtime-2`.
- [ ] `check_calendar(date, time)` is registered with `session.update`, executed against synthetic deterministic availability, returned as `function_call_output`, and followed by `response.create`.
- [ ] Stop/unmount cleanup closes media tracks, data channel and peer connection and detaches remote audio.
- [ ] Provider/session failures are visible to the developer without exposing the API key or raw internal stack details to the browser.
- [ ] No audio, transcript, Realtime content or tool data is persisted or runtime-cached.
- [ ] Setup/run documentation states the required environment variables and commands.
- [ ] Focused tests, typechecks and Mobile build pass.

## Failure Behavior

Missing `OPENAI_API_KEY` prevents provider-backed server startup through the existing environment validation. Missing or empty SDP returns a safe client error without calling OpenAI. Upstream non-2xx responses return a generic correlated gateway error rather than forwarding provider secrets or raw failure bodies. Browser permission, negotiation, data-channel or media failures transition the demo to a visible error state and clean up any partially created tracks/connections. Malformed or unrelated Realtime events are ignored; malformed tool arguments produce an unavailable synthetic result rather than throwing out of the data-channel handler.

## Out of Scope

Production authentication/authorization, billing and entitlement enforcement, real calendar integrations, Memory ingestion or retrieval, transcript persistence, conversation persistence, sideband WebSocket control, SIP, production telemetry, clinical workflows, support escalation, multi-agent routing, Nico/Isa tools, provider abstraction, and replacing the existing Conversation runtime are not owned by this spec.

## Evidence and Promotion

Expected evidence is the server injection test for the exact multipart exchange, Mobile deterministic tool tests, typechecks/build, final diff review, and optional local WebRTC smoke. Proven transport constraints may be promoted into Mobile/conversation-api context after validation; no new architectural rule or ADR is required unless implementation reveals a broader ownership decision.

## Further Notes

The OpenAI WebRTC documentation currently demonstrates the unified application-server route as browser SDP → developer server → `POST /v1/realtime/calls`, and uses `RTCPeerConnection`, browser microphone tracks, remote audio tracks and an `oai-events` data channel. Realtime conversation documentation defines `session.update` tools and the `function_call_output` → `response.create` completion loop. This spec deliberately pins the requested `gpt-realtime-2` model even though newer Realtime model revisions may exist.