---
version: 1
name: Codex Prompt Effort Selection
description: Mandatory guidance for selecting Codex model effort for prompts, specifications, and implementation work.
alwaysApply: true
priority: high
tags:
  - prompts
  - specifications
  - workflow
---
# Codex Prompt Effort Selection

## Purpose

When using Codex, select the least expensive model configuration that is appropriate for the work. This is a Codex workflow rule for prompts and specifications; it is not an architectural decision and does not apply to other tools or models.

## Default Matrix

| Trabalho | Configuração |
| --- | --- |
| Rename, CSS, testes simples, boilerplate | **Luna Low/Medium** |
| Implementação bem especificada | **Luna High** ou **Terra Medium** |
| Feature normal | **Terra Medium/High** |
| Refactor relevante | **Terra High/Extra High** |
| Arquitetura / debugging complicado | **Sol High** |
| Decisão arquitetural crítica | **Sol Extra High/Max** |
| Problema enorme paralelizável | **Sol Ultra** |

## Application Rules

1. Classifique o trabalho antes de escolher a configuração.
2. Use a menor configuração da faixa que preserve a qualidade necessária.
3. Aumente a configuração quando houver ambiguidade, alto risco, dependências cruzadas, investigação difícil ou necessidade de raciocínio arquitetural.
4. Para trabalho paralelizável, use `Sol Ultra` somente quando a divisão produzir frentes realmente independentes e houver valor em coordená-las em paralelo.
5. Ao usar Codex, registre a classificação e a configuração escolhida no prompt ou na spec quando o trabalho for maior que uma tarefa trivial.
6. A configuração do modelo não substitui uma ADR. Crie uma ADR somente quando houver uma decisão técnica duradoura, de alto impacto ou difícil de reverter.

## Required Prompt/Spec Field

Prompts e specs que orientam trabalho não trivial no Codex devem incluir:

```text
WORK_CLASSIFICATION: [categoria da matriz]
MODEL_CONFIGURATION: [configuração escolhida]
RATIONALE: [uma frase curta, quando a escolha não for óbvia]
```
