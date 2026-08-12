# ADR-000: Preservar o monorepo e o harness existentes

- **Status:** Aceito
- **Data:** 2026-08-09

## Contexto

O Amar.elo reutiliza um monorepo originalmente criado para a SIM. A base já contém aplicações Next.js, package de design system, diretório de AI, CLI, regras, lint e orquestração Turborepo.

Reiniciar o projeto eliminaria trabalho útil e aumentaria risco sem validar nenhuma hipótese de produto.

## Decisão

Preservar:

- pnpm workspaces;
- Turborepo;
- Next.js App Router;
- TypeScript;
- organização por aplicações e packages;
- harness descrito em `ai/skills/fundamentals/harness.md`;
- convenções em `.agents/rules`;
- package compartilhado `@repo/ds`.

Migrar apenas os domínios autorizados. Documentos e UI antigos da SIM não são fonte de verdade para o Amar.elo.

## Alternativas consideradas

### Criar um repositório novo

Rejeitada. Perderia componentes, configuração, fontes e padrões que já funcionam.

### Fazer substituição global de `Sim`

Rejeitada. A CLI e protótipos legados possuem compatibilidade deliberada; substituição cega quebraria contratos e misturaria domínios.

## Consequências

- A migração precisa ser seletiva.
- Legado preservado deve ser explicitamente identificado como não autoritativo.
- Builds das aplicações modificadas são o gate principal desta entrega.
- Mudanças futuras no harness exigem decisão própria.
