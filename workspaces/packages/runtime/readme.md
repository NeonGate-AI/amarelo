# Runtime local

`@repo/runtime` representa o ambiente local completo do Amarelo em Kubernetes. A base Kustomize vive em `kubernetes/` e pertence ao namespace `amarelo-runtime`. Docker continua responsável apenas por construir a imagem OCI local; não existe um segundo orquestrador ativo.

## Serviços

| Recurso | Endereço interno | Papel |
|---|---|---|
| landing | `http://landing:3000` | Narrativa pública em Next.js |
| console | `http://console:3001` | Console de memória em Next.js |
| onboarding | `http://onboarding:3002` | Autenticação e onboarding em Next.js |
| mobile | `http://mobile:3003` | PWA React/Vite |
| postgres | `postgres:5432` | Persistência canônica local com suporte relacional, JSONB e FTS |
| redis | `redis:6379` | Cache efêmero reconstruível |

PostgreSQL 17 executa em StatefulSet e usa o claim `postgres-data`, preservado quando os workloads são parados. `pgvector` não é instalado nem ativado. Redis 8 usa armazenamento efêmero: não é memória longitudinal, banco canônico, ledger de entitlement nem substituto do PostgreSQL.

Os quatro apps usam a mesma imagem `amarelo-dev-workspace:local`, construída pelo `Dockerfile.dev` com o `pnpm-lock.yaml` e instalação congelada. Cada app continua sendo um Deployment e Service independente.

## Pré-requisitos

- Node.js 24 e pnpm 10.32.1;
- Docker Engine para a imagem local;
- `kubectl` com um contexto Kubernetes ativo;
- `kind` ou `minikube` quando o contexto correspondente precisar receber a imagem local.

Docker Desktop e Rancher Desktop usam a imagem local diretamente. Em outro cluster, defina `AMARELO_RUNTIME_IMAGE` com uma imagem acessível pelo registry; nesse modo o build local é ignorado.

## Uso

A interface pública pertence ao Elo:

```sh
elo runtime up
elo runtime down
elo runtime prune
elo runtime e2e
```

`up` gera `.env` com modo `0600` quando necessário, constrói ou seleciona a imagem, aplica o Secret local e a base Kustomize, restaura uma réplica por workload e aguarda os cinco Deployments e o StatefulSet.

`down` remove recursos Cypress transitórios, escala Deployments e StatefulSets para zero e espera os pods terminarem. O namespace, a configuração, o Secret e o PVC do PostgreSQL permanecem. Repetir o comando com o namespace ausente é seguro.

`prune` é destrutivo: espera a remoção do namespace `amarelo-runtime` — incluindo workloads, Services, ConfigMap, Secret e PVC — e só então remove o arquivo de ambiente local. O cluster, imagens em registry e caches de imagem do Docker/kind/minikube não pertencem a esse boundary e são preservados.

`e2e` sempre executa `up` primeiro. Depois cria uma suíte ConfigMap e um Job efêmero com `cypress/included:15.19.0`, executa `cypress run --headless` contra os quatro Services e transmite o log. Sucesso remove os recursos transitórios e mantém o runtime base no ar. Falha ou timeout retorna status diferente de zero e preserva Job/ConfigMap para diagnóstico até o próximo `e2e`, `down` ou `prune`.

As credenciais nunca aparecem nos manifests rastreados. Para valores próprios, copie `.env.example` para `.env` e substitua os placeholders antes de iniciar. Sintaxe inválida de `elo runtime` falha antes de invocar pnpm, Docker ou kubectl.

## Acesso pelo host

Os Services são `ClusterIP` para manter a base independente da distribuição local. Quando precisar abrir uma aplicação no host, use um port-forward explícito, por exemplo:

```sh
kubectl --namespace amarelo-runtime port-forward service/mobile 3003:3003
```

A exposição de produção, incluindo ingress, TLS e DNS, não é definida por esta base local.

## Limites

Este pacote não provisiona cluster, registry, ingress, TLS, autoscaling, backup, restauração ou segredo gerenciado. Renderização client-side e processos falsos do harness verificam o contrato de recursos e comandos, mas não são apresentados como validação de um cluster de produção.
