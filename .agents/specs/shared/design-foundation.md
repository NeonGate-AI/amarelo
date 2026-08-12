# Spec compartilhada — Design foundation

## Objetivo

Uma única base visual deve sustentar landing e console em light/dark mode sem duplicar decisões de cor ou tipografia.

## Fonte

MUST:

- carregar apenas Satoshi Variable local;
- usar Satoshi em display, body e interface;
- usar pesos 400–900 da variável;
- usar `font-display: swap`;
- não buscar fontes externas.

## Cor

MUST:

- âncora `#FAD715`;
- neutros quentes da foundation;
- texto grafite sobre botões amarelos;
- warning laranja, distinto da marca;
- aliases semânticos para superfícies, bordas, feedback e gráficos;
- tokens próprios para Ana, Jacira e Cleane.

## Temas

Light:

- canvas off-white;
- superfícies elevadas brancas;
- texto grafite;
- amarelo usado em ação, seleção e foco.

Dark:

- canvas quase preto quente;
- superfícies grafite;
- texto off-white;
- amarelo preserva contraste e não vira glow permanente.

## Movimento

- transições comuns entre 150 e 250 ms;
- sem bounce forte;
- orbs podem respirar lentamente;
- `prefers-reduced-motion` elimina loops e transforms não essenciais;
- mudança de estado continua legível sem movimento.

## Critérios de aceite

- Nenhuma aplicação define uma segunda paleta primária.
- Ambos os apps consomem `@repo/ds`.
- Cor não é o único meio de comunicar estado.
- Foco de teclado é visível nos dois temas.
- Texto normal atende WCAG AA.
