import { createHash } from 'node:crypto'

import { ANA_SYSTEM_PROMPT } from '@ai/ana'
import {
  CONVERSATION_ROUTING_POLICY_VERSION,
  MemoryPairVersionsSchema,
  type MemoryPairVersions
} from '@ai/conversation'

import type { ChatterboxEnvironment } from '../configuration'

/** Pair actual serving configuration with explicit server-owned workload metadata. */
export function createMemoryComparisonVersions(
  configuration: ChatterboxEnvironment
): MemoryPairVersions | null {
  if (
    configuration.CHATTERBOX_MEMORY_COMPARISON_METADATA_JSON === undefined ||
    configuration.AI_CONVERSATION_MODEL === undefined
  )
    return null
  try {
    const metadata = MemoryPairVersionsSchema.omit({
      modelId: true,
      providerId: true,
      configurationVersion: true,
      routeVersion: true,
      instructionVersion: true
    }).parse(
      JSON.parse(configuration.CHATTERBOX_MEMORY_COMPARISON_METADATA_JSON)
    )
    return MemoryPairVersionsSchema.parse({
      ...metadata,
      modelId: configuration.AI_CONVERSATION_MODEL,
      providerId: 'openai',
      configurationVersion: createHash('sha256')
        .update(
          JSON.stringify({
            version: 'chatterbox-provider-comparison-v1',
            modelId: configuration.AI_CONVERSATION_MODEL,
            temperature: 0,
            maxRetries: 0,
            timeoutMs: configuration.CHATTERBOX_MODEL_TIMEOUT_MS,
            recentBufferTokens:
              configuration.CHATTERBOX_MEMORY_RECENT_BUFFER_TOKENS
          })
        )
        .digest('hex'),
      routeVersion: CONVERSATION_ROUTING_POLICY_VERSION,
      instructionVersion: ANA_SYSTEM_PROMPT.version
    })
  } catch {
    return null
  }
}
