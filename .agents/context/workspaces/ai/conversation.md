# Conversation context

Conversation owns the current interaction: final context assembly, tools, agent-facing behavior and routing. It consumes authorized memory through `@repo/memory-sdk` and may consume Knowledge through its public contract.

Architectural lanes are Reflex, Contextual and Deliberative. They are a routing concept, not separate packages. See the routing spec.
