# @repo/memory-sdk

Cross-workspace, provider-neutral contract for consuming Memory Nucleus. The SDK deliberately contains no HTTP client, bearer-token machinery, repository, prompt, model provider or database implementation in the MVP.

Consumers depend on the `MemoryClient` abstraction and compose a concrete adapter at the integration boundary. Current capabilities are search, explicit remember, correction, forget and consent control.

Memory results are structured, untrusted data. Conversation owns final LLM context assembly.
