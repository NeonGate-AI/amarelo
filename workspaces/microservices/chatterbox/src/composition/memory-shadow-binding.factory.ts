import { randomUUID } from 'node:crypto'

import {
  ConversationRuntime,
  ConversationTurnInputSchema,
  MemoryShadowAgent,
  MemoryShadowExecutor,
  routeConversationTurn,
  type ConversationAgentPort
} from '@ai/conversation'

import type { ChatterboxFactoryOptions } from '../app'
import type { ChatterboxEnvironment } from '../configuration'
import { createObservationStreamWriter } from '../observability'
import { createMemoryComparisonVersions } from './memory-comparison-versions.factory'
import { createMemoryRequestScope } from './request-memory-scope.factory'

/** A process-owned shadow executor never decorates the visible request with Memory. */
export function createMemoryShadowBinding(
  configuration: ChatterboxEnvironment,
  dependencies: {
    readonly agent: ConversationAgentPort
    readonly baseline: Pick<ConversationRuntime, 'execute'>
    readonly createMemoryClient: ChatterboxFactoryOptions['createMemoryClient']
  }
): NonNullable<ChatterboxFactoryOptions['createRuntime']> {
  const versions = createMemoryComparisonVersions(configuration)
  const subjects = new Set(configuration.CHATTERBOX_MEMORY_INTERNAL_SUBJECT_IDS)
  const writeLine = createObservationStreamWriter(process.stdout)
  const executor = new MemoryShadowExecutor({
    enabled:
      configuration.CHATTERBOX_MEMORY_SHADOW_ENABLED && versions !== null,
    maxConcurrent: configuration.CHATTERBOX_MEMORY_SHADOW_MAX_CONCURRENT,
    timeoutMs: configuration.CHATTERBOX_MEMORY_SHADOW_TIMEOUT_MS,
    // The executor owns bounded pending work, including slow log sinks.
    record: (report) =>
      writeLine(
        `${JSON.stringify({ name: 'chatterbox.memory-shadow', ...report })}\n`
      )
  })

  return (context) => ({
    execute(rawInput) {
      if (
        !configuration.CHATTERBOX_MEMORY_SHADOW_ENABLED ||
        versions === null ||
        dependencies.createMemoryClient === undefined
      )
        return dependencies.baseline.execute(rawInput)
      let shadow: ConversationAgentPort
      try {
        const scope = createMemoryRequestScope(context)
        if (!subjects.has(scope.subjectId))
          return dependencies.baseline.execute(rawInput)
        const input = ConversationTurnInputSchema.parse(rawInput)
        const routing = routeConversationTurn(input.message)
        if (routing.budget.memoryTokens === 0)
          return dependencies.baseline.execute(rawInput)
        shadow = new MemoryShadowAgent(dependencies.agent, executor, {
          reportId: randomUUID(),
          audience: 'internal',
          memory: dependencies.createMemoryClient(context),
          query: {
            asOf: context.asOf,
            purpose: context.purpose,
            query: input.message,
            tokenBudget: routing.budget.memoryTokens
          },
          expectedViewId: 'personal',
          versions,
          candidateVersions: versions,
          recentBufferTokens:
            configuration.CHATTERBOX_MEMORY_RECENT_BUFFER_TOKENS
        })
      } catch {
        return dependencies.baseline.execute(rawInput)
      }
      return new ConversationRuntime({ agents: [shadow] }).execute(rawInput)
    }
  })
}
