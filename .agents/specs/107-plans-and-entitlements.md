---
id: SPEC-PRODUCT-PLANS-001
title: Plans, voice entitlements, and technical capability gates
status: owner-aligned-working-spec
owner: product-owner
last-reviewed: 2026-08-28
---

# SPEC-PRODUCT-PLANS-001: Plans, voice entitlements, and technical capability gates

## Purpose

Separate owner-aligned launch boundaries from pricing hypotheses and still-open entitlement details. This spec defines target product behavior and deterministic capability gates; it does not claim that billing, metering, voice, memory acceptance, RAG providers, or plan enforcement is implemented.

## Status legend

- **ALIGNED BASELINE:** an owner-aligned launch constraint or product boundary. It remains subject to an explicit later owner decision, not silent implementation drift.
- **HYPOTHESIS:** a research or technical packaging proposition. It is not a user entitlement and must not be advertised or hard-coded as one.
- **OPEN / TBD:** no decision has been made. Do not invent a quota, capability, price, or implementation detail.

## Invariants across every plan

- Brazil is the initial market; consumer prices and unit economics are expressed in BRL.
- Billing is monthly. Included voice is replenished or reset weekly; it is neither a daily cap, one exhaustible monthly bucket, nor unlimited voice.
- For paid plans, the economic meter is the family subscription: every billable voice minute used by the primary person or an authorized support-network participant debits the same weekly family entitlement exactly once.
- Economic pooling never pools data. Each subject has a separate canonical longitudinal memory; participant conversations remain private; contributions enter another subject's memory only as source-provenanced candidates; and each actor sees only an authorized projection. Paying, holding a seat, relationship role, or consuming shared minutes never grants memory access.
- A support-network participant who is also an Amarelo subject or user has their own separate longitudinal memory namespace.
- Exact reset anchor, timezone, rollover, warnings, and graceful exhaustion behavior remain proposed implementation details until approved.
- Users interact with Amarelo product capabilities, never LangChain, LangGraph, LangMem, prompts, graphs, checkpoints, or provider identities. Frameworks are internal implementation details.
- `longitudinal` is never a candidate or canonical stored memory kind. Canonical durable kinds are `episodic` and `semantic`; longitudinal projections are rebuildable views.
- Memory correctness, authorization, provenance, correction, revocation, and baseline safety cannot be paywalled. A higher plan may buy more eligible volume, latency, or bounded model quality, never stronger truth, weaker controls, or broader data rights.
- Automatic candidate proposal is not automatic acceptance. A later deterministic acceptance and lifecycle workflow owns canonical writes.
- Any future paid top-up uses a ledger separate from included weekly balance and is not erased by the included-entitlement reset.
- Plan and entitlement checks occur deterministically before model, speech, curator, or retrieval calls. Models never decide which plan a person has or grant their own capabilities.
- During validation, Knowledge RAG is scientific-only and may use only a pre-curated local/versioned corpus. Regulatory/LGPD research, legal interpretation, corpus content or ingestion, knowledge tools, and Knowledge RAG product entitlement are **DEFERRED**. The dormant `regulatory` contract/eval source type does not create an entitlement.

## User-facing entitlement matrix

| Plan | Price and status | Weekly voice allowance | Voice quality or pipeline | Conversation continuity | Explicit or session memory | Automatic episodic candidates | Automatic semantic candidates | Longitudinal projections | Personal Memory RAG | Knowledge RAG (scientific in validation; regulatory deferred) | Support-network or professional views | Packs or top-ups |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Free | **ALIGNED BASELINE:** R$0 | **ALIGNED:** hard weekly cap; amount **TBD / OPEN** | **ALIGNED BOUNDARY:** cheapest approved model or chained pipeline, short context and outputs; exact pipeline **OPEN** | Bounded session continuity only | Explicit deterministic preferences may be retained; exact scope and retention **OPEN** | Not included; no background LLM curation | Not included; no background LLM curation | No automatic longitudinal-memory promise | At most deterministic lookup of explicitly retained preferences; no general dynamic entitlement | Not included; no dynamic knowledge RAG | **OPEN**; baseline controls and safety remain available | **OPEN**; no pack is implied by Free |
| Standard | **ALIGNED LAUNCH BASELINE:** at most R$30/month | Shared weekly family entitlement; amount **TBD / OPEN** | Lower-cost chained voice is a **HYPOTHESIS** | Cross-session continuity from eligible accepted memory is target behavior | Included under future approved lifecycle contracts | Included as background candidate proposals; never automatic acceptance | Included as background candidate proposals; never automatic acceptance | Rebuildable, purpose-bound views over accepted memory | Authorized exact or lexical/FTS retrieval; quota **OPEN** | **DEFERRED:** no validation-plan entitlement is approved | **OPEN**; seats and pooled usage never grant data rights | Optional packs or top-ups are a **HYPOTHESIS**; separate ledger if introduced |
| Premium | **ALIGNED LAUNCH BASELINE:** at most R$50/month | Shared weekly family entitlement; amount **TBD / OPEN**; more volume than Standard is a **HYPOTHESIS** | Limited realtime allowance or bounded model escalation is a **HYPOTHESIS** | Same continuity semantics as Standard; possible volume/latency difference only | Same correctness, authority, and lifecycle semantics as Standard | Same candidate semantics as Standard; possible volume difference only | Same candidate semantics as Standard; possible volume difference only | Same rebuildable truth model as Standard | Same authorization and lifecycle rules as Standard; possible volume difference only | **DEFERRED:** no validation-plan entitlement is approved | **OPEN**; Premium never grants broader truth or data rights | Optional packs or top-ups are a **HYPOTHESIS**; separate ledger if introduced |
| R$99/R$100 research card | **HYPOTHESIS ONLY:** test R$99 as the concrete near-R$100 offer | **HYPOTHESIS:** 120 min/week, framed as two 60-minute sessions; not an entitlement | **OPEN**; research must measure all-in pipeline cost | **OPEN:** no capability is inferred from price research | **OPEN:** no capability is inferred from price research | **OPEN:** no capability is inferred from price research | **OPEN:** no capability is inferred from price research | **OPEN:** no capability is inferred from price research | **OPEN:** no capability is inferred from price research | **OPEN:** no capability is inferred from price research | **OPEN:** no capability is inferred from price research | **HYPOTHESIS:** separately metered purchased balance may address heavy use |

## Internal technical execution matrix

| Plan | LangGraph topology or runtime path | LangChain or model tier | Memory-curator trigger | Accepted memory kinds | Personal retrieval | Knowledge retrieval | Cost and telemetry gates |
|---|---|---|---|---|---|---|---|
| Free | Deterministic bounded session path; no autonomous orchestration or multi-agent delegation | Cheapest approved model or chained pipeline; hard context/output ceilings; no expensive reasoning | Disabled; entitlement rejection occurs before curator or model calls | No automatic canonical formation; explicit deterministic preferences require a separate approved contract; never `longitudinal` | Bounded deterministic preference/session lookup only; no dynamic general Personal Memory RAG | Disabled before retrieval; zero knowledge-retrieval calls | Hard weekly usage cap and abuse controls; provisional **HYPOTHESIS** target of at most R$1 variable AI cost per active free family/month; full component telemetry when a provider is used |
| Standard | Future bounded serial conversation graph with one active agent; deterministic policy gates | Cheapest approved tier that meets measured quality; tier/output/spend/provider-retry enforcement is still **OPEN** | Deterministic `explicit-memory-request` or `eligible-source-delta`; background, at most one deadline-bounded extractor invocation at the engine boundary | Candidate kinds `episodic` and `semantic`; later acceptance workflow required | Authorization, tenant, subject, purpose, category, lifecycle, exact/lexical then future FTS; 600-token hard memory-context ceiling | **DEFERRED:** no plan resolution or runtime invocation is approved | **HYPOTHESIS:** test R$6 variable AI cost per active family/month; ledger by tenant, family, plan, entitlement window, operation, tokens, minutes, and variable infrastructure |
| Premium | Same bounded graph and truth path as Standard; additional realtime or escalation path only if separately approved and budgeted | Lowest-cost approved tier that meets measured quality; explicit bounded model/realtime escalation is a **HYPOTHESIS**, never automatic unbounded fallback | Same deterministic trigger and candidate contract as Standard; possible volume difference only | Exactly the same accepted kinds and lifecycle authority as Standard | Exactly the same authorization and truth semantics; possible volume/latency difference only | **DEFERRED:** no plan resolution or runtime invocation is approved | **HYPOTHESIS:** test R$10–R$12.50 variable AI cost per active family/month; same ledger and hard gates as Standard |
| R$99/R$100 research card | No runtime path is authorized by this research row | **OPEN**; measure chained and realtime alternatives | No trigger entitlement is created by the research card | No memory entitlement is created by the research card | No retrieval entitlement is created by the research card | No retrieval entitlement is created by the research card | Test 120 min/week as research only; normalize with `52 / 12 = 4.333`; preliminary chained-voice hypothesis R$0.07–R$0.12/min implies about R$36–R$62/month for voice alone and requires real all-in BRL telemetry |

### LangMem-equivalent implementation note

The official LangMem library is Python-only. The TypeScript runtime uses
Amarelo-owned schemas and contracts plus supported LangChain and LangGraph
TypeScript primitives for structured extraction, background formation, future
controlled consolidation, and bounded retrieval. No plan depends on or exposes
a fictitious JavaScript or TypeScript LangMem package. Free disables background
LLM formation; Standard and Premium may use the same Amarelo-owned
one-invocation engine boundary and later acceptance workflow under different
approved volume budgets, never different memory truth semantics. Provider
cost/retry/output enforcement remains a rollout prerequisite.

## Entitlement resolution contract

Before any provider, model, speech, memory-curator, or Personal Memory RAG call, trusted application policy resolves a typed entitlement envelope containing at least the fields below. A future Knowledge RAG capability would require the same deterministic gate, but no validation-plan entitlement or runtime invocation is approved today.

- `tenantId`, family or billing-account ID, actor ID, and subject ID where applicable;
- seat ID or relationship role as economic attribution only, never retrieval authority;
- plan ID and plan-version ID;
- billing-cycle identity and current weekly entitlement-window identity;
- requested capability and purpose;
- included balance, separately purchased balance if any, and deterministic eligibility result;
- policy-decision ID, decision time, expiry, and reason code;
- operation-specific token, minute, call, and monetary ceilings.

Only the minimum non-sensitive capability result crosses into runtime orchestration. Plan, billing, relationship, and authorization interpretation never enters model discretion. Entitlement allows a capability to be attempted; it does not authorize private data. Data authorization remains a separate deterministic decision.

## Usage and cost ledger requirements

The future ledger separates included weekly balance from purchased balance and keys every operation by tenant, family subscription, plan and plan version, entitlement window, subject, actor, seat or relationship role, usage type, capability, operation, provider, and model or speech pipeline when exposed. Each paid voice minute creates exactly one debit against the shared weekly family entitlement even when actor and subject differ.

It records voice minutes, audio input/output tokens, text input/output tokens, memory-curation calls and tokens, future scientific Knowledge-RAG operations if enabled, and attributable variable infrastructure. Provider-reported identifiers and usage are recorded when available; estimates remain labeled estimates. Regulatory research is not a current cost component. Weekly costs normalize to a monthly economic view using `52 / 12 = 4.333`, not four.

The canonical commercial KPI is variable AI cost per active family divided by or compared with gross plan revenue. This economic aggregation, seat attribution, and entitlement lookup never authorize retrieval or grant family members access to one another's conversations or memory.

## Research questions

- Who pays versus who uses, and does the payer expect data access that the product must refuse?
- What is willingness to pay at Free, R$30, R$50, and the R$99 near-R$100 research card?
- Which continuity, voice, memory, and family features drive willingness to pay?
- What monthly hours do people desire, and what are the observed frequency and duration distributions?
- Does a tiny weekly voice preview or a separately approved constrained demo prove Free-to-paid value most efficiently?
- Does Standard need only a chained pipeline, and is a bounded realtime allowance materially valuable in Premium?
- How many paid seats are included, and should a recommended protected sub-ledger reserve a minimum portion for the primary person so support-network usage cannot exhaust the full weekly entitlement? Reserve existence, amount, and ratio remain hypotheses.
- What all-in BRL cost per conversation hour includes both audio directions, text reasoning, memory, knowledge retrieval, and variable infrastructure?

## Acceptance criteria for a future implementation

- Every requested capability resolves plan entitlement deterministically before any model, speech, curator, or retrieval operation.
- A disallowed capability produces zero model, speech, curator, Personal Memory RAG, and Knowledge RAG calls.
- Data authorization is evaluated separately from plan entitlement and still precedes private retrieval.
- The usage ledger is scoped by tenant, family or billing account, plan/version, and weekly entitlement window.
- Every paid voice minute is attributed to subject, actor, seat or relationship role, and usage type and debits the family entitlement exactly once.
- Entitlement aggregation, payment, seat membership, and usage never authorize conversation or memory retrieval.
- Monthly billing and weekly replenishment/reset are represented without daily caps or one exhaustible monthly bucket.
- Any purchased balance is a separate ledger and survives reset of included weekly balance.
- Cost components are independently observable for voice minutes, audio/text tokens, memory curation, knowledge RAG, and attributable variable infrastructure.
- Premium changes only approved volume, latency, pipeline, or bounded model tier; memory truth, authorization, provenance, revocation, safety, and data rights remain plan-independent.
- Free rejection gates demonstrate zero calls for background curation, dynamic Knowledge RAG, expensive reasoning, and autonomous orchestration.
- Reports and product copy distinguish ALIGNED BASELINE, HYPOTHESIS, and OPEN details and do not present this target contract as shipped behavior.

## Links

- Product constitution: `.agents/PRODUCT.md`
- Strategy and unit economics: `.agents/STRATEGY.md`
- Runtime rules: `.agents/rules/ai-runtime.md`
- Memory and RAG spec: `.agents/specs/101-memory-nucleus.md`
