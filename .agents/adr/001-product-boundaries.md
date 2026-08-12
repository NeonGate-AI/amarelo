# ADR-001: Definir a IA como ponte de contexto, não rede de apoio

- **Status:** Aceito pela Matrix
- **Data:** 2026-08-09

## Contexto

O produto trabalha com informações profundamente pessoais e pode ser confundido com terapeuta virtual, monitor familiar ou substituto de cuidado profissional.

## Decisão

Toda experiência deve materializar o princípio:

> A IA não é a rede de apoio. Ela ajuda a rede de apoio humana a funcionar melhor.

Consequentemente, o produto:

- organiza e comunica contexto;
- não diagnostica;
- não prescreve;
- não promete tratamento ou prevenção;
- não contata terceiros silenciosamente;
- não cria um gêmeo digital do usuário;
- preserva autonomia e possibilidade de revogação.

## Alternativas consideradas

### Posicionar como terapeuta de IA

Rejeitada por risco científico, regulatório, de segurança e de dependência.

### Posicionar como monitor para a família

Rejeitada porque inverte controle e transforma cuidado em vigilância.

## Consequências

- Copy, agentes, gráficos e CTAs precisam evitar claims clínicos.
- Compartilhamento sempre mostra destinatário e escopo.
- O sucesso deve medir compreensão e comunicação, não tempo de uso da IA.
