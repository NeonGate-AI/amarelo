# Conversation routing spec

Conversation recognizes three conceptual cognitive lanes:

- **Reflex**: minimal/recent context and economical inference.
- **Contextual**: longitudinal Memory projection when needed, without default deep reasoning.
- **Deliberative**: may use Memory, Knowledge/RAG, tools and stronger reasoning when justified.

Routing remains internal to `@ai/conversation`; these lanes are not packages. A future integration handoff will make lane selection measurable in the PWA.
