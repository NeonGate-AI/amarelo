# ADR-003: Usar conversa como hipótese do app e contexto/controle como hipótese da web

- **Status:** Hipótese de produto aceita para prototipação
- **Data:** 2026-08-09

## Contexto

O MVP precisa ser simples, mas conversas, memória, rede, permissões, gráficos e auditoria não cabem com a mesma densidade na mesma superfície.

## Decisão

Prototipar:

- `APP = CONVERSA`;
- `WEB = CONTEXTO + CONTROLE`.

No app, priorizar início rápido e recorrência. Na web, priorizar revisão deliberada, privacidade e visão longitudinal.

## Alternativas consideradas

### Duplicar todas as features em todas as superfícies

Rejeitada por complexidade e falta de foco.

### Concentrar tudo no chat

Rejeitada. Permissões, auditoria e revisão de memória precisam de visualização explícita.

## Consequências

- A landing explica as duas superfícies sem prometer que ambas já estão implementadas.
- O console prototipa contexto e controle.
- A hipótese deve ser validada em entrevistas e testes, não tratada como arquitetura definitiva.
