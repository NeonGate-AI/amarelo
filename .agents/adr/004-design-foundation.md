# ADR-004: Adotar a foundation cromática Amar.elo e Satoshi como fonte padrão

- **Status:** Aceito nesta implementação; pendente de registro na Matrix
- **Data:** 2026-08-09

## Contexto

O monorepo já contém uma foundation Amar.elo com amarelo de marca, neutros quentes, aliases semânticos e temas light/dark. As aplicações ainda mantêm valores antigos e definições tipográficas conflitantes.

## Decisão

- Usar `#FAD715` como âncora.
- Consumir cor por tokens em `packages/design-system/foundation`.
- Manter warning laranja separado do amarelo de marca.
- Usar o arquivo Satoshi Variable já presente no projeto como única família de UI e display nesta entrega.
- Usar texto grafite sobre amarelo; nunca branco sobre amarelo.

## Alternativas consideradas

### Adicionar Inter ou Geist

Rejeitada para esta entrega por instrução explícita de usar a mesma fonte já versionada no projeto.

### Pintar superfícies principais de amarelo

Rejeitada. Reduz legibilidade e contradiz o princípio “amarelo é identidade, não tinta”.

## Consequências

- Landing e console compartilham tokens e tipografia.
- Paletas de orbs são aliases do design system.
- A foundation continua CSS-first e compatível com os imports existentes.
