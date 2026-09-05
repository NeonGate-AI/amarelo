# Engineering workflow skills

## Ownership

`.agents/specs/workflow.md` owns Amarelo's complete delivery lifecycle from discovery through exact-head merge. Local skills are reusable procedures for individual phases; no skill, router or external repository supersedes the workflow.

## Canonical local procedures

The workflow uses seven Matt-Pocock-derived procedures adapted to this repository:

| Procedure | Responsibility |
|---|---|
| `to-spec` | Produce or revise a canonical numbered contract. |
| `to-tickets` | Create vertical GitHub issues and blocking edges. |
| `implement` | Execute approved scope through evidence and merge readiness. |
| `tdd` | Implement behavior at declared public seams. |
| `code-review` | Review Standards and Spec fidelity independently. |
| `domain-modeling` | Maintain vocabulary, ownership and consequential decisions. |
| `writing-for-agents` | Structure durable agent-facing documents and pointers. |

Their normative entry points are `.agents/skills/<name>/SKILL.md` at the checked-out repository revision.

## Provenance boundary

Commit `a50757b5c1bba3455a6098a26d06c01028cf9b46` imported a larger Matt Pocock catalog. SPEC-029 retained the seven procedures above and removed the rest of that import lineage. SPEC-046 subsequently curated all lineages by current use: the seven procedures plus `accessibility`, `frontend-ui-engineering` and `pwa-development` form the maintained ten-skill set. The exact removals and replacements are recorded in `.agents/skills/readme.md`; prior provenance does not require an unused skill to remain installed.

## Reference contract

Active specs, rules, context, templates and `AGENTS.md` point to local skill paths when the procedure is vendored. Remote skill URLs may document attribution or immutable historical evidence, but they do not tell an agent which current procedure to execute.

Retained procedures cannot depend on deleted routers, setup flows, tracker configuration documents or session-management skills. GitHub Issues are the default ticket tracker, the flat `.spec.md` catalog is the behavioral source of truth, and exact-head CI plus two independent review axes form the merge gate.
