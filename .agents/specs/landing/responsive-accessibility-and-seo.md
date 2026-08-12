# Spec — Responsividade, acessibilidade e SEO da landing

## Breakpoints canônicos

- mobile: 320–767 px;
- tablet: 768–1279 px;
- desktop: 1280 px ou mais;
- frame de referência desktop: 1440 px.

## Responsividade

- Hero passa de uma para duas colunas sem reordenar leitura semântica.
- Orbs pequenas permanecem com alvo de toque mínimo de 44 px.
- Cards viram uma coluna no mobile.
- Texto não excede aproximadamente 70 caracteres por linha.
- Nenhum componente depende de hover.

## Acessibilidade

- skip link;
- landmarks `header`, `main`, `section`, `footer`;
- um único `h1`;
- headings em ordem;
- labels em todos os controles;
- `aria-pressed` no seletor;
- `aria-live` apenas em conteúdo que realmente muda;
- contraste AA;
- foco visível;
- movimento reduzido;
- conteúdo equivalente para elementos visuais.

## SEO

Metadata MUST:

- título e description do Amarelo;
- `metadataBase` com `https://amarelo.health` apenas como domínio pretendido;
- Open Graph e Twitter sem claims clínicos;
- robots padrão indexável somente quando houver publicação;
- idioma `pt-BR`;
- favicon Amarelo sem reutilizar logo não aprovado como marca definitiva.

## Performance

- sem imagens hero desnecessárias;
- fonte local pré-carregada pelo Next;
- componentes client restritos às interações;
- evitar layout shift na orb;
- canvas Chroma somente durante transição;
- sem requests externos na primeira dobra.
