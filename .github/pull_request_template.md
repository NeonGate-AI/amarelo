<!--
The delivery spec is the source of truth. Keep this PR body as a concise
execution, evidence, review and merge record. Use "not applicable — <reason>"
for conditional sections that do not apply.
-->

## Delivery contract

- Spec: [SPEC-###](../blob/BRANCH/.agents/specs/NNN-short-slug.spec.md)
- Status: `in-progress | implemented`
- Type: `feature | fix | migration | refactor | governance | chore | experiment`
- Primary public seam:
- Tickets: Closes #
- Owner approval:

## Outcome

<!-- State the observable result in one to three sentences. -->

## Scope

### Included

-

### Excluded

-

### Risk and rollback

- Main risk:
- Rollback or recovery:

## Dependencies and order

- Blocked by:
- Blocks:
- Related ADRs/rules:
- Required migration or merge order:

## Acceptance evidence

<!-- Map each acceptance criterion to reproducible evidence; do not paste transient logs. -->

| Acceptance criterion | Evidence | Result |
|---|---|---|
|  | test, check, trace, diff or reviewed procedure | `pass | fail` |

## Validation

- Fixed merge-base SHA:
- Reviewed head SHA:
- CI run:
- Local validation, when used:
  - `./cli/elo doctor --ci`
  - `./cli/elo check all`
- Additional targeted test/eval:
- Manual verification:

## Independent review

### Standards

- Reviewer:
- Reviewed head SHA:
- Result: `pass | findings`
- Resolved findings:

### Spec fidelity

- Reviewer:
- Reviewed head SHA:
- Result: `pass | findings`
- Resolved findings:

- [ ] Both axes were performed independently on the same final head.
- [ ] Standards has zero unresolved blocking findings.
- [ ] Spec fidelity has zero unresolved blocking findings.

## Safety and privacy

- Applicability: `applicable | not applicable — reason`
- Data classes and flows:
- Authorization and consent boundary:
- Retention, sharing and disclosure impact:
- Synthetic fixture or test-data evidence:
- Safety/privacy rules and evidence:

- [ ] Applicable controls pass, or a concrete non-applicability rationale is recorded.
- [ ] No unsupported security, privacy, clinical or regulatory claim was introduced.

## Memory ROI

<!-- Required for memory, retrieval, serving-context, routing, model, tool or AI-cost changes. -->

- Applicability: `applicable | not applicable — reason`

| Measure | Baseline | Result | Budget or decision threshold |
|---|---:|---:|---:|
| Quality/eval |  |  |  |
| Served-context tokens |  |  |  |
| Model/tool cost |  |  |  |
| Latency |  |  |  |

- Decision: `accept | revise | reject`
- Evidence:

- [ ] The change preserves or improves the `memory → context → quality → cost` thesis, or non-applicability is explained.

## Promotion

- Behavior spec/context/rule/ADR/checker updated:
- Stable evidence recorded in the delivery spec:
- Temporary `.audit/` evidence removed:

## Merge gate

- [ ] The branch and PR reference the same durable `SPEC-###`.
- [ ] The implementation matches the approved scope.
- [ ] The delivery spec is `implemented`.
- [ ] Every acceptance criterion is checked and linked to reproducible evidence.
- [ ] Required CI is green on the exact reviewed head.
- [ ] The branch is current with its base and conflict-free.
- [ ] Both independent review axes pass on the final head.
- [ ] All blocking findings and review threads are resolved.
- [ ] Applicable safety, privacy and Memory ROI gates pass.
- [ ] Durable conclusions were promoted and transient evidence was removed.
- [ ] The PR is ready for merge.
