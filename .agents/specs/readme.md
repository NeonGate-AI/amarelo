# Specs

Specs have two roles in this repository:

- **Behavior specs** are living current-state contracts grouped by product or workspace area.
- **Numbered delivery specs** define bounded engineering changes and follow `workflow.md`.

Use `template.md` for every new numbered delivery spec. Implemented delivery specs become historical records and keep their original acceptance evidence. Pre-workflow work reconstructed after implementation lives under `history/` and is explicitly marked `mode: retrospective`.

The workflow itself is defined only in `workflow.md`. Rules, context and ADRs remain separate sources of truth and should be referenced rather than copied into a spec.

`SPEC-007` through `SPEC-009` are reserved by active parallel delivery branches, and `SPEC-010` is reserved by the Elo CLI migration. The next available numbered delivery spec is `SPEC-011`.
