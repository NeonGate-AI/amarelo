import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const projectRoot = resolve(import.meta.dirname, '../../../../../..')
const schemaFile = resolve(
  projectRoot,
  'workspaces/memory-nucleus/src/infrastructure/database/schema.sql'
)
const adversarialFile = resolve(
  projectRoot,
  'workspaces/memory-nucleus/src/infrastructure/database/tests/postgres-adversarial.sql'
)
const postgresDatabase = 'amarelo_memory_validation'
const postgresPassword = 'local-validation-only'
const postgresUser = 'amarelo'
const containerName = `amarelo-memory-validation-${process.pid}`

function docker(arguments_: string[], input?: string): void {
  const result = spawnSync('docker', arguments_, {
    cwd: projectRoot,
    encoding: 'utf8',
    input,
    stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit'
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`docker ${arguments_.join(' ')} failed`)
  }
}

function dockerSucceeds(arguments_: string[]): boolean {
  const result = spawnSync('docker', arguments_, {
    cwd: projectRoot,
    stdio: 'ignore'
  })
  return !result.error && result.status === 0
}

function waitForPostgres(): void {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (
      dockerSucceeds([
        'exec',
        containerName,
        'pg_isready',
        '--username',
        postgresUser,
        '--dbname',
        postgresDatabase,
        '--host',
        '127.0.0.1'
      ])
    ) {
      return
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
  }
  throw new Error('PostgreSQL validation container did not become ready')
}

function removeValidationContainer(): void {
  spawnSync('docker', ['rm', '--force', containerName], {
    cwd: projectRoot,
    stdio: 'ignore'
  })
}

export function runPostgresMemoryEval(): void {
  let containerStarted = false
  try {
    docker([
      'run',
      '--detach',
      '--rm',
      '--name',
      containerName,
      '--env',
      `POSTGRES_DB=${postgresDatabase}`,
      '--env',
      `POSTGRES_PASSWORD=${postgresPassword}`,
      '--env',
      `POSTGRES_USER=${postgresUser}`,
      'postgres:17-alpine'
    ])
    containerStarted = true
    waitForPostgres()

    const sql = [
      readFileSync(schemaFile, 'utf8'),
      readFileSync(adversarialFile, 'utf8')
    ].join('\n')
    docker(
      [
        'exec',
        '--interactive',
        containerName,
        'psql',
        '--set',
        'ON_ERROR_STOP=1',
        '--username',
        postgresUser,
        '--dbname',
        postgresDatabase
      ],
      sql
    )
    console.log('Memory Nucleus PostgreSQL validation PASS')
  } finally {
    if (containerStarted) {
      removeValidationContainer()
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runPostgresMemoryEval()
}
