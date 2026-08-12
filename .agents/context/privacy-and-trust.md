# Contexto de Privacidade e Confiança

## Pergunta institucional

> Quem pode saber o quê, em qual contexto, para qual finalidade e por quanto tempo?

## Princípios

- privado por padrão;
- compartilhamento explícito;
- consentimento granular;
- acesso revogável;
- minimização de dados;
- proveniência;
- auditabilidade;
- autorização antes da recuperação;
- nenhum compartilhamento silencioso;
- nenhum treinamento com conteúdo do usuário por padrão.

## Modelo mental de interface

Todo conteúdo deve possuir um estado compreensível:

- `Privado` — somente a pessoa;
- `Compartilhado` — destinatários nomeados e escopo visível;
- `Redigido` — versão derivada que oculta trechos;
- `Inferido` — interpretação da IA, nunca fato declarado pelo usuário;
- `Revogado` — bloqueia acessos futuros e preserva histórico auditável.

## Regras para o protótipo

- Novo registro começa privado.
- O controle de compartilhamento nunca vem pré-selecionado.
- Notificações não exibem conteúdo pessoal.
- Busca e gráficos não revelam conteúdo que estaria fora do escopo autorizado.
- Dados demonstrativos não usam nomes ou histórias reais.
- A interface mostra que uma representação compartilhada pode ser diferente do conteúdo original.

## Retrieval e memória

Autorização é aplicada antes de buscar memória ou contexto. Segurança técnica, relação familiar ou acesso a uma conta não equivalem a autorização ampla.

Cada memória futura deverá registrar:

- origem;
- autor;
- data;
- nível de confiança;
- sensibilidade;
- escopo;
- finalidade;
- destinatários autorizados;
- retenção;
- proveniência e transformações.

## Exclusões do protótipo

Este repositório não implementa nesta entrega:

- armazenamento real;
- autenticação;
- compartilhamento real;
- exportação real;
- exclusão real;
- detecção ou escalonamento de risco.

As interfaces representam comportamento esperado, não garantem uma arquitetura de produção já concluída.
