# Spec — Privacidade, acessibilidade e tema do console

## Privacidade visível

- “Privado” e “Compartilhado com 1 pessoa” aparecem por extenso.
- Novo registro é privado.
- Card do agente lembra “privado por padrão”.
- Menu de privacidade existe na navegação, mesmo sem rota funcional.
- Nota final declara que os dados são fictícios e não representam avaliação clínica.

## Acessibilidade

- sidebar móvel possui overlay e fechamento por botão;
- menus usam `aria-expanded` e `role=menu` como no padrão existente;
- gráfico tem descrição e tabela;
- SVG não é a única fonte de informação;
- tabela mantém caption;
- busca tem label invisível;
- botões de agente usam `aria-pressed`;
- foco visível;
- alvo mínimo de 44 px;
- dark mode não reduz contraste.

## Tema

- persistir em `amarelo-console-theme`;
- refletir estado em classe `.dark` e `data-theme`;
- usar preferência do sistema na primeira visita;
- tema não pode causar conteúdo incorreto após hidratação;
- chart atualiza cores quando o tema muda.

## Movimento

- orb respeita movimento reduzido;
- o gráfico shadcn/Recharts não usa animação de entrada;
- transições do shell permanecem curtas;
- nenhum efeito bloqueia interação.
