import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { access, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const runtimeDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = resolve(runtimeDirectory, '../../..')
const kubernetesDirectory = resolve(runtimeDirectory, 'kubernetes')
const namespaceFile = resolve(kubernetesDirectory, 'namespace.yaml')
const dockerfile = resolve(runtimeDirectory, 'Dockerfile.dev')
const environmentFile = process.env.AMARELO_RUNTIME_ENV_FILE
  ? resolve(process.env.AMARELO_RUNTIME_ENV_FILE)
  : resolve(runtimeDirectory, '.env')
const runtimeNamespace = 'amarelo-runtime'
const defaultApplicationImage = 'amarelo-dev-workspace:local'
const applicationWorkloads = [
  'landing',
  'console',
  'onboarding',
  'mobile'
] as const
const deploymentWorkloads = ['redis', ...applicationWorkloads] as const

const runtimeActions = ['up', 'down', 'logs', 'ps', 'config'] as const
type RuntimeAction = (typeof runtimeActions)[number]

export async function runRuntimeCli(
  rawArguments: string[] = process.argv.slice(2)
): Promise<number> {
  const normalizedArguments =
    rawArguments[0] === '--' ? rawArguments.slice(1) : rawArguments
  const [actionArgument, ...remainingArguments] = normalizedArguments
  const action = actionArgument ?? 'up'

  if (!isRuntimeAction(action) || remainingArguments.length > 0) {
    printUsage(
      actionArgument
        ? `Ação ou argumentos inválidos: ${normalizedArguments.join(' ')}`
        : 'Ação inválida.'
    )
    return 2
  }

  switch (action) {
    case 'up':
      await runtimeUp()
      return 0
    case 'down':
      await runtimeDown()
      return 0
    case 'logs':
      await runtimeLogs()
      return 0
    case 'ps':
      await runtimePs()
      return 0
    case 'config':
      await runtimeConfig()
      return 0
  }
}

function isRuntimeAction(value: string): value is RuntimeAction {
  return runtimeActions.some((action) => action === value)
}

async function runtimeUp(): Promise<void> {
  assertKubectlIsAvailable()
  const applicationImage =
    process.env.AMARELO_RUNTIME_IMAGE ?? defaultApplicationImage

  if (applicationImage === defaultApplicationImage) {
    assertDockerIsAvailable()
    await runCommand('docker', [
      'build',
      '--file',
      dockerfile,
      '--tag',
      applicationImage,
      projectRoot
    ])
    await loadLocalImage(applicationImage)
  } else {
    console.info(
      `[runtime] Usando imagem configurada ${applicationImage}; build local ignorado.`
    )
  }

  await ensureLocalEnvironment()
  await runCommand('kubectl', ['apply', '--filename', namespaceFile])
  await applyRuntimeEnvironment()
  await runCommand('kubectl', [
    'apply',
    '--kustomize',
    kubernetesDirectory
  ])

  for (const workload of applicationWorkloads) {
    await runCommand('kubectl', [
      'set',
      'image',
      '--namespace',
      runtimeNamespace,
      `deployment/${workload}`,
      `${workload}=${applicationImage}`
    ])
  }

  await runCommand('kubectl', [
    '--namespace',
    runtimeNamespace,
    'scale',
    'deployment',
    '--all',
    '--replicas=1'
  ])
  await runCommand('kubectl', [
    '--namespace',
    runtimeNamespace,
    'scale',
    'statefulset',
    '--all',
    '--replicas=1'
  ])

  for (const workload of deploymentWorkloads) {
    await runCommand('kubectl', [
      'rollout',
      'status',
      '--namespace',
      runtimeNamespace,
      `deployment/${workload}`,
      '--timeout=300s'
    ])
  }
  await runCommand('kubectl', [
    'rollout',
    'status',
    '--namespace',
    runtimeNamespace,
    'statefulset/postgres',
    '--timeout=300s'
  ])

  console.info(
    '[runtime] Kubernetes reconciliado: PostgreSQL, Redis, landing, console, onboarding e mobile estão prontos.'
  )
}

async function runtimeDown(): Promise<void> {
  assertKubectlIsAvailable()
  if (!runtimeNamespaceExists()) {
    console.info('[runtime] Namespace amarelo-runtime já está ausente.')
    return
  }

  await runCommand('kubectl', [
    '--namespace',
    runtimeNamespace,
    'scale',
    'deployment',
    '--all',
    '--replicas=0'
  ])
  await runCommand('kubectl', [
    '--namespace',
    runtimeNamespace,
    'scale',
    'statefulset',
    '--all',
    '--replicas=0'
  ])
  console.info(
    '[runtime] Workloads parados; namespace, configuração e dados do PostgreSQL foram preservados.'
  )
}

async function runtimeLogs(): Promise<void> {
  assertKubectlIsAvailable()
  await runCommand('kubectl', [
    'logs',
    '--namespace',
    runtimeNamespace,
    '--selector',
    'app.kubernetes.io/part-of=amarelo',
    '--all-containers=true',
    '--follow',
    '--prefix',
    '--tail=100'
  ])
}

async function runtimePs(): Promise<void> {
  assertKubectlIsAvailable()
  await runCommand('kubectl', [
    'get',
    '--namespace',
    runtimeNamespace,
    'pods,services,persistentvolumeclaims'
  ])
}

async function runtimeConfig(): Promise<void> {
  assertKubectlIsAvailable()
  await runCommand('kubectl', ['kustomize', kubernetesDirectory])
}

function assertKubectlIsAvailable(): void {
  assertCommand(
    'kubectl',
    ['version', '--client'],
    'kubectl não foi encontrado. Instale-o e configure um contexto Kubernetes ativo.'
  )
}

function assertDockerIsAvailable(): void {
  assertCommand(
    'docker',
    ['version'],
    'Docker Engine não está disponível para criar a imagem local do runtime.'
  )
}

function assertCommand(
  command: string,
  arguments_: string[],
  failureMessage: string
): void {
  const result = spawnSync(command, arguments_, {
    cwd: runtimeDirectory,
    stdio: 'ignore'
  })
  if (result.error || result.status !== 0) {
    throw new Error(failureMessage)
  }
}

async function loadLocalImage(image: string): Promise<void> {
  const context = readCommand('kubectl', ['config', 'current-context'])

  if (context.startsWith('kind-')) {
    const clusterName = context.slice('kind-'.length)
    assertCommand(
      'kind',
      ['version'],
      'O contexto kind requer o comando kind para carregar a imagem local.'
    )
    await runCommand('kind', [
      'load',
      'docker-image',
      '--name',
      clusterName,
      image
    ])
    return
  }

  if (context === 'minikube' || context.startsWith('minikube-')) {
    assertCommand(
      'minikube',
      ['version'],
      'O contexto minikube requer o comando minikube para carregar a imagem local.'
    )
    await runCommand('minikube', ['image', 'load', image])
    return
  }

  if (context === 'docker-desktop' || context === 'rancher-desktop') {
    console.info(
      `[runtime] O contexto ${context} usará a imagem local ${image}.`
    )
    return
  }

  throw new Error(
    `O contexto ${context} não expõe um carregador local conhecido. Defina AMARELO_RUNTIME_IMAGE para uma imagem acessível pelo cluster.`
  )
}

function readCommand(command: string, arguments_: string[]): string {
  const result = spawnSync(command, arguments_, {
    cwd: runtimeDirectory,
    encoding: 'utf8'
  })
  if (result.error || result.status !== 0) {
    const detail = result.stderr.trim()
    throw new Error(
      detail || `Falha ao executar ${command} ${arguments_.join(' ')}.`
    )
  }

  const output = result.stdout.trim()
  if (!output) {
    throw new Error(
      `O comando ${command} ${arguments_.join(' ')} não retornou um valor.`
    )
  }
  return output
}

function runtimeNamespaceExists(): boolean {
  const result = spawnSync(
    'kubectl',
    ['get', 'namespace', runtimeNamespace, '--output=name'],
    {
      cwd: runtimeDirectory,
      encoding: 'utf8'
    }
  )
  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        'Não foi possível consultar o namespace amarelo-runtime.'
    )
  }
  return result.stdout.trim() === `namespace/${runtimeNamespace}`
}

async function applyRuntimeEnvironment(): Promise<void> {
  const result = spawnSync(
    'kubectl',
    [
      '--namespace',
      runtimeNamespace,
      'create',
      'secret',
      'generic',
      'amarelo-runtime-environment',
      `--from-env-file=${environmentFile}`,
      '--dry-run=client',
      '--output=yaml'
    ],
    {
      cwd: runtimeDirectory,
      encoding: 'utf8'
    }
  )

  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        'Não foi possível renderizar o Secret local do runtime.'
    )
  }

  await runCommand(
    'kubectl',
    ['apply', '--filename', '-'],
    result.stdout
  )
}

async function ensureLocalEnvironment(): Promise<void> {
  try {
    await access(environmentFile)
    return
  } catch {
    // Generated below with exclusive creation.
  }

  const contents = [
    '# Generated by the Amarelo Kubernetes runtime. Local development only.',
    'POSTGRES_DB=amarelo',
    'POSTGRES_USER=amarelo',
    `POSTGRES_PASSWORD=${randomBytes(32).toString('base64url')}`,
    'POSTGRES_PORT=5432',
    `REDIS_PASSWORD=${randomBytes(32).toString('base64url')}`,
    'REDIS_PORT=6379',
    'LANDING_PORT=3000',
    'CONSOLE_PORT=3001',
    'ONBOARDING_PORT=3002',
    'MOBILE_PORT=3003',
    ''
  ].join('\n')

  try {
    await writeFile(environmentFile, contents, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600
    })
    console.info(
      `[runtime] Credenciais locais criadas em ${environmentFile}.`
    )
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error
    }
  }
}

function isAlreadyExistsError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST'
}

async function runCommand(
  command: string,
  arguments_: string[],
  input?: string
): Promise<void> {
  const child = spawn(command, arguments_, {
    cwd: runtimeDirectory,
    stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit']
  })

  const forwardSignal = (signal: NodeJS.Signals) => {
    if (!child.killed) {
      child.kill(signal)
    }
  }

  process.once('SIGINT', forwardSignal)
  process.once('SIGTERM', forwardSignal)

  if (input !== undefined) {
    child.stdin?.end(input)
  }

  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.once('error', rejectPromise)
    child.once('close', (code, signal) => {
      process.removeListener('SIGINT', forwardSignal)
      process.removeListener('SIGTERM', forwardSignal)

      if (signal) {
        rejectPromise(
          new Error(
            `${command} foi interrompido por ${signal === 'SIGINT' ? 'SIGINT' : 'SIGTERM'}.`
          )
        )
        return
      }
      if (code !== 0) {
        rejectPromise(
          new Error(
            `${command} ${arguments_.join(' ')} falhou com status ${code ?? 1}.`
          )
        )
        return
      }
      resolvePromise()
    })
  })
}

function printUsage(message: string): void {
  console.error(`[runtime] ${message}`)
  console.error(
    'Uso: pnpm --filter @repo/runtime start -- <up|down|logs|ps|config>'
  )
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isDirectExecution) {
  runRuntimeCli()
    .then((exitCode) => {
      process.exitCode = exitCode
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[runtime] ${message}`)
      process.exitCode = 1
    })
}
