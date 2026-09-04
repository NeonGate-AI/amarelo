# Product agents context

`workspaces/ai/agents/` is the structural parent for independently declared runtime/product-agent workspaces. It is not a package and it is not the engineering `.agents/` harness. The parent owns no `package.json`, `tsconfig.json`, or `src/`; each named agent owns those artifacts inside `workspaces/ai/agents/<agent>/`.

Ana is the first executable product agent at `workspaces/ai/agents/ana/`, published internally as `@ai/ana`. She implements the framework-neutral `ConversationAgentPort` owned by `@ai/conversation`.

Ana owns:

- the versioned PT-BR instruction artifact `ANA_SYSTEM_PROMPT`;
- conversion of the validated Conversation invocation into a bounded model request;
- explicit formatting of routing and Memory projections as delimited, untrusted context;
- validation of the injected model result and normalized usage metadata.

Ana does not read credentials or environment configuration, construct a provider, select a deployment model, own HTTP transport, retrieve Memory directly, or expose a tool surface. `AnaChatModelPort` is injected. The Node composition boundary in Chatterbox currently adapts LangChain/OpenAI to that port.

The deterministic Ana eval uses a recording model double and makes zero external calls. Future named agents follow the same dependency direction: named agent → `@ai/conversation` public port. Conversation never imports a named agent package.

`pnpm-workspace.yaml` includes `workspaces/ai/agents/*`, so each named agent remains an independent pnpm/Turborepo workspace. Product agents may receive approved Memory projections from Conversation; they never import Memory Nucleus internals.
