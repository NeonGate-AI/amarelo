# ADR-006: Representar agentes por orbs sem transformar a orb em identidade clínica

- **Status:** Protótipo aceito nesta implementação
- **Data:** 2026-08-09

## Contexto

A primeira dobra precisa demonstrar imediatamente uma presença conversacional e permitir escolher entre contextos. Ícones clínicos, avatares humanos e símbolos de transtornos criariam estereótipos ou falsa autoridade.

## Decisão

Usar três orbs abstratas:

- Ana — amarelo/dourado;
- Jacira — menta/céu;
- Cleane — lilás/rosa.

A orb:

- representa o estado da interface;
- não é o logo do Amarelo;
- não é uma pessoa sintética;
- não representa visualmente um diagnóstico;
- recebe nome, contexto e limite textual adjacentes.

## Alternativas consideradas

### Retratos humanos

Rejeitados por falsa personificação, viés e risco de dependência.

### Símbolos por transtorno

Rejeitados por estigma e simplificação indevida.

### Uma única orb para todo o produto

Adiada. O seletor com três contextos é uma hipótese de descoberta a validar.

## Consequências

- Nomes e especialidades permanecem dados demonstrativos.
- Cores precisam ter texto e labels; cor nunca é o único identificador.
- A troca de agente deve preservar foco e estado acessível.
