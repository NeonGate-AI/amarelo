# Conversation routing spec

Conversation selects one of three cognitive lanes with deterministic code and zero routing-model calls:

- **Reflex**: narrowly recognized greetings, acknowledgements and brief social turns. Budget: 800 estimated context tokens, 0 Memory tokens, low reasoning, no Knowledge or tools.
- **Contextual**: default lane. Budget: 4,000 estimated context tokens, up to 300 Memory tokens, medium reasoning, no Knowledge or tools by default.
- **Deliberative**: explicit planning, comparison, research, architecture or analysis requests, plus unusually large input. Budget: 8,000 estimated context tokens, up to 600 Memory tokens, high reasoning, with Knowledge/tools permitted when later implemented.

Current user input is preserved. Recent history is selected as a contiguous newest suffix within the lane context estimate. The estimate is provider-neutral and versioned rather than tokenizer-perfect.

Memory retrieval is skipped for Reflex. For other lanes, failure yields an empty projection and explicit unavailable diagnostics while the current conversation continues. Routing remains internal to `@ai/conversation`; lanes are not packages.
