# Runtime local

Para a primeira conversa local com memória e sem WorkOS, use o [guia do MVP](mvp.md): `pnpm mvp:init`, configuração dos serviços, `pnpm mvp:infra` e `pnpm dev:mvp`.

`@repo/runtime` representa o ambiente local do Amarelo em Kubernetes. A base Kustomize vive em `kubernetes/` e pertence ao namespace `amarelo-runtime`. Por padrão somente as cinco aplicações são iniciadas; infraestrutura sem consumidor ativo exige um perfil explícito. Docker continua responsável apenas por construir a imagem OCI local; não existe um segundo orquestrador ativo.

## Perfis

| Perfil | Aplicações | Infraestrutura adicional | Kustomize |
|---|---|---|---|
| `application` (padrão) | landing, console, onboarding, mobile, Chatterbox | Nenhuma | `kubernetes/` |
| `memory` | As mesmas cinco | Neo4j, Redis Queue, Redis Cache e MinIO | `kubernetes/profiles/memory/` |
| `reference` | As mesmas cinco | PostgreSQL, para o adapter relacional de referência | `kubernetes/profiles/reference/` |

Os perfis são mutuamente exclusivos. `--profile` prevalece sobre a variável de shell `AMARELO_RUNTIME_PROFILE`; na ausência de ambos, usa-se `application`. O arquivo `.env` é enviado ao Secret do cluster, não é carregado como configuração do CLI.

Trocar o perfil com `up` escala infraestrutura já existente e fora do perfil para zero, aguarda sua parada e preserva Services, PVCs e credenciais. Não há `apply --prune`, remoção de namespace ou exclusão de dados na seleção de perfil. Os valores efêmeros de Redis Cache podem desaparecer ao parar o processo, como previsto pelo seu contrato descartável. Retomar `memory` ou `reference` reutiliza os claims preservados. Essa pausa também pode interromper trabalhos em andamento: selecione o perfil deliberadamente antes de executar workers futuros.

## Serviços

| Recurso | Endereço interno | Papel |
|---|---|---|
| landing | `http://landing:3000` | Narrativa pública em Next.js |
| console | `http://console:3001` | Console de memória em Next.js |
| onboarding | `http://onboarding:3002` | Autenticação e onboarding em Next.js |
| mobile | `http://mobile:3003` | PWA React/Vite |
| chatterbox | `http://chatterbox:3004` | API Node/Fastify de conversa e liveness |
| postgres | `postgres:5432` | Adaptador relacional de referência; somente perfil `reference` |
| neo4j | `bolt://neo4j:7687` | Grafo canônico de Memory, índices e transactional outbox |
| redis-queue | `redis-queue:6379` | Broker persistente dedicado ao BullMQ |
| redis-cache | `redis-cache:6379` | Cache-aside efêmero e reconstruível |
| object-storage | `http://object-storage:9000` | Áudio, documentos originais e artefatos grandes imutáveis |

PostgreSQL 17 permanece disponível no perfil `reference`, em StatefulSet com o
claim `postgres-data`, mas não é a fonte canônica de Memory. Neo4j usa
`neo4j-data` no perfil `memory` e é o destino selecionado
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
elo runtime up --profile memory
elo runtime up --profile reference
elo runtime down
elo runtime prune
elo runtime e2e
elo runtime e2e --profile memory
```

`up` gera `.env` com modo `0600` quando necessário, constrói ou seleciona imagens por projeto, aplica o Secret local e o perfil Kustomize, suspende infraestrutura excluída, restaura uma réplica por workload selecionado e aguarda sua readiness. Chatterbox só fica pronto depois de responder em `GET /health`; a rota representa liveness do processo, não readiness das dependências.

`down` sempre cobre todo o namespace, independentemente do perfil anterior: remove recursos Cypress transitórios, escala Deployments e StatefulSets para zero e espera os pods terminarem. O namespace, a configuração, o Secret e os PVCs de PostgreSQL, Neo4j, Redis Queue e object storage permanecem. Repetir o comando com o namespace ausente é seguro. `down` e `prune` rejeitam `--profile`, pois não são operações limitadas a um perfil.

`prune` é destrutivo: espera a remoção do namespace `amarelo-runtime` — incluindo workloads, Services, ConfigMap, Secret e PVC — e só então remove o arquivo de ambiente local. O cluster, imagens em registry e caches de imagem do Docker/kind/minikube não pertencem a esse boundary e são preservados.

`e2e` sempre executa `up` primeiro com o mesmo perfil escolhido. Depois cria uma suíte ConfigMap e um Job efêmero com `cypress/included:15.19.0`, executa `cypress run --headless` contra os quatro Services de interface e o health de Chatterbox, e transmite o log. Essa suíte é um smoke de disponibilidade; jornadas de interface entram somente quando forem explicitamente aprovadas como críticas. Sucesso remove os recursos transitórios e mantém o runtime selecionado no ar. Falha ou timeout retorna status diferente de zero e preserva Job/ConfigMap para diagnóstico até o próximo `e2e`, `down` ou `prune`.

As credenciais nunca aparecem nos manifests rastreados. Para valores próprios, copie `.env.example` para `.env` e substitua os placeholders antes de iniciar. Sintaxe inválida de `elo runtime` falha antes de invocar pnpm, Docker ou kubectl.

O perfil de aplicação não configura identidades automaticamente. Para a conversa autenticada, configure `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, o mesmo `WORKOS_COOKIE_PASSWORD` no onboarding e no Chatterbox, e `CHATTERBOX_ALLOWED_ORIGINS` com origens exatas autorizadas. A lista vazia bloqueia requisições de navegador; `http://localhost:3003` é somente um exemplo para desenvolvimento. Configure também `OPENAI_API_KEY` e `AI_CONVERSATION_MODEL`; sem ambos, o provedor de conversa permanece indisponível. Esses valores são server-only e ficam no Secret local, nunca em variáveis `VITE_*` ou no bundle da PWA. Reinicie os Deployments consumidores após mudar um Secret já utilizado por pods em execução.

Para inspecionar sem aplicar: `pnpm --filter @repo/runtime start -- config --profile memory`. `elo check runtime` renderiza os três perfis com `kubectl kustomize` e executa testes de comandos falsos. Sem `kubectl`, `.audit/runtime.audit.sh --commands-only` executa somente os checks estáticos e sintéticos e anuncia explicitamente que a renderização foi omitida; não substitui o gate completo nem comprova um cluster ativo.

## Acesso pelo host

Os Services são `ClusterIP` para manter a base independente da distribuição local. Quando precisar abrir uma aplicação no host, use um port-forward explícito, por exemplo:

```sh
kubectl --namespace amarelo-runtime port-forward service/mobile 3003:3003
```

A exposição de produção, incluindo ingress, TLS e DNS, não é definida por esta base local.

## Limites

Este pacote não provisiona cluster, registry, ingress, TLS, autoscaling, backup, restauração ou segredo gerenciado. Renderização client-side e processos falsos do harness verificam o contrato de recursos e comandos, mas não são apresentados como validação de um cluster de produção.
