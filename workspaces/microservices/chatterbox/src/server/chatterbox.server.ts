import { pathToFileURL } from 'node:url'

import { createProviderChatterbox } from '../composition'
import { validateChatterboxEnvironment } from '../configuration'

export async function startChatterbox(
  environment: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const configuration = validateChatterboxEnvironment(environment)
  const app = createProviderChatterbox(configuration)
  let closing = false

  const close = async () => {
    if (closing) return
    closing = true
    await app.close()
  }

  process.once('SIGINT', () => void close())
  process.once('SIGTERM', () => void close())

  await app.listen({
    host: configuration.CHATTERBOX_HOST,
    port: configuration.CHATTERBOX_PORT
  })
}

const entryPath = process.argv[1]
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  startChatterbox().catch(() => {
    console.error('Chatterbox failed to start.')
    process.exitCode = 1
  })
}
