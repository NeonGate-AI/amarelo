import {
  MemoryUsageEventSchema,
  type MemoryRequestScope,
  type MemoryUsageEvent,
  type MemoryProviderUsage
} from '@application/contracts'

export interface CreateTextMemoryUsageEventInput {
  readonly scope: MemoryRequestScope
  readonly eventId: string
  readonly attemptId: string
  readonly occurredAt: string
  readonly operation: MemoryUsageEvent['operation']
  readonly workloadVersion: string
  readonly profileVersion: string
  readonly costClass: MemoryUsageEvent['costClass']
  readonly providerUsage?: MemoryProviderUsage | null
  readonly estimatedUsage?: MemoryUsageEvent['estimatedUsage']
  readonly calls?: MemoryUsageEvent['calls']
}

export function createTextMemoryUsageEvent(
  input: CreateTextMemoryUsageEventInput
): MemoryUsageEvent {
  return MemoryUsageEventSchema.parse({
    schemaVersion: 'memory-usage-v1',
    eventId: input.eventId,
    tenantId: input.scope.tenantId,
    subjectId: input.scope.subjectId,
    actorId: input.scope.actorId,
    requestId: input.scope.requestId,
    conversationId: input.scope.conversationId,
    attemptId: input.attemptId,
    occurredAt: input.occurredAt,
    operation: input.operation,
    sourceKind: input.scope.sourceKind,
    workloadVersion: input.workloadVersion,
    profileVersion: input.profileVersion,
    costClass: input.costClass,
    durationBasis: null,
    durations: {
      patientSpeechMilliseconds: null,
      assistantSpeechMilliseconds: null,
      inactivityMilliseconds: null,
      patientSpeechProvenance: 'unavailable',
      assistantSpeechProvenance: 'unavailable',
      inactivityProvenance: 'unavailable',
      measurementVersion: null
    },
    calls: input.calls ?? {
      llm: null,
      web: null,
      fullText: null,
      vector: null
    },
    providerUsage: input.providerUsage ?? null,
    estimatedUsage: input.estimatedUsage ?? null
  })
}
