# ADR-008: Usar o Chart do shadcn para tendências demonstrativas

- **Status:** Aceito nesta implementação
- **Data:** 2026-08-09

## Contexto

O console precisa substituir a antiga área financeira por uma visão longitudinal sem alterar o slot, a densidade ou o padrão de card. O refinamento mais recente autoriza o uso do Chart do shadcn ou de uma solução equivalente da SmoothUI, sem exigir Chart.js.

A SmoothUI oferece um contribution graph útil para frequência, mas a hipótese desta tela precisa comparar duas séries contínuas em uma escala de 1 a 5. O componente Chart do shadcn entrega essa visualização sobre Recharts e mantém o código do componente dentro do projeto.

## Decisão

Usar o Chart do shadcn, adaptado ao foundation do Amar.elo, com Recharts 3 para um gráfico de linha semanal.

Regras:

- dados fictícios;
- escala de autorrelato explícita;
- sem score clínico;
- sem previsão ou causalidade;
- camada de acessibilidade do Recharts;
- descrição, legenda e tabela HTML equivalente;
- cores vinculadas aos tokens semânticos do Amar.elo;
- sem animação de entrada, inclusive para uma experiência previsível com movimento reduzido.

## Alternativas consideradas

### SmoothUI Contribution Graph

Mantido como opção futura para frequência de check-ins. Não foi escolhido porque um heatmap não comunica corretamente duas séries semanais em escala ordinal.

### Chart.js

Viável, mas retirado após o refinamento do escopo em favor do ecossistema de componentes já adotado pela interface.

### SVG manual

Rejeitado porque recriaria eixos, responsividade, tooltip, legenda e manutenção.

## Consequências

- `recharts` entra apenas no app console.
- O wrapper Chart fica versionado no próprio console, como é o padrão do shadcn.
- O SVG possui conteúdo equivalente em tabela expansível.
- Uma solução analítica de produção ainda depende de definição científica e de dados.
