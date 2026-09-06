# Memory economics report

The CLI consumes one strict `memory-economics-report-input-v1` JSON object containing canonical SPEC-016 ledger entries, a cohort/window, explicit cost allocations, workload/scenario inputs and redacted upstream gate references. It writes the deterministic JSON report and a standalone HTML dashboard. It makes no provider or database calls.

Run from the repository root:

```sh
corepack pnpm --filter @nucleus/memory report:economics /absolute/input.json /absolute/report.json /absolute/report.html
```

The package command enters through the owning POSIX shell launcher and executes
the TypeScript backend; no separate report build is required.

`MemoryEconomicsReportInputSchema` in `application/reporting` is the input contract. Unavailable metrics, amounts and durations use `null`; absent execution evidence uses `hold`. Do not populate them with estimates labeled as provider measurements. The report omits tenant, subject, actor, session and conversation identifiers from its output; caller-supplied artifact/version identifiers must already be redacted.

Each selected ledger cost must have allocation fractions totaling exactly one across LLM, speech, Memory and infrastructure. Bundled provider charges may be split only under the declared allocation version. Select one valuation per usage event. `memoryProcessing` marks the separately reconciled ROI allocation without adding a second charge to the family total. Operational and experiment costs remain separate. Background curation intent/completion observations sharing one attempt are reconciled to the completed observation when available; an unfinished intent stays unknown.

Duration entries identify one non-overlapping conversation aggregate per conversation. A declared basis, complete measured duration coverage and a fragmented-use distribution are required for measured normalization. Simulation requires its own versioned assumptions. The target is 60 minutes/week × 52/12 = 260 minutes per average month; normalization is never labeled an observed month. Patient speech, assistant speech and inactivity remain separate, and the basis does not approve a commercial quota.

ROI uses comparable provider-measured control/treatment serving costs with consistent pricing/FX and workload versions. Hypothetical token removal cannot establish savings. Free uses scenario revenue zero and a null revenue ratio. Missing voice evidence prevents a measured total-voice affordability claim, while the report may retain partial text/Memory cost information.

SPEC-011, SPEC-017, SPEC-043 and SPEC-012 inputs are independently versioned gate references. Importers preserve upstream unknown/hold results, artifact digest, evaluated head, fixture/workload/profile versions and sample size. This report does not execute or certify those upstream gates. Privacy/integrity violations or unaccounted model mitigation force rollback; missing required evidence holds scale. HTML generation never changes serving behavior.

Implementation delivery was requested without validation runs. Tests, evaluation, dashboard snapshots, CI and review evidence remain deferred; the source implementation is not measured economics evidence.
