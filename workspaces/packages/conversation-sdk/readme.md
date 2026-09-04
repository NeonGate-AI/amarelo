# Conversation SDK

`@repo/conversation-sdk` is the browser-safe transport contract and abortable HTTP client for the bounded Ana conversation seam. It owns strict Zod request, success, metrics, and safe-error schemas. It contains no Node, Fastify, provider, Memory, credential, storage, or service-worker behavior.

The client validates outbound input and inbound payloads, distinguishes timeout, caller abort, network failure, safe server failure, and invalid response, and never exposes an unvalidated server body as application data.
