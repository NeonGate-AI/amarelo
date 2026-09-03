# Conversation context

Conversation is the `@ai/conversation` workspace at `workspaces/ai/orchestrator/conversation/`.

It owns the current interaction: strict turn validation, deterministic cognitive routing, bounded recent-history selection, authorized Memory SDK projection, agent resolution, final agent-facing context and turn diagnostics. It may consume Knowledge through its public contract when a later spec implements that capability.

Named product agents implement Conversation's framework-neutral `ConversationAgentPort`. Conversation does not import LangChain, provider SDKs or named agent packages.

Architectural lanes are Reflex, Contextual and Deliberative. They are internal routing decisions, not separate packages. A memory retrieval failure produces no memory exposure and allows the current turn to continue with `unavailable` diagnostics. Transport, provider and persistence composition remain outside this workspace.
