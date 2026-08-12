# Spec — FAQ e interesse

## FAQ

Usar FAQ pesquisável SmoothUI com perguntas:

- O Amarelo é terapia?
- A IA diagnostica?
- Minha família vê minhas conversas?
- Posso retirar um compartilhamento?
- Para quem é o MVP?
- O que acontece em uma emergência?

Respostas devem ser curtas, qualificadas e não inventar comportamento ainda não implementado.

## Formulário de interesse

Status: PROTÓTIPO local.

Campos:

- e-mail obrigatório;
- interesse opcional entre “usar”, “participar da rede” e “acompanhar o projeto”.

Validação:

- e-mail vazio: mensagem específica;
- e-mail inválido: mensagem específica;
- envio válido: estado de sucesso local;
- nenhum dado é transmitido nesta implementação.

Privacidade:

- declarar que a integração de lista de espera ainda não está conectada;
- não solicitar diagnóstico;
- não solicitar relato de saúde;
- não marcar consentimento automaticamente.

## Critérios de aceite

- Mensagens de erro ligadas aos campos por `aria-describedby`.
- Estado de sucesso anunciado por `role=status`.
- Botão não muda de largura de forma brusca.
- Teclado consegue concluir todo o fluxo.
