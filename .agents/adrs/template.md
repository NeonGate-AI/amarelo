# ADR authoring

The single canonical authoring template is [adr.prompt.md](../prompts/adr.prompt.md). Use `elo adr` to allocate the next free identity and render that template, then update [the ADR catalog](readme.md). This support document is a pointer, not a second skeleton.

Keep the filename prefix, YAML `id` and heading identity equal. Metadata records status and supersession; decision text explains the original tradeoff. Preserve historical decisions with explicit supersession instead of rewriting them as current implementations. Unknown dates in normalized legacy records remain `null` rather than invented.
