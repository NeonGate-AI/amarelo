import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { access, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const runtimeDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = resolve(runtimeDirectory, '../../..')
const kubernetesDirectory = resolve(runtimeDirectory, 'kubernetes')
const namespaceFile = resolve(kubernetesDirectory, 'namespace.yaml')
const dockerfile = resolve(runtimeDirectory, 'Dockerfile.dev')
const cypressDirectory = resolve(runtimeDirectory, 'cypress')
const cypressConfigFile = resolve(cypressDirectory, 'cypress.config.cjs')
const cypressSpecFile = resolve(cypressDirectory, 'e2e/runtime.cy.js')
const cypressJobFile = resolve(kubernetesDirectory, 'cypress-job.yaml')
const cypressConfigMap = 'amarelo-cypress-suite'
const cypressJob = 'amarelo-cypress'
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

const runtimeActions = [
  'up',
  'down',
  'prune',
  'e2e',
  'logs',
  'ps',
  'config'
] as const
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
    case 'prune':
      await runtimePrune()
      return 0
    case 'e2e':
      await runtimeE2e()
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
  await runCommand('kubectl', ['apply', '--kustomize', kubernetesDirectory])

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

  await deleteCypressResources()
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
  await waitForNoRuntimePods()
  console.info(
    '[runtime] Todos os containers foram parados; namespace, configuração e dados do PostgreSQL foram preservados.'
  )
}

async function runtimePrune(): Promise<void> {
  assertKubectlIsAvailable()
  await runCommand('kubectl', [
    'delete',
    'namespace',
    runtimeNamespace,
    '--ignore-not-found=true',
    '--wait=true',
    '--timeout=300s'
  ])
  await rm(environmentFile, { force: true })
  console.info(
    '[runtime] Namespace, workloads, volumes, Secrets e ambiente local foram removidos.'
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

async function runtimeE2e(): Promise<void> {
  await runtimeUp()
  await deleteCypressResources()
  await applyCypressSuite()
  await runCommand('kubectl', ['apply', '--filename', cypressJobFile])

  try {
    await waitForCypressJob()
    await runCommand('kubectl', [
      '--namespace',
      runtimeNamespace,
      'logs',
      `job/${cypressJob}`
    ])
  } catch (error) {
    printCypressLogs()
    throw error
  }

  await deleteCypressResources()
  console.info(
    '[runtime] Cypress headless passou; o runtime base permanece disponível.'
  )
}

async function deleteCypressResources(): Promise<void> {
  await runCommand('kubectl', [
    '--namespace',
    runtimeNamespace,
    'delete',
    `job/${cypressJob}`,
    `configmap/${cypressConfigMap}`,
    '--ignore-not-found=true',
    '--wait=true',
    '--timeout=300s'
  ])
}

async function applyCypressSuite(): Promise<void> {
  const result = spawnSync(
    'kubectl',
    [
      '--namespace',
      runtimeNamespace,
      'create',
      'configmap',
      cypressConfigMap,
      `--from-file=cypress.config.cjs=${cypressConfigFile}`,
      `--from-file=runtime.cy.js=${cypressSpecFile}`,
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
      result.stderr?.trim() ||
        'Não foi possível renderizar a suíte Cypress para o cluster.'
    )
  }

  await runCommand('kubectl', ['apply', '--filename', '-'], result.stdout)
}

async function waitForCypressJob(): Promise<void> {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const status = readOptionalCommand('kubectl', [
      '--namespace',
      runtimeNamespace,
      'get',
      'job',
      cypressJob,
      '--output=jsonpath={.status.succeeded}:{.status.failed}'
    ])
    const [succeeded = '0', failed = '0'] = status.split(':')

    if (Number(succeeded) > 0) {
      return
    }
    if (Number(failed) > 0) {
      throw new Error('O Job Cypress falhou; os recursos foram preservados.')
    }
    await pause(2_000)
  }

  throw new Error(
    'O Job Cypress não terminou em 600 segundos; os recursos foram preservados.'
  )
}

async function waitForNoRuntimePods(): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const pods = readOptionalCommand('kubectl', [
      '--namespace',
      runtimeNamespace,
      'get',
      'pods',
      '--selector',
      'app.kubernetes.io/part-of=amarelo',
      '--field-selector=status.phase!=Succeeded,status.phase!=Failed',
      '--output=name'
    ])
    if (!pods) {
      return
    }
    await pause(2_000)
  }

  throw new Error(
    'Os containers do runtime não terminaram dentro de 300 segundos.'
  )
}

function printCypressLogs(): void {
  const result = spawnSync(
    'kubectl',
    ['--namespace', runtimeNamespace, 'logs', `job/${cypressJob}`],
    {
      cwd: runtimeDirectory,
      stdio: 'inherit'
    }
  )
  if (result.error || result.status !== 0) {
    console.warn(
      '[runtime] Os logs do Job Cypress ainda não estão disponíveis.'
    )
  }
}

async function pause(milliseconds: number): Promise<void> {
  await new Promise<void>((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds)
  })
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
  const output = readOptionalCommand(command, arguments_)
  if (!output) {
    throw new Error(
      `O comando ${command} ${arguments_.join(' ')} não retornou um valor.`
    )
  }
  return output
}

function readOptionalCommand(command: string, arguments_: string[]): string {
  const result = spawnSync(command, arguments_, {
    cwd: runtimeDirectory,
    encoding: 'utf8'
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    const detail = result.stderr?.trim()
    throw new Error(
      detail || `Falha ao executar ${command} ${arguments_.join(' ')}.`
    )
  }
  return result.stdout.trim()
}

function runtimeNamespaceExists(): boolean {
  const result = spawnSync(
    'kubectl',
    [
      'get',
      'namespace',
      runtimeNamespace,
      '--ignore-not-found',
      '--output=name'
    ],
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

  await runCommand('kubectl', ['apply', '--filename', '-'], result.stdout)
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
    console.info(`[runtime] Credenciais locais criadas em ${environmentFile}.`)
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
    'Uso: pnpm --filter @repo/runtime start -- <up|down|prune|e2e|logs|ps|config>'
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
