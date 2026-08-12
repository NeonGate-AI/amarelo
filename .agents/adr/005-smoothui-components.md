# ADR-005: Usar componentes SmoothUI como efeitos locais e controlados

- **Status:** Aceito nesta implementação
- **Data:** 2026-08-09

## Contexto

O projeto já possui componentes SmoothUI copiados localmente. O usuário indicou a Siri Orb como referência e pediu que novos efeitos reutilizem essa biblioteca, sem redesenhar o console.

## Decisão

- Usar o componente oficial Siri Orb e seu contrato de estados de AI.
- Manter o código sob controle do monorepo.
- Reutilizar SmoothButton, KineticText, Chroma, ShimmerSweep, GlowHover e FAQ quando agregarem hierarquia ou feedback.
- Não usar movimento como decoração contínua sem função.
- Respeitar `prefers-reduced-motion` em todos os efeitos.

Referência: <https://smoothui.dev/docs/components/siri-orb>

## Alternativas consideradas

### Desenhar uma orb própria

Rejeitada. O requisito aponta para um componente específico e o código oficial já cobre acessibilidade de movimento e estados.

### Usar SmoothUI para reconstruir o shell do console

Rejeitada. O console está congelado; a biblioteca só entra nos módulos internos autorizados.

## Consequências

- `@repo/ds` passa a expor Siri Orb como componente compartilhado.
- Motion torna-se dependência do design system.
- Efeitos precisam permanecer testáveis sem movimento.
