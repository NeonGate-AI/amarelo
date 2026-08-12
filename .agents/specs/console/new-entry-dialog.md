# Spec — Dialog de novo registro

## Objetivo

Substituir o fluxo Pix por uma demonstração de registro pessoal privado por padrão.

## Conteúdo

- título “Novo registro”;
- explicação de que o conteúdo começa privado;
- textarea opcional para nota;
- escolha simples “Como está este momento?” com cinco opções textuais/numéricas;
- controle de visibilidade fixado em “Somente você” no protótipo;
- botão “Salvar registro”.

## Estados

### Inicial

- nenhum valor clínico inferido;
- privacidade explicitamente privada.

### Validação

- exigir nota ou seleção de momento;
- mostrar mensagem próxima ao conteúdo;
- manter o dialog aberto.

### Salvo

- confirmar localmente;
- informar que é demonstração e não persiste;
- permitir concluir e fechar.

### Fechado

- limpar conteúdo demonstrativo e mensagens.

## Privacidade

- nenhum destinatário pré-selecionado;
- nenhum dado enviado;
- nenhuma informação sensível em toast ou notificação;
- não oferecer compartilhamento dentro do mesmo clique de salvar.
