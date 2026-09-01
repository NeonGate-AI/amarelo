# Memory Nucleus MVP spec

## Required flow

```text
Evidence → Candidate → Judgment + Policy → Canonical Memory → Retrieval → Projection → Token Budget
```

## Requirements

- Candidate formation may use bounded semantic inference; canonical activation is deterministic-policy governed.
- Personal retrieval is authorized before repository access/exposure.
- Serving retrieval uses structured/FTS paths without mandatory vector/model calls.
- Projection has a hard token budget and returns structured memory, not a final prompt.
- Forget/correction, basic provenance and subject isolation remain functional in the MVP.
- Economics must support comparison of baseline context, projected context, memory processing cost and serving cost avoided.
- Evals must cover retrieval relevance, budgets, authorization, projection quality and economics.
