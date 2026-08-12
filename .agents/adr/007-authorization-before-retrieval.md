# ADR-007: Aplicar autorização antes de recuperar contexto

- **Status:** Aceito pela Matrix
- **Data:** 2026-08-09

## Contexto

Memórias, resumos e inferências podem revelar conteúdo sensível mesmo quando a mensagem original não é mostrada. Filtrar somente depois do retrieval amplia exposição e risco.

## Decisão

Toda arquitetura futura deve aplicar autorização antes da recuperação.

O escopo considera:

- pessoa solicitante;
- finalidade;
- categoria de conteúdo;
- destinatário;
- duração;
- status de revogação;
- proveniência e transformações.

Dados derivados não herdam permissão mais ampla.

## Alternativas consideradas

### Recuperar tudo e redigir na resposta

Rejeitada porque o modelo já teria recebido conteúdo não autorizado.

### Considerar vínculo familiar como autorização

Rejeitada. Relação social não substitui consentimento específico.

## Consequências

- O protótipo usa linguagem “privado”, “compartilhado com 1 pessoa” e “revogável”.
- APIs e banco futuros precisarão modelar escopo e proveniência desde o início.
- Evals de privacy devem testar vazamento por derivação.
