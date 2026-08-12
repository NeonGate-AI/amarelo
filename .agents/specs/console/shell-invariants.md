# Spec — Invariantes do shell do console

## Header congelado

Não alterar:

- `h-24`;
- posição fixed;
- borda inferior;
- largura reservada do logo em `xl:w-80`;
- busca central;
- grupo de ações à direita;
- comportamento de menus.

Alterações permitidas:

- wordmark;
- labels e conteúdo dos menus;
- chave de tema;
- ícones com significado de produto.

## Sidebar congelada

Não alterar:

- `w-80`;
- posição e overlay mobile;
- padding;
- altura e espaçamento dos itens;
- botão primário no topo;
- ajuda no rodapé.

Alterações permitidas:

- navegação: Início, Conversas, Registros, Rede de apoio, Privacidade;
- botão “Novo registro”;
- ícones equivalentes.

## Conteúdo congelado

Não alterar:

- `pt-24 xl:pl-80`;
- `max-w-6xl`;
- paddings responsivos;
- primeiro grid `lg:grid-cols-12` com `7/5`;
- segundo grid de duas métricas;
- slot da tabela.

## Verificação

Comparar classes estruturais antes/depois e inspecionar 390, 768 e 1440 px.
