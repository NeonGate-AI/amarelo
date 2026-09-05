---
id: SPEC-025
title: Define plans, voice entitlements and technical capability gates
type: feature
status: draft
mode: prospective
created: 2026-08-28
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - product plans and entitlements
  - future billing and usage ledger
  - future conversation, voice, Memory and Knowledge capability gates
context:
  - .agents/context/product/overview.md
  - .agents/context/product/strategy.md
rules:
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.adr.md
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/domain-modeling/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-025: Define plans, voice entitlements and technical capability gates

## Problem Statement

Amarelo needs to separate owner-aligned launch constraints from price hypotheses and still-open entitlement details. Without a deterministic contract, plan names or payment relationships could accidentally become data-access grants, models could make entitlement decisions, example price cards could be treated as approved commercial commitments, and weekly shared voice usage could be confused with shared memory.

## Solution

Define target plan behavior, economic pooling and technical capability gates while explicitly classifying each unresolved value as **ALIGNED BASELINE**, **HYPOTHESIS** or **OPEN / TBD**. Entitlement is resolved by trusted application policy before any provider, model, speech, curator or retrieval operation. Entitlement permits an operation to be attempted; independent authorization still governs private data.

This draft does not claim that billing, metering, voice, Memory acceptance, Knowledge RAG providers or plan enforcement is implemented.

## User Stories

1. As a subscriber, I want one understandable weekly family voice allowance, so that usage is predictable without implying that family members share private data.
2. As a person using Amarelo, I want Memory correctness, consent and data rights to remain plan-independent, so that paying more never creates stronger truth or weaker privacy.
3. As an operator, I want deterministic entitlement resolution before any variable-cost call, so that disallowed capabilities produce zero provider usage.
4. As a product owner, I want hypotheses and open values visibly separated from approved baselines, so that research examples cannot become accidental pricing or entitlements.
5. As a cost owner, I want one attributable usage ledger, so that voice, text, Memory, Knowledge and infrastructure costs can be compared with plan revenue in BRL.

## Scope

### Status legend

- **ALIGNED BASELINE:** an owner-aligned launch constraint or product boundary. It remains subject to an explicit later owner decision, not silent implementation drift.
- **HYPOTHESIS:** a research or technical packaging proposition. It is not a user entitlement and must not be advertised or hard-coded as one.
- **OPEN / TBD:** no decision has been made. Do not invent a quota, capability, price or implementation detail.

### Invariants across every plan

- Brazil is the initial market; consumer prices and unit economics are expressed in BRL.
- Billing is monthly. Included voice is replenished or reset weekly; it is neither a daily cap, one exhaustible monthly bucket nor unlimited voice.
- For paid plans, the economic meter is the family subscription. Every billable voice minute used by the primary person or an authorized support-network participant debits the same weekly family entitlement exactly once.
- Economic pooling never pools data. Each subject has a separate canonical longitudinal memory; participant conversations remain private; contributions enter another subject's memory only as source-provenanced candidates; each actor sees only an authorized projection.
- Paying, holding a seat, relationship role or consuming shared minutes never grants memory access.
- A support-network participant who is also an Amarelo subject has a separate longitudinal-memory namespace.
- Reset anchor, timezone, rollover, warnings and graceful exhaustion remain OPEN until approved.
- Users interact with Amarelo product capabilities, never LangChain, LangGraph, LangMem, prompts, graphs, checkpoints or provider identities.
- `longitudinal` is never a candidate or canonical stored memory kind. Durable kinds are `episodic` and `semantic`; longitudinal projections are rebuildable views.
- Memory correctness, authorization, provenance, correction, revocation and baseline safety cannot be paywalled. Higher plans may buy eligible volume, latency or bounded model quality, never stronger truth, weaker controls or broader data rights.
- Automatic candidate proposal is not automatic acceptance. A deterministic acceptance/lifecycle workflow owns canonical writes.
- Any future paid top-up uses a ledger separate from included weekly balance and survives the included-entitlement reset.
- Plan checks occur deterministically before model, speech, curator or retrieval calls. Models never decide plans or grant capabilities.
- During validation, Knowledge RAG is scientific-only and may use only a pre-curated local/versioned corpus. Regulatory/LGPD research, legal interpretation, corpus ingestion, knowledge tools and Knowledge RAG product entitlement are deferred. A dormant `regulatory` source type creates no entitlement.

### User-facing entitlement matrix

| Plan | Price and status | Weekly voice allowance | Voice quality or pipeline | Conversation continuity | Explicit/session memory | Automatic episodic candidates | Automatic semantic candidates | Longitudinal projections | Personal Memory RAG | Knowledge RAG | Support/professional views | Packs/top-ups |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Free | **ALIGNED BASELINE:** R$0 | **ALIGNED:** hard weekly cap; amount **OPEN** | **ALIGNED BOUNDARY:** cheapest approved model/chained pipeline, short context/output; exact pipeline **OPEN** | bounded session continuity only | explicit deterministic preferences may be retained; scope/retention **OPEN** | not included; no background LLM curation | not included; no background LLM curation | no automatic longitudinal-memory promise | at most deterministic lookup of explicitly retained preferences | not included | **OPEN**; baseline controls and safety remain | **OPEN**; no pack implied |
| Standard | **ALIGNED LAUNCH BASELINE:** at most R$30/month | shared weekly family entitlement; amount **OPEN** | lower-cost chained voice is a **HYPOTHESIS** | target continuity from eligible accepted memory | included under future approved lifecycle contracts | background candidate proposals; never automatic acceptance | background candidate proposals; never automatic acceptance | rebuildable purpose-bound views | authorized exact/lexical/FTS retrieval; quota **OPEN** | **DEFERRED** | **OPEN**; seats/pooled usage grant no data rights | optional packs are a **HYPOTHESIS** with separate ledger |
| Premium | **ALIGNED LAUNCH BASELINE:** at most R$50/month | shared weekly family entitlement; amount **OPEN**; more volume is a **HYPOTHESIS** | limited realtime allowance or bounded escalation is a **HYPOTHESIS** | same continuity semantics as Standard | same correctness/lifecycle semantics as Standard | same candidate semantics; possible volume difference only | same candidate semantics; possible volume difference only | same rebuildable truth model | same authorization/lifecycle; possible volume difference only | **DEFERRED** | **OPEN**; Premium grants no broader truth/data rights | optional packs are a **HYPOTHESIS** with separate ledger |
| R$99/R$100 research card | **HYPOTHESIS ONLY:** test R$99 as near-R$100 offer | **HYPOTHESIS:** 120 min/week as two 60-minute sessions | **OPEN**; research must measure all-in pipeline cost | **OPEN** | **OPEN** | **OPEN** | **OPEN** | **OPEN** | **OPEN** | **OPEN** | **OPEN** | **HYPOTHESIS:** separate purchased balance may address heavy use |

### Internal technical execution matrix

| Plan | Runtime path | Model tier | Memory-curator trigger | Accepted memory kinds | Personal retrieval | Knowledge retrieval | Cost/telemetry gates |
|---|---|---|---|---|---|---|---|
| Free | deterministic bounded session path; no autonomous orchestration or multi-agent delegation | cheapest approved model/chained pipeline; hard context/output ceilings; no expensive reasoning | disabled; entitlement rejection before curator/model | no automatic canonical formation; explicit deterministic preferences require separate contract; never `longitudinal` | bounded deterministic preference/session lookup only | disabled before retrieval | hard weekly cap and abuse controls; provisional **HYPOTHESIS** of at most R$1 variable AI cost per active free family/month; full provider telemetry |
| Standard | future bounded serial conversation graph with one active agent; deterministic gates | cheapest approved tier meeting measured quality; retry/output/spend details **OPEN** | deterministic `explicit-memory-request` or `eligible-source-delta`; background, at most one deadline-bounded extractor invocation | candidate kinds `episodic` and `semantic`; later acceptance required | authorization, tenant, subject, purpose, category, lifecycle, exact/lexical then FTS; 600-token hard Memory ceiling | **DEFERRED** | **HYPOTHESIS:** test R$6 variable AI cost per active family/month; ledger by tenant, family, plan, window, operation, tokens, minutes and variable infrastructure |
| Premium | same bounded graph and truth path as Standard; extra realtime/escalation only when separately approved | lowest-cost approved tier meeting quality; bounded realtime/model escalation remains **HYPOTHESIS** | same deterministic trigger/candidate contract; possible volume difference only | exactly same kinds/lifecycle authority as Standard | exactly same authorization/truth; possible volume/latency difference only | **DEFERRED** | **HYPOTHESIS:** test R$10–R$12.50 variable AI cost per active family/month; same ledger/hard gates |
| R$99/R$100 research card | no runtime path authorized | **OPEN**; measure chained/realtime alternatives | no trigger entitlement | no memory entitlement | no retrieval entitlement | no retrieval entitlement | research-only 120 min/week; normalize with `52 / 12 = 4.333`; preliminary chained-voice hypothesis R$0.07–R$0.12/min implies roughly R$36–R$62/month for voice alone and requires real all-in BRL telemetry |

### LangMem-equivalent implementation note

The official LangMem library is Python-only. The TypeScript runtime uses Amarelo-owned schemas and contracts plus supported LangChain/LangGraph TypeScript primitives for structured extraction, background formation, future controlled consolidation and bounded retrieval. No plan depends on or exposes a fictitious JavaScript/TypeScript LangMem package. Free disables background LLM formation. Standard and Premium may use the same one-invocation engine boundary and later acceptance workflow under different approved volume budgets, never different memory-truth semantics. Provider cost, retry and output enforcement remain rollout prerequisites.

### Entitlement resolution contract

Before any provider, model, speech, Memory curator or Personal Memory RAG call, trusted policy resolves a typed envelope containing at least:

- `tenantId`, family/billing-account ID, actor ID and subject ID when applicable;
- seat ID or relationship role for economic attribution only, never retrieval authority;
- plan ID and plan-version ID;
- billing-cycle ID and current weekly entitlement-window ID;
- requested capability and purpose;
- included balance, separately purchased balance and deterministic eligibility result;
- policy-decision ID, decision time, expiry and reason code;
- operation-specific token, minute, call and monetary ceilings.

Only the minimum non-sensitive capability result crosses into runtime orchestration. Plan, billing, relationship and authorization interpretation never enters model discretion. Entitlement allows capability execution to be attempted; it does not authorize private data. Data authorization remains a separate deterministic decision.

### Usage and cost ledger requirements

The future ledger separates included weekly balance from purchased balance and keys each operation by tenant, family subscription, plan/version, entitlement window, subject, actor, seat/relationship role, usage type, capability, operation, provider and model/speech pipeline when exposed. Each paid voice minute creates exactly one debit against the shared weekly family entitlement even when actor and subject differ.

The ledger records voice minutes, audio input/output tokens, text input/output tokens, Memory-curation calls/tokens, future scientific Knowledge operations when enabled and attributable variable infrastructure. Provider-reported usage remains distinct from labeled estimates. Regulatory research is not a current cost component. Weekly costs normalize to monthly using `52 / 12 = 4.333`, not four.

The commercial KPI is variable AI cost per active family compared with gross plan revenue. Economic aggregation, payment, seat attribution and entitlement lookup never authorize retrieval or grant access to another person's conversation or memory.

### Research questions

- Who pays versus who uses, and does the payer expect data access that the product must refuse?
- What is willingness to pay at Free, R$30, R$50 and the R$99 research card?
- Which continuity, voice, memory and family features drive willingness to pay?
- What monthly hours do people desire and what frequency/duration distribution is observed?
- Does a tiny weekly preview or separately approved constrained demo prove Free-to-paid value efficiently?
- Does Standard need only a chained pipeline, and is bounded realtime materially valuable in Premium?
- How many paid seats are included, and should a protected sub-ledger reserve some voice allowance for the primary person? Existence, amount and ratio remain hypotheses.
- What all-in BRL cost per conversation hour includes both audio directions, text reasoning, Memory, Knowledge and variable infrastructure?

## Implementation Decisions

- Product prices above are constrained baselines or research hypotheses exactly as labeled; they are not approved benefits from the Memory Nucleus investor brief.
- Weekly shared usage is an economic pool only and must never become a shared data namespace.
- Entitlement and authorization are separate deterministic decisions.
- Memory truth, consent, provenance, correction, revocation, safety and data rights are plan-independent.
- Premium may vary approved volume, latency, pipeline or bounded model tier only.
- Disallowed capability checks happen before any variable-cost call.
- Provider/framework identities remain internal implementation details.

## Testing Decisions

### Primary seam

A future entitlement-resolution and usage-ledger public boundary must drive plan/version/window fixtures and observe eligibility, balance debit, zero-call rejection and cost attribution without invoking a model to decide policy.

### Secondary seams

Separate tests cover weekly reset, purchased-balance survival, exactly-once minute debit, actor/subject attribution, entitlement-versus-authorization separation, Free zero-call gates, provider-usage reconciliation and scenario labeling.

### Fixtures and privacy

Use synthetic tenants, families, plans, actors, subjects and balances. No real billing, health, conversation or Memory content enters fixtures or telemetry. Economic identifiers never double as authorization grants.

### Required validation

Before implementation can move from draft to ready, open quotas, reset semantics, plan versions, exhaustion behavior and launch prices must receive owner approval. The eventual implementation requires deterministic policy tests, ledger reconciliation, privacy/adversarial tests, full repository CI and two independent review axes.

## Acceptance Criteria

- [ ] Every requested capability resolves plan entitlement deterministically before model, speech, curator or retrieval operations.
- [ ] A disallowed capability produces zero model, speech, curator, Personal Memory RAG and Knowledge RAG calls.
- [ ] Data authorization is evaluated separately from entitlement and still precedes private retrieval.
- [ ] The usage ledger is scoped by tenant, family/billing account, plan/version and weekly entitlement window.
- [ ] Every paid voice minute is attributed to subject, actor, seat/relationship role and usage type and debits the family entitlement exactly once.
- [ ] Entitlement aggregation, payment, seat membership and usage never authorize conversation or Memory retrieval.
- [ ] Monthly billing and weekly replenishment/reset are represented without daily caps or one exhaustible monthly bucket.
- [ ] Purchased balance remains separate and survives the included-balance reset.
- [ ] Voice minutes, audio/text tokens, Memory curation, Knowledge operations and attributable infrastructure are independently observable.
- [ ] Premium varies only explicitly approved volume, latency, pipeline or bounded model tier; memory truth and data rights remain plan-independent.
- [ ] Free rejection gates demonstrate zero calls for background curation, dynamic Knowledge RAG, expensive reasoning and autonomous orchestration.
- [ ] Reports and product copy distinguish ALIGNED BASELINE, HYPOTHESIS and OPEN values and do not present this draft as shipped behavior.

## Failure Behavior

Unknown plan/version, stale window, insufficient balance or unresolved policy fails closed before variable-cost work. Ledger-write uncertainty cannot silently grant a paid operation or double-debit a minute; recovery must be idempotent. Authorization uncertainty prevents private retrieval even when entitlement is valid. Missing pricing or provider usage remains unknown, not zero. Open/TBD values block implementation rather than receiving invented defaults.

## Out of Scope

This draft does not approve exact weekly minutes, reset anchor/timezone, rollover, warnings, exhaustion UX, purchased packs, seat counts, protected sub-ledger ratios, final provider pipelines, Knowledge RAG entitlement, billing vendor, production prices or clinical features. The investor brief's Free/R$20/R$50/R$100 examples remain economic scenarios, not approved plans.

## Evidence and Promotion

Evidence remains pending because the contract contains explicit open decisions and no entitlement runtime or billing ledger is claimed. Once owner decisions and implementation evidence exist, stable commercial boundaries belong here, technical invariants belong in rules/ADRs and reproducible cost results belong in versioned reports rather than hard-coded product copy.

## Further Notes

This file replaces `107-plans-and-entitlements.md`. The next step is owner resolution of the OPEN values, not speculative implementation. The canonical Memory Nucleus economics still use `netMemoryCost = memoryProcessingCost - avoidedServingCost`, Memory ROI above 3x as healthy and above 5x as target; those metrics do not approve plan prices or benefits.
