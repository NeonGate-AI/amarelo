# Spec — Hero e navegação

## Header

MUST manter:

- wordmark textual `Amarelo`;
- link para início;
- links para “Como funciona”, “Privacidade” e “Limites” em desktop;
- CTA “Participar”;
- toggle de tema;
- foco visível e alvo mínimo de 44 px.

Em mobile, reduzir navegação sem esconder a identidade ou o toggle.

## Hero

Headline:

> IA para organizar contexto. Pessoas para cuidar.

Mensagem de apoio:

O Amarelo ajuda a organizar experiências e preparar conversas com a rede humana, sempre sob controle da pessoa.

## Agent showcase

Estado inicial: Ana.

O card deve mostrar:

- orb principal;
- nome;
- contexto de conversa;
- status “privado por padrão”;
- lista de Ana, Jacira e Cleane;
- indicação de que os contextos são protótipos e não diagnósticos.

## Interação

Ao selecionar um agente:

- a orb e o conteúdo mudam juntos;
- Chroma mascara a transição;
- o botão escolhido recebe `aria-pressed=true`;
- dimensões não mudam;
- seleção não inicia conversa nem solicita microfone.

## Estados

- default: Ana selecionada;
- hover: borda e elevação discretas;
- focus: ring visível;
- selected: fundo e borda de marca + texto “Selecionado” acessível;
- reduced motion: troca imediata;
- JavaScript indisponível: Ana e conteúdo essencial continuam presentes no HTML inicial.
