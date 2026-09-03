# Conversation API

`conversation-api` is the Node/Fastify composition boundary for the first real Ana text turn. It owns provider configuration, HTTP validation, safe error mapping, and request metrics while keeping `@ai/conversation`, `@ai/ana`, and `@repo/conversation-sdk` provider- and transport-bounded.

The default test path uses Fastify injection and deterministic model doubles. Provider-backed startup requires explicit server-only environment configuration.
