# Escopo do Repositório para a Migração Amar.elo

## Objetivo

Transformar a experiência visível da landing e do console em Amar.elo sem reconstruir o monorepo e sem redesenhar o console.

## Áreas autorizadas

### Landing

- conteúdo, narrativa, metadata e SEO;
- layout e seções;
- componentes SmoothUI;
- tema e tokens;
- assets e favicon;
- interações demonstrativas.

### Console

- cores e tokens;
- marca e textos;
- ícones cujo significado financeiro deixou de existir;
- mocks;
- gráficos;
- componentes dentro dos slots existentes;
- dialog de novo registro;
- metadata e favicon.

### Documentação de agentes

- `.agents/context`;
- `.agents/specs`;
- `.agents/adr`.

## Áreas protegidas

- `cli/`;
- `apps/mobile/`;
- `apps/onboarding/`;
- `apps/docs/`;
- largura e posição de sidebar/topbar;
- grid, shell, densidade e padrões de cards do console;
- harness de agentes em `ai/skills/fundamentals/harness.md`.

## Legado deliberadamente preservado

- O comando `pnpm sim` continua apontando para a CLI legada.
- Protótipos em `ai/` não são migrados nesta entrega.
- Arquivos Figma existentes não são reinterpretados nem apagados.

Esses itens não podem ser usados como fonte de verdade do produto Amar.elo.

## Critério de equivalência do console

O console continua reconhecível como a mesma aplicação quando:

- header mantém 6rem de altura;
- sidebar mantém 20rem e o mesmo comportamento responsivo;
- conteúdo mantém `xl:pl-80` e `max-w-6xl`;
- primeiro grid mantém colunas 7/5;
- segundo grid mantém duas métricas;
- tabela mantém o slot final;
- espaçamentos, raios, elevação e densidade permanecem.
