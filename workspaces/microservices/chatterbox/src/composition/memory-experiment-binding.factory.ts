import { randomUUID } from 'node:crypto'

import {
  ConversationRuntime,
  ConversationTurnInputSchema,
  MemoryExperimentAgent,
  MemoryExperimentController,
  routeConversationTurn,
  type ConversationAgentPort,
  type MemoryExperimentRequest
} from '@ai/conversation'

import type { ChatterboxFactoryOptions } from '../app'
import type { ChatterboxEnvironment } from '../configuration'
import { createObservationStreamWriter } from '../observability'
import type { AuthenticatedConversationContext } from '../session'
import { createMemoryComparisonVersions } from './memory-comparison-versions.factory'
import { MemoryExperimentEvidenceAdapter } from './memory-experiment-evidence.adapter'
import { createMemoryRequestScope } from './request-memory-scope.factory'

/** One process owns admission/rollback state; every personal client remains request-bound. */
export function createMemoryExperimentBinding(
  configuration: ChatterboxEnvironment,
  dependencies: {
    readonly createAgent: (
      context: AuthenticatedConversationContext
    ) => ConversationAgentPort
    readonly baseline: Pick<ConversationRuntime, 'execute'>
    readonly createMemoryClient: ChatterboxFactoryOptions['createMemoryClient']
  }
): NonNullable<ChatterboxFactoryOptions['createRuntime']> {
  const versions = createMemoryComparisonVersions(configuration)
  const subjects = new Set(configuration.CHATTERBOX_MEMORY_INTERNAL_SUBJECT_IDS)
  const evidence = new MemoryExperimentEvidenceAdapter(configuration)
  const writeLine = createObservationStreamWriter(process.stdout)
  const controller = new MemoryExperimentController({
    readPolicy: () => evidence.readPolicy(),
    readEvidence: () => evidence.readEvidence(),
    verifyEvidence: (artifact) => evidence.verifyEvidence(artifact),
    record: (report) =>
      writeLine(
        `${JSON.stringify({ name: 'chatterbox.memory-experiment', ...report })}\n`
      )
  })
  return (context) => ({
    execute(rawInput) {
      if (
        !configuration.CHATTERBOX_MEMORY_EXPERIMENT_ENABLED ||
        versions === null ||
        dependencies.createMemoryClient === undefined
      )
        return dependencies.baseline.execute(rawInput)
      let agent: ConversationAgentPort
      try {
        const scope = createMemoryRequestScope(context)
        if (!subjects.has(scope.subjectId))
          return dependencies.baseline.execute(rawInput)
        const input = ConversationTurnInputSchema.parse(rawInput)
        const reportId = randomUUID()
        const requestContext = Object.freeze({
          ...context,
          requestId: reportId
        })
        const request: MemoryExperimentRequest = {
          reportId,
          subjectKey: scope.subjectId,
          audience: 'internal',
          memory: dependencies.createMemoryClient(requestContext),
          query: {
            asOf: context.asOf,
            purpose: context.purpose,
            query: input.message,
            tokenBudget: routeConversationTurn(input.message).budget
              .memoryTokens
          },
          expectedViewId: 'personal',
          versions
        }
        const metrics = evidence.readMetrics()
        if (metrics !== undefined) controller.observeMetrics(metrics, request)
        agent = new MemoryExperimentAgent(
          dependencies.createAgent(requestContext),
          controller,
          request
        )
      } catch {
        return dependencies.baseline.execute(rawInput)
      }
      return new ConversationRuntime({ agents: [agent] }).execute(rawInput)
    }
  })
}
