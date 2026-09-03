import { pathToFileURL } from 'node:url'

import { createProviderConversationApi } from '../composition'
import { validateConversationApiEnvironment } from '../configuration'

export async function startConversationApi(
  environment: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const configuration = validateConversationApiEnvironment(environment)
  const app = createProviderConversationApi(configuration)
  let closing = false

  const close = async () => {
    if (closing) return
    closing = true
    await app.close()
  }

  process.once('SIGINT', () => void close())
  process.once('SIGTERM', () => void close())

  await app.listen({
    host: configuration.CONVERSATION_API_HOST,
    port: configuration.PORT
  })
}

const entryPath = process.argv[1]
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  startConversationApi().catch(() => {
    console.error('Conversation API failed to start.')
    process.exitCode = 1
  })
}
