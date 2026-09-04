# Runtime local

`@repo/runtime` representa o ambiente local completo do Amarelo em Kubernetes. A base Kustomize vive em `kubernetes/` e pertence ao namespace `amarelo-runtime`. Docker continua responsável apenas por construir a imagem OCI local; Docker Compose não faz parte do runtime ativo.

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

## Uso durante a migração

Até a promoção dos comandos Elo em SPEC-038, use o entrypoint do pacote:

```sh
pnpm --filter @repo/runtime start -- up
pnpm --filter @repo/runtime start -- ps
pnpm --filter @repo/runtime start -- logs
pnpm --filter @repo/runtime start -- config
pnpm --filter @repo/runtime start -- down
```

`up` gera `.env` com modo `0600` quando necessário, constrói ou seleciona a imagem, aplica o Secret local e a base Kustomize, restaura uma réplica por workload e aguarda todos os rollouts. `down` escala Deployments e StatefulSets para zero, preservando namespace, configuração, Secret e o PVC do PostgreSQL.

As credenciais nunca aparecem nos manifests rastreados. Para valores próprios, copie `.env.example` para `.env` e substitua os placeholders antes de iniciar.

## Acesso pelo host

Os Services são `ClusterIP` para manter a base independente da distribuição local. Quando precisar abrir uma aplicação no host, use um port-forward explícito, por exemplo:

```sh
kubectl --namespace amarelo-runtime port-forward service/mobile 3003:3003
```

A exposição de produção, incluindo ingress, TLS e DNS, não é definida por esta base local.

## Limites

Este pacote não provisiona cluster, registry, ingress, TLS, autoscaling, backup, restauração ou segredo gerenciado. Renderização client-side e processos falsos do harness verificam o contrato de recursos e comandos, mas não são apresentados como validação de um cluster de produção.
