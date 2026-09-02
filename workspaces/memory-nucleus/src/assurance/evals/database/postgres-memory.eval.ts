import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const projectRoot = resolve(import.meta.dirname, '../../../../../..')
const composeFile = resolve(
  projectRoot,
  'workspaces/packages/runtime/compose.yaml'
)
const schemaFile = resolve(
  projectRoot,
  'workspaces/memory-nucleus/src/infrastructure/database/schema.sql'
)
const adversarialFile = resolve(
  projectRoot,
  'workspaces/memory-nucleus/src/infrastructure/database/tests/postgres-adversarial.sql'
)
const environment = {
  ...process.env,
  COMPOSE_PROJECT_NAME: 'amarelo-memory-validation',
  POSTGRES_DB: 'amarelo_memory_validation',
  POSTGRES_PASSWORD: 'local-validation-only',
  POSTGRES_PORT: '55432',
  POSTGRES_USER: 'amarelo',
  REDIS_PASSWORD: 'not-used-by-memory-validation'
}

function compose(arguments_: string[], input?: string): void {
  const result = spawnSync(
    'docker',
    ['compose', '--file', composeFile, ...arguments_],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      env: environment,
      input,
      stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit'
    }
  )

  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`docker compose ${arguments_.join(' ')} failed`)
}

export function runPostgresMemoryEval(): void {
  try {
    compose(['up', '--detach', '--wait', 'postgres'])
    const sql = [
      readFileSync(schemaFile, 'utf8'),
      readFileSync(adversarialFile, 'utf8')
    ].join('\n')
    compose(
      [
        'exec',
        '--no-TTY',
        'postgres',
        'psql',
        '--set',
        'ON_ERROR_STOP=1',
        '--username',
        environment.POSTGRES_USER,
        '--dbname',
        environment.POSTGRES_DB
      ],
      sql
    )
    console.log('Memory Nucleus PostgreSQL validation PASS')
  } finally {
    compose(['down', '--volumes', '--remove-orphans'])
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runPostgresMemoryEval()
}
