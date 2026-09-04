# Runtime local

`@repo/runtime` representa o ambiente local completo do Amarelo em Kubernetes. A base Kustomize vive em `kubernetes/` e pertence ao namespace `amarelo-runtime`. Docker continua responsável apenas por construir a imagem OCI local; não existe um segundo orquestrador ativo.

## Serviços

| Recurso | Endereço interno | Papel |
|---|---|---|
| landing | `http://landing:3000` | Narrativa pública em Next.js |
| console | `http://console:3001` | Console de memória em Next.js |
| onboarding | `http://onboarding:3002` | Autenticação e onboarding em Next.js |
| mobile | `http://mobile:3003` | PWA React/Vite |
| chatterbox | `http://chatterbox:3004` | API Node/Fastify de conversa e liveness |
| postgres | `postgres:5432` | Dados relacionais gerais e adaptador Memory de referência durante a migração |
| neo4j | `bolt://neo4j:7687` | Grafo canônico de Memory, índices e transactional outbox |
| redis-queue | `redis-queue:6379` | Broker persistente dedicado ao BullMQ |
| redis-cache | `redis-cache:6379` | Cache-aside efêmero e reconstruível |
| object-storage | `http://object-storage:9000` | Áudio, documentos originais e artefatos grandes imutáveis |

PostgreSQL 17 continua em StatefulSet com o claim `postgres-data`, mas não é
mais a fonte canônica de Memory. Neo4j usa `neo4j-data` e é o destino selecionado
para evidência, memórias episódicas/semânticas, relacionamentos, projeções
longitudinais, busca full-text/vetorial e outbox. A presença do workload não
afirma que o adaptador ou o schema de produção já foram implementados.

Redis Queue e Redis Cache são processos, Services e credenciais distintos — não
logical databases do mesmo servidor. Redis Queue usa AOF e o claim
`redis-queue-data`; Redis Cache é descartável. Object storage usa MinIO e o claim
`object-storage-data`. Ele guarda conteúdo grande, enquanto o futuro grafo
guarda referências governadas. Nenhum Redis ou bucket substitui a autoridade do
Neo4j sobre Memory.

Landing, console, onboarding, mobile e Chatterbox possuem cada qual um `Dockerfile` e `.env.template` na raiz do projeto. O runtime constrói imagens locais distintas — `amarelo-<workload>:local` — usando a raiz do repositório, o `pnpm-lock.yaml` e instalação congelada. Cada workload continua sendo um Deployment e Service independente.

## Pré-requisitos

- Node.js 24 e pnpm 10.32.1;
- Docker Engine para a imagem local;
- `kubectl` com um contexto Kubernetes ativo;
- `kind` ou `minikube` quando o contexto correspondente precisar receber a imagem local.

Docker Desktop e Rancher Desktop usam as imagens locais diretamente. Em outro cluster, defina `AMARELO_RUNTIME_IMAGE_PREFIX` com o prefixo de um registry acessível, por exemplo `registry.example/amarelo`; nesse modo os builds locais são ignorados e cada workload usa `<prefix>/<workload>:local`.

## Uso

A interface pública pertence ao Elo:

```sh
elo runtime up
elo runtime down
elo runtime prune
elo runtime e2e
```

`up` gera `.env` com modo `0600` quando necessário, constrói ou seleciona imagens por projeto, aplica o Secret local e a base Kustomize, restaura uma réplica por workload e aguarda todos os Deployments e StatefulSets. Chatterbox só fica pronto depois de responder em `GET /health`; a rota representa liveness do processo, não readiness das dependências.

`down` remove recursos Cypress transitórios, escala Deployments e StatefulSets para zero e espera os pods terminarem. O namespace, a configuração, o Secret e os PVCs de PostgreSQL, Neo4j, Redis Queue e object storage permanecem. Repetir o comando com o namespace ausente é seguro.

`prune` é destrutivo: espera a remoção do namespace `amarelo-runtime` — incluindo workloads, Services, ConfigMap, Secret e PVC — e só então remove o arquivo de ambiente local. O cluster, imagens em registry e caches de imagem do Docker/kind/minikube não pertencem a esse boundary e são preservados.

`e2e` sempre executa `up` primeiro. Depois cria uma suíte ConfigMap e um Job efêmero com `cypress/included:15.19.0`, executa `cypress run --headless` contra os quatro Services de interface e o health de Chatterbox, e transmite o log. Essa suíte é um smoke de disponibilidade; jornadas de interface entram somente quando forem explicitamente aprovadas como críticas. Sucesso remove os recursos transitórios e mantém o runtime base no ar. Falha ou timeout retorna status diferente de zero e preserva Job/ConfigMap para diagnóstico até o próximo `e2e`, `down` ou `prune`.

As credenciais nunca aparecem nos manifests rastreados. Para valores próprios, copie `.env.example` para `.env` e substitua os placeholders antes de iniciar. Sintaxe inválida de `elo runtime` falha antes de invocar pnpm, Docker ou kubectl.

## Acesso pelo host

Os Services são `ClusterIP` para manter a base independente da distribuição local. Quando precisar abrir uma aplicação no host, use um port-forward explícito, por exemplo:

```sh
kubectl --namespace amarelo-runtime port-forward service/mobile 3003:3003
```

A exposição de produção, incluindo ingress, TLS e DNS, não é definida por esta base local.

## Limites

Este pacote não provisiona cluster, registry, ingress, TLS, autoscaling, backup, restauração ou segredo gerenciado. Renderização client-side e processos falsos do harness verificam o contrato de recursos e comandos, mas não são apresentados como validação de um cluster de produção.
