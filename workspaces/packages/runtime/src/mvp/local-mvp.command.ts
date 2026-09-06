import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'

const runtimeDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..'
)
const projectRoot = resolve(runtimeDirectory, '../../..')
const environmentFile = resolve(runtimeDirectory, '.env')
const namespace = 'amarelo-mvp'
const ownerLabel = 'amarelo.life/runtime-owner'
const ownerValue = 'local-mvp-v1'
const secretName = 'amarelo-runtime-environment'

function safeProcessEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}
  for (const name of [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'SHELL',
    'TMPDIR',
    'TMP',
    'TEMP',
    'LANG',
    'LC_ALL',
    'TERM',
    'SystemRoot',
    'APPDATA',
    'LOCALAPPDATA',
    'PNPM_HOME',
    'COREPACK_HOME',
    'COREPACK_ENABLE_NETWORK'
  ]) {
    if (process.env[name] !== undefined) environment[name] = process.env[name]
  }
  return environment
}

function requireFields(
  environment: Record<string, string>,
  names: string[]
): void {
  const missing = names.filter((name) => !environment[name]?.trim())
  if (missing.length > 0)
    throw new Error(`Preencha em runtime/.env: ${missing.join(', ')}.`)
}

function objectField(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined
}

function parseKubernetesObject(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(
      'O kubectl retornou uma resposta inválida; nenhum conteúdo foi registrado.'
    )
  }
}

/** Starts only the explicitly configured, single-owner loopback MVP. */
export async function runLocalMvp(
  arguments_: readonly string[] = process.argv.slice(2)
): Promise<void> {
  const argumentsWithoutSeparator =
    arguments_[0] === '--' ? arguments_.slice(1) : arguments_
  const [action] = argumentsWithoutSeparator
  if (
    argumentsWithoutSeparator.length !== 1 ||
    !['init', 'infra', 'start'].includes(action ?? '')
  )
    throw new Error('Uso: pnpm mvp:init | pnpm mvp:infra | pnpm dev:mvp')

  if (action === 'init') {
    let contents = await readFile(
      resolve(runtimeDirectory, '.env.template'),
      'utf8'
    )
    for (const name of ['REDIS_QUEUE_PASSWORD', 'REDIS_CACHE_PASSWORD'])
      contents = contents.replace(
        `${name}=\n`,
        `${name}=${randomBytes(32).toString('base64url')}\n`
      )
    try {
      await writeFile(environmentFile, contents, { flag: 'wx', mode: 0o600 })
      console.info(
        '[mvp] Ambiente criado. Preencha os campos OpenAI e Neo4j em workspaces/packages/runtime/.env.'
      )
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'EEXIST'
      ) {
        console.info(
          '[mvp] .env existente preservado. Compare os campos com .env.template antes de iniciar.'
        )
        return
      }
      throw new Error('Não foi possível criar o arquivo local de configuração.')
    }
    return
  }

  let configuration: Record<string, string>
  try {
    configuration = Object.fromEntries(
      Object.entries(parseEnv(await readFile(environmentFile, 'utf8'))).filter(
        (entry): entry is [string, string] => entry[1] !== undefined
      )
    )
  } catch {
    throw new Error(
      'Não foi possível ler runtime/.env. Execute pnpm mvp:init primeiro.'
    )
  }
  requireFields(configuration, ['REDIS_QUEUE_PASSWORD', 'REDIS_CACHE_PASSWORD'])
  const children = new Set<ChildProcess>()
  const baseEnvironment = safeProcessEnvironment()
  const kubernetesEnvironment = {
    ...baseEnvironment,
    ...(process.env.KUBECONFIG ? { KUBECONFIG: process.env.KUBECONFIG } : {})
  }
  let stopping = false
  let finishStop: () => void = () => undefined
  const stopped = new Promise<void>((resolveStop) => {
    finishStop = resolveStop
  })
  let cleanupPromise: Promise<void> | undefined

  function signal(child: ChildProcess, name: NodeJS.Signals): void {
    if (child.pid === undefined) return
    try {
      if (process.platform === 'win32') child.kill(name)
      else process.kill(-child.pid, name)
    } catch {
      /* The child may have already exited. */
    }
  }

  function cleanup(): Promise<void> {
    if (cleanupPromise !== undefined) return cleanupPromise
    stopping = true
    finishStop()
    cleanupPromise = (async () => {
      const active = [...children]
      if (active.length === 0) return
      for (const child of active) signal(child, 'SIGTERM')
      let timer: ReturnType<typeof setTimeout> | undefined
      await Promise.race([
        Promise.all(
          active.map(
            (child) =>
              new Promise<void>((done) => {
                if (child.exitCode !== null || child.signalCode !== null) done()
                else child.once('close', () => done())
              })
          )
        ),
        new Promise<void>((done) => {
          timer = setTimeout(done, 3_000)
        })
      ])
      if (timer !== undefined) clearTimeout(timer)
      for (const child of active) signal(child, 'SIGKILL')
    })()
    return cleanupPromise
  }

  const onSignal = () => {
    void cleanup()
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)

  function launch(
    label: string,
    command: string,
    args: readonly string[],
    options: {
      readonly environment?: NodeJS.ProcessEnv
      readonly cwd?: string
      readonly input?: string
      readonly capture?: boolean
    } = {}
  ): {
    readonly child: ChildProcess
    readonly completed: Promise<{ code: number; output: string }>
  } {
    if (stopping) throw new Error('Inicialização interrompida.')
    const child = spawn(command, [...args], {
      cwd: options.cwd ?? projectRoot,
      env: options.environment ?? baseEnvironment,
      detached: process.platform !== 'win32',
      stdio: [
        options.input === undefined ? 'ignore' : 'pipe',
        options.capture ? 'pipe' : 'inherit',
        options.capture ? 'ignore' : 'inherit'
      ]
    })
    children.add(child)
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
      if (output.length > 1_048_576) signal(child, 'SIGTERM')
    })
    if (options.input !== undefined) {
      child.stdin?.on('error', () => undefined)
      child.stdin?.end(options.input)
    }
    const completed = new Promise<{ code: number; output: string }>((done) => {
      child.once('error', () => {
        children.delete(child)
        done({ code: 1, output: '' })
      })
      child.once('close', (code) => {
        children.delete(child)
        done({ code: code ?? 1, output })
      })
    })
    console.info(`[mvp] ${label}`)
    return { child, completed }
  }

  async function runKubectl(
    args: readonly string[],
    input?: string
  ): Promise<string> {
    const task = launch('Configurando infraestrutura local', 'kubectl', args, {
      environment: kubernetesEnvironment,
      input,
      capture: true
    })
    const timer = setTimeout(() => signal(task.child, 'SIGTERM'), 120_000)
    try {
      const result = await task.completed
      if (result.code !== 0)
        throw new Error(
          'Falha no kubectl. Confira o contexto local ativo, permissões e recursos do namespace amarelo-mvp.'
        )
      return result.output
    } finally {
      clearTimeout(timer)
    }
  }

  async function ownedNamespace(create: boolean): Promise<void> {
    const existing = await runKubectl([
      'get',
      'namespace',
      namespace,
      '--ignore-not-found',
      '-o',
      'json'
    ])
    if (existing.trim() === '') {
      if (!create)
        throw new Error(
          'Infraestrutura ausente. Execute pnpm mvp:infra primeiro.'
        )
      await runKubectl(
        ['create', '-f', '-'],
        JSON.stringify({
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: { name: namespace, labels: { [ownerLabel]: ownerValue } }
        })
      )
      return
    }
    const value = parseKubernetesObject(existing)
    if (
      objectField(
        objectField(objectField(value, 'metadata'), 'labels'),
        ownerLabel
      ) !== ownerValue
    )
      throw new Error(
        'O namespace amarelo-mvp existente não pertence a este launcher; nenhuma alteração foi aplicada.'
      )
  }

  try {
    await ownedNamespace(action === 'infra')
    if (action === 'infra') {
      const existing = await runKubectl([
        '-n',
        namespace,
        'get',
        'secret',
        secretName,
        '--ignore-not-found',
        '-o',
        'json'
      ])
      const data = {
        REDIS_QUEUE_PASSWORD: Buffer.from(
          configuration.REDIS_QUEUE_PASSWORD ?? ''
        ).toString('base64'),
        REDIS_CACHE_PASSWORD: Buffer.from(
          configuration.REDIS_CACHE_PASSWORD ?? ''
        ).toString('base64')
      }
      if (existing.trim() === '') {
        await runKubectl(
          ['create', '-f', '-'],
          JSON.stringify({
            apiVersion: 'v1',
            kind: 'Secret',
            type: 'Opaque',
            metadata: { name: secretName, namespace },
            data
          })
        )
      } else {
        const value = parseKubernetesObject(existing)
        if (
          Object.entries(data).some(
            ([key, expected]) =>
              objectField(objectField(value, 'data'), key) !== expected
          )
        )
          throw new Error(
            'As senhas locais diferem do Secret existente. Nenhuma credencial foi sobrescrita; restaure a configuração original ou planeje uma rotação.'
          )
      }
      for (const resource of ['redis-queue', 'redis-cache'])
        await runKubectl([
          '-n',
          namespace,
          'apply',
          '-f',
          resolve(runtimeDirectory, `kubernetes/memory/${resource}.yaml`)
        ])
      for (const resource of [
        'statefulset/redis-queue',
        'deployment/redis-cache'
      ])
        await runKubectl([
          '-n',
          namespace,
          'rollout',
          'status',
          resource,
          '--timeout=90s'
        ])
      console.info(
        '[mvp] Redis Queue persistente e Redis Cache separados estão preparados no namespace amarelo-mvp.'
      )
      return
    }

    requireFields(configuration, [
      'OPENAI_API_KEY',
      'OPENAI_REALTIME_MODEL',
      'OPENAI_TRANSCRIPTION_MODEL',
      'MEMORY_EXTRACTION_MODEL',
      'MEMORY_NEO4J_URI',
      'MEMORY_NEO4J_USERNAME',
      'MEMORY_NEO4J_PASSWORD',
      'MEMORY_NEO4J_DATABASE'
    ])
    if (
      configuration.NODE_ENV !== 'development' ||
      configuration.CHATTERBOX_AUTH_MODE !== 'local' ||
      configuration.CHATTERBOX_HOST !== '127.0.0.1'
    )
      throw new Error(
        'dev:mvp exige NODE_ENV=development, CHATTERBOX_AUTH_MODE=local e CHATTERBOX_HOST=127.0.0.1.'
      )

    const designSystem = await launch(
      'Compilando tokens da interface',
      'pnpm',
      ['--filter', '@repo/ds', 'build']
    ).completed
    if (designSystem.code !== 0)
      throw new Error('Não foi possível compilar os tokens da interface.')

    const memoryBuild = await launch('Compilando Memory', 'pnpm', [
      '--filter',
      '@nucleus/memory',
      'build'
    ]).completed
    if (memoryBuild.code !== 0)
      throw new Error('Não foi possível compilar o runtime Memory.')

    const services: Promise<{ code: number; output: string }>[] = []
    for (const [name, port] of [
      ['redis-queue', 6379],
      ['redis-cache', 6380]
    ] as const) {
      const forward = launch(
        `Encaminhando ${name} para loopback:${port}`,
        'kubectl',
        [
          '-n',
          namespace,
          'port-forward',
          `service/${name}`,
          `${port}:6379`,
          '--address=127.0.0.1'
        ],
        { environment: kubernetesEnvironment, capture: true }
      )
      services.push(forward.completed)
      await new Promise<void>((ready, fail) => {
        const timer = setTimeout(
          () =>
            fail(
              new Error(
                `Port-forward ${name} indisponível; confira a porta ${port} e o cluster local.`
              )
            ),
          20_000
        )
        let text = ''
        const onData = (chunk: Buffer) => {
          text += chunk.toString('utf8')
          if (text.includes(`Forwarding from 127.0.0.1:${port}`)) {
            clearTimeout(timer)
            forward.child.stdout?.removeListener('data', onData)
            ready()
          }
        }
        forward.child.stdout?.on('data', onData)
        void forward.completed.then(() => {
          clearTimeout(timer)
          fail(new Error(`Port-forward ${name} foi encerrado.`))
        })
      })
    }

    const serverEnvironment: NodeJS.ProcessEnv = {
      ...baseEnvironment,
      ...configuration,
      MEMORY_REDIS_QUEUE_URL: `redis://:${encodeURIComponent(configuration.REDIS_QUEUE_PASSWORD ?? '')}@127.0.0.1:6379/0`,
      MEMORY_REDIS_CACHE_URL: `redis://:${encodeURIComponent(configuration.REDIS_CACHE_PASSWORD ?? '')}@127.0.0.1:6380/0`
    }
    services.push(
      launch(
        'Iniciando curadoria Memory',
        'sh',
        ['src/infrastructure/worker/memory-background.sh'],
        {
          cwd: resolve(projectRoot, 'workspaces/memory-nucleus'),
          environment: serverEnvironment
        }
      ).completed
    )
    services.push(
      launch(
        'Iniciando Chatterbox',
        process.execPath,
        ['--import', 'tsx', 'src/server/chatterbox.server.ts'],
        {
          cwd: resolve(projectRoot, 'workspaces/microservices/chatterbox'),
          environment: serverEnvironment
        }
      ).completed
    )
    services.push(
      launch(
        'Iniciando PWA em http://localhost:3003',
        'pnpm',
        ['--filter', 'mobile', 'dev'],
        {
          environment: {
            ...baseEnvironment,
            NODE_ENV: 'development',
            CHATTERBOX_URL: `http://127.0.0.1:${configuration.CHATTERBOX_PORT ?? '3004'}`,
            VITE_CHATTERBOX_URL: '/api',
            VITE_AMARELO_TEXT_DRIVER: 'false',
            VITE_AMARELO_REALTIME_VOICE: 'true'
          }
        }
      ).completed
    )
    console.info(
      '[mvp] Ao abrir a conversa, escolha explicitamente a permissão de memória. Ctrl+C encerra os processos locais e preserva o Redis e o Neo4j.'
    )
    await Promise.race([...services, stopped])
    if (!stopping)
      throw new Error(
        'Um serviço do MVP encerrou. Os outros processos locais foram interrompidos.'
      )
  } finally {
    await cleanup()
    process.removeListener('SIGINT', onSignal)
    process.removeListener('SIGTERM', onSignal)
  }
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  runLocalMvp().catch((error: unknown) => {
    console.error(
      `[mvp] ${error instanceof Error ? error.message : 'Falha ao iniciar o ambiente local.'}`
    )
    process.exitCode = 1
  })
}
