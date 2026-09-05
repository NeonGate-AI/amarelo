# Primeiro MVP local por voz

Este fluxo conecta a PWA ao Realtime da OpenAI e encaminha as falas finalizadas do usuário para a curadoria LangGraph, BullMQ e Neo4j. WorkOS fica para depois; o acesso usa uma identidade local estável, com origem, expiração e propriedade da conversa verificadas pelo servidor.

Use Node.js 24, pnpm 10.32.1 e `kubectl` apontando para um cluster local com provisionamento de volumes. O launcher não cria um cluster. Redis Queue e Redis Cache reutilizam os manifests existentes em um namespace exclusivo, `amarelo-mvp`. A conta Neo4j fornece o grafo hospedado.

Na raiz do repositório:

```sh
pnpm install --frozen-lockfile
pnpm mvp:init
```

Preencha `workspaces/packages/runtime/.env`: `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`, `MEMORY_EXTRACTION_MODEL`, `MEMORY_NEO4J_URI`, `MEMORY_NEO4J_USERNAME`, `MEMORY_NEO4J_PASSWORD` e o banco explícito em `MEMORY_NEO4J_DATABASE`. O template sugere identificadores configuráveis para voz e transcrição. O modelo de extração precisa oferecer saída estruturada. A disponibilidade desses modelos depende da conta; o código não comprova seu custo nem sua qualidade.

`mvp:init` cria esse arquivo exclusivamente, com modo `0600`, e gera apenas as duas senhas Redis. Nunca sobrescreve `.env` existente. Se o arquivo veio do runtime anterior, preserve os valores necessários e complete os campos do novo template manualmente. OpenAI e Neo4j permanecem sem credenciais até você preenchê-las.

```sh
pnpm mvp:infra
pnpm dev:mvp
```

`mvp:infra` prepara apenas Redis no contexto Kubernetes ativo. Um namespace `amarelo-mvp` existente sem a identificação deste launcher é recusado. O Secret existente é preservado; divergência de senhas exige uma rotação deliberada. Nenhuma configuração do namespace `amarelo-runtime` é alterada e as credenciais OpenAI/Neo4j não são enviadas aos pods Redis.

`dev:mvp` compila Memory, encaminha Redis Queue para `127.0.0.1:6379` e Redis Cache para `127.0.0.1:6380`, e inicia o worker, Chatterbox e a PWA. Deixe essas portas e as portas `3003`/`3004` livres. Abra **http://localhost:3003** e escolha explicitamente a permissão de memória antes de iniciar a conversa. O áudio flui diretamente entre navegador e OpenAI por WebRTC; o Chatterbox abre a sessão e acompanha memória/ferramentas em paralelo. O navegador recebe somente as flags públicas e o endereço do proxy; a chave OpenAI e as credenciais dos serviços ficam no servidor.

Mantenha `CHATTERBOX_LOCAL_OWNER_ID` para acessar a mesma identidade após reiniciar. Esse identificador não concede consentimento por si só. Sessões de conversa expiram; abra uma nova conversa quando necessário. O launcher opera somente em desenvolvimento e em loopback, com perfil interno de memória. O plano Free continua sem curadoria de background.

Ao falar, a OpenAI produz a resposta de voz. Apenas texto finalizado do usuário pode formar evidência de memória; a resposta da Ana e os períodos de silêncio não viram evidência. A curadoria ocorre de forma assíncrona: receber uma fala ou publicá-la na fila não significa que ela já foi aceita como memória canônica. Falhas devem permanecer explícitas na interface e nos eventos operacionais.

`Ctrl+C` encerra processos locais e port-forwards. Uma falha de processo também interrompe os demais. Os pods, o volume persistente da fila e o grafo Neo4j são preservados. O launcher não remove dados automaticamente.

O comando normal pode iniciar conexões com os serviços configurados; chamadas pagas de voz começam ao abrir a conversa e a extração pode processar evidência pendente no worker. A implementação foi entregue sem executar infraestrutura, chamadas pagas ou validação integrada neste ciclo. SPEC-049 registra a validação futura. A entrada pública multiusuário, WorkOS e a prova de economia completa de voz permanecem fora deste recorte.
