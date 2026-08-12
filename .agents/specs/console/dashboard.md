# Spec — Dashboard, agentes e tendências

## Gráfico semanal

Status: PROTÓTIPO.

Mostrar duas séries fictícias de autorrelato:

- “Como o dia foi”;
- “Ansiedade percebida”.

Escala: 1–5, declarada como percepção da pessoa.

MUST:

- line chart do shadcn sobre Recharts;
- tooltip e legenda;
- grid discreto;
- cores de token;
- alternativa textual;
- tabela expansível;
- sem interpretação clínica;
- sem score composto;
- sem previsão.

## Card do agente

Mostrar:

- orb do agente atual;
- Ana como default;
- botões compactos para Ana, Jacira e Cleane;
- contexto textual;
- status “Privado por padrão”.

O card substitui visualmente o cartão virtual sem alterar o slot ou a altura mínima.

## Métricas

Exibir:

- check-ins nesta semana;
- compartilhamentos ativos.

MUST evitar métricas de eficácia, melhora clínica ou risco.

## Timeline

Colunas:

- registro;
- data;
- tipo;
- visibilidade.

Busca filtra título, tipo, data e visibilidade.

Estados:

- com resultados;
- sem resultados;
- “ver tudo” limpa a busca.

Cada linha identifica origem e privacidade sem depender apenas de cor.
