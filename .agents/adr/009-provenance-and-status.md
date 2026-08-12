# ADR-009: Tornar origem, privacidade e caráter fictício visíveis

- **Status:** Aceito nesta implementação
- **Data:** 2026-08-09

## Contexto

Interfaces de saúde mental podem fazer dados simulados parecerem clínicos ou transformar inferência em fato pela forma como tabelas e gráficos são apresentados.

## Decisão

Todo mock relevante deve declarar:

- que os dados são fictícios;
- origem da entrada quando aplicável;
- estado de privacidade;
- ausência de diagnóstico ou interpretação clínica.

Na timeline, “privado” e “compartilhado” aparecem como texto e ícone. No gráfico, a legenda usa “informado” ou “percebido”.

## Alternativas consideradas

### Um disclaimer genérico no rodapé

Rejeitada. O contexto precisa acompanhar a representação que poderia ser interpretada incorretamente.

### Ocultar dados demonstrativos

Rejeitada porque o objetivo do protótipo é tornar a experiência testável.

## Consequências

- Copy é mais precisa e menos promocional.
- Componentes futuros precisam carregar metadados, não apenas valores.
- Revisão de Science e Privacy continua obrigatória antes de produção.
