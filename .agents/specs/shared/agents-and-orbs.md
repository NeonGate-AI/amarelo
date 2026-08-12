# Spec compartilhada — Agentes e orbs

## Objetivo

Permitir que a pessoa escolha um contexto de conversa sem escolher um diagnóstico e sem antropomorfizar excessivamente a IA.

## Dados do protótipo

| ID | Nome | Contexto | Cor | Status |
|---|---|---|---|---|
| `ana` | Ana | relações, intensidade emocional e comunicação | amarelo/dourado | PROTÓTIPO |
| `jacira` | Jacira | rotina, sobrecarga e neurodivergência | menta/céu | PROTÓTIPO |
| `cleane` | Cleane | ansiedade, humor e autocuidado cotidiano | lilás/rosa | PROTÓTIPO |

## Regras de conteúdo

MUST:

- chamar de “contexto” ou “foco”, não “diagnóstico”;
- informar que a pessoa pode trocar depois;
- declarar que o agente não substitui profissionais;
- evitar “especialista clínico”, “terapeuta” e “conhece você melhor”.

## Siri Orb

MUST:

- usar a implementação SmoothUI compartilhada;
- fornecer label textual ao redor da orb;
- marcar a orb puramente decorativa como `aria-hidden` quando o botão já tem nome;
- respeitar movimento reduzido;
- manter tamanho estável durante troca de agente.

## Estados

- `idle`: padrão do seletor;
- `listening`: reservado para ação explícita de voz;
- `thinking`: reservado para processamento real;
- `streaming`: reservado para resposta real;
- `done`: feedback breve;
- `error`: acompanhado por mensagem textual.

O protótipo atual não simula escuta ou processamento sem ação real.

## Critérios de aceite

- Seleção funciona por mouse, toque e teclado.
- `aria-pressed` identifica o item escolhido.
- Foco não se perde na transição.
- Nome e contexto permanecem legíveis sem cor ou animação.
- Nenhum agente é apresentado como pessoa real.
