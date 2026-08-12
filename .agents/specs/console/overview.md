# Spec — Console Amar.elo

## Objetivo

Habitar o console existente com o domínio do Amar.elo, preservando sua arquitetura visual.

## Regra principal

> O console deve continuar sendo o mesmo console, agora habitado pelo produto Amarelo.

## Conteúdo do dashboard

1. saudação e explicação curta;
2. gráfico semanal no slot 7/12;
3. agente atual e seletor no slot 5/12;
4. duas métricas não clínicas;
5. timeline pesquisável;
6. nota de dados fictícios e limites;
7. dialog de novo registro.

## MUST

- remover todo conteúdo financeiro visível;
- preservar shell, header, sidebar e grids;
- usar foundation Amar.elo;
- usar Satoshi;
- mostrar Ana/orb na primeira viewport;
- incluir o Chart do shadcn sobre Recharts;
- privado por padrão;
- dados fictícios e não clínicos;
- light/dark mode.

## Fora do escopo

- rotas reais para cada item da sidebar;
- backend;
- autenticação;
- persistência;
- compartilhamento real;
- alertas de crise;
- edição de profissionais ou medicações.

## Critérios de aceite

- Header mantém altura e comportamento.
- Sidebar mantém largura e breakpoints.
- Main mantém offset e largura máxima.
- Grids mantêm 7/5 e 2 colunas.
- Tabela permanece no último slot.
- Nenhum termo financeiro aparece na UI.
