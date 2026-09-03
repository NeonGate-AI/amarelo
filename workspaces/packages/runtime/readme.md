# Runtime local

`pnpm runtime` sobe o ambiente de desenvolvimento inteiro em primeiro plano e agrega os logs. Na primeira execução, o CLI cria `workspaces/packages/runtime/.env` com senhas locais aleatórias e permissões restritas. Esse arquivo não é versionado.

## Serviços

| Serviço | Endereço local | Papel |
|---|---|---|
| landing | `http://localhost:3000` | Narrativa pública em Next.js |
| console | `http://localhost:3001` | Console de memória em Next.js |
| onboarding | `http://localhost:3002` | Autenticação e onboarding em Next.js |
| mobile | `http://localhost:3003` | PWA React/Vite atual, sem integração com IA ou memória |
| postgres | `localhost:5432` | Persistência canônica local, com suporte nativo a colunas relacionais, JSONB e FTS |
| redis | `localhost:6379` | Cache efêmero para experimentos de escopo exato, rate limit e hints de entitlement |

PostgreSQL é o armazenamento canônico aceito. O volume `postgres-data` preserva os dados entre reinicializações. `pgvector` não é instalado nem ativado; ele continua condicionado a evidência offline futura. Neon permanece uma opção gerenciada substituível, sem dependência no runtime local.

Redis não é memória longitudinal, não é banco canônico, não persiste dados e não representa o LangCache gerenciado. Ele existe apenas para experimentos locais de cache, rate limit e hints reconstruíveis de entitlement. O ledger canônico futuro de uso, minutos e cobrança permanece no PostgreSQL; Redis nunca decide sozinho se uma pessoa tem acesso. Nenhum app consome `DATABASE_URL` ou `REDIS_URL` ainda; o Compose apenas injeta essas variáveis para a integração futura. Este pacote também não cria schemas ou migrações e não implementa adaptadores PostgreSQL/Redis.

## Uso

É necessário ter Docker Engine com Docker Compose v2.

```bash
pnpm runtime
pnpm runtime -- ps
pnpm runtime -- logs
pnpm runtime -- down
```

O comando padrão executa `docker compose up --build --remove-orphans` sem modo detached. `Ctrl+C` encerra os serviços com os períodos de graça configurados. `down` remove containers e a rede, mas preserva o volume do PostgreSQL.

Os quatro apps e PostgreSQL/Redis são publicados somente em `127.0.0.1`. O código-fonte é montado no container para hot reload; dependências e saídas de build usam volumes nomeados para não misturar artefatos Linux com o host. O serviço one-shot `workspace-prepare` instala o grafo reproduzível de dependências com o `pnpm-lock.yaml` versionado e `--frozen-lockfile`, depois gera os tokens do design system antes dos apps.

Para escolher outras portas ou credenciais locais, copie `.env.example` para `.env` antes de iniciar. Use senhas URL-safe porque as URLs de conexão são montadas diretamente a partir dessas variáveis.
