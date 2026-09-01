import { InMemoryMemoryAuthorizationResolver } from '#infrastructure/adapters/testing/in-memory-memory-authorization.adapter'
import { InMemoryScopedMemoryRepository } from '#infrastructure/adapters/testing/in-memory-memory.repository.adapter'
import type {
  AuthorizedMemoryRetrievalDependencies,
  MemoryAuthorizationDecision
} from '#application/ports/memory-authorization.port'
import type { RepositoryMemoryRecord } from '#application/ports/memory-repository.port'
import type {
  AuthorizedMemoryQuery,
  AuthorizedMemoryRetrievalResult,
  MemoryAuthorType,
  MemoryLifecycle,
  MemoryProvenance
} from '#application/contracts/memory-retrieval.contract'
import type {
  MemoryKind,
  MemoryTemporalPrecision
} from '#domain/entities/memory-candidate.entity'

export const TENANT_ID = 'tenant-atlas'
export const SUBJECT_ID = 'subject-lumen'
export const PURPOSE = 'conversation-continuity'
export const VIEW_ID = 'view-ana'
export const AUTHORIZATION_DECISION_ID = 'synthetic-authorization-decision-1'
export const TRACE_ID = 'synthetic-memory-trace-1'
export const FIXED_RETRIEVAL_NOW = new Date('2026-08-30T12:00:00.000Z')

export const silentMemoryRetrievalObserver = Object.freeze({
  record() {}
})

const DEFAULT_OBSERVED_AT = '2026-08-20T12:00:00.000Z'

export function syntheticMemoryProvenance(id: string): MemoryProvenance {
  return {
    sourceArtifactIds: [`synthetic-source-${id}`],
    authorId: SUBJECT_ID,
    authorType: 'subject',
    createdAt: '2026-08-20T12:05:00.000Z'
  }
}

interface SyntheticMemoryRecordInput {
  readonly id: string
  readonly kind: MemoryKind
  readonly category: string
  readonly text: string
  readonly tenantId?: string
  readonly subjectId?: string
  readonly purposes?: readonly string[]
  readonly viewIds?: readonly string[]
  readonly lifecycle?: MemoryLifecycle
  readonly observedAt?: string
  readonly provenance?: MemoryProvenance | null
  readonly supersededById?: string | null
  readonly semanticKey?: string | null
  readonly occurredAt?: string | null
  readonly temporalPrecision?: MemoryTemporalPrecision
  readonly temporalReference?: string | null
  readonly validFrom?: string | null
  readonly validUntil?: string | null
}

export function syntheticMemoryRecord(
  input: SyntheticMemoryRecordInput
): RepositoryMemoryRecord {
  const common = {
    tenantId: TENANT_ID,
    subjectId: SUBJECT_ID,
    purposes: [PURPOSE],
    viewIds: [VIEW_ID],
    lifecycle: 'accepted',
    observedAt: DEFAULT_OBSERVED_AT,
    provenance: syntheticMemoryProvenance(input.id),
    ...input
  }

  if (input.kind === 'semantic') {
    return {
      ...common,
      kind: 'semantic',
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null
    } as RepositoryMemoryRecord
  }

  const hasInexactReference =
    input.temporalReference !== undefined && input.temporalReference !== null

  return {
    ...common,
    kind: 'episodic',
    occurredAt: hasInexactReference
      ? (input.occurredAt ?? null)
      : (input.occurredAt ?? input.observedAt ?? DEFAULT_OBSERVED_AT),
    temporalPrecision:
      input.temporalPrecision ??
      (hasInexactReference ? 'approximate' : 'exact'),
    temporalReference: input.temporalReference ?? null
  } as RepositoryMemoryRecord
}

export function syntheticDirectReportMemoryRecord(
  input: SyntheticMemoryRecordInput
): RepositoryMemoryRecord {
  return syntheticMemoryRecord({
    ...input,
    provenance: input.provenance ?? {
      ...syntheticMemoryProvenance(input.id),
      authorType: 'authorized-delegate' satisfies MemoryAuthorType
    }
  })
}

export function authorizedMemoryQuery(
  overrides: Partial<AuthorizedMemoryQuery> = {}
): AuthorizedMemoryQuery {
  return {
    authorizationDecisionId: AUTHORIZATION_DECISION_ID,
    traceId: TRACE_ID,
    tenantId: TENANT_ID,
    subjectId: SUBJECT_ID,
    purpose: PURPOSE,
    viewId: VIEW_ID,
    kinds: ['semantic', 'episodic'],
    categories: [
      'preference',
      'activity',
      'collection',
      'catalog',
      'safety-fixture'
    ],
    timeWindow: {
      fromInclusive: null,
      toExclusive: null
    },
    budgets: {
      maxTokens: 600,
      maxSemanticItems: 8,
      maxEpisodicItems: 3
    },
    queryText: 'synthetic authorization query',
    semanticKeys: [],
    vectorFallback: false,
    ...overrides
  }
}

export function syntheticMemoryAuthorizationDecision(
  overrides: Partial<MemoryAuthorizationDecision> = {}
): MemoryAuthorizationDecision {
  return {
    id: AUTHORIZATION_DECISION_ID,
    status: 'active',
    expiresAt: '2026-09-30T12:00:00.000Z',
    tenantId: TENANT_ID,
    subjectId: SUBJECT_ID,
    purpose: PURPOSE,
    viewId: VIEW_ID,
    kinds: ['semantic', 'episodic'],
    sensitivities: ['normal', 'sensitive', 'highly-sensitive'],
    categories: [
      'preference',
      'activity',
      'collection',
      'catalog',
      'safety-fixture'
    ],
    timeWindow: {
      fromInclusive: null,
      toExclusive: null
    },
    ...overrides
  }
}

export function memoryRetrievalDependencies(
  repository: AuthorizedMemoryRetrievalDependencies['repository'],
  decisions: readonly MemoryAuthorizationDecision[] = [
    syntheticMemoryAuthorizationDecision()
  ]
): AuthorizedMemoryRetrievalDependencies {
  let monotonicMilliseconds = 100

  return {
    authorizationResolver: new InMemoryMemoryAuthorizationResolver(decisions),
    monotonicClock: () => {
      const current = monotonicMilliseconds
      monotonicMilliseconds += 7
      return current
    },
    observer: silentMemoryRetrievalObserver,
    repository,
    now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
  }
}

export function createMemoryRetrievalScenario(
  records: readonly RepositoryMemoryRecord[],
  decisions?: readonly MemoryAuthorizationDecision[]
) {
  const repository = new InMemoryScopedMemoryRepository(records)
  const dependencies = memoryRetrievalDependencies(repository, decisions)

  return {
    authorizationResolver: dependencies.authorizationResolver,
    dependencies,
    repository
  }
}

export function memoryResultIds(
  result: AuthorizedMemoryRetrievalResult
): string[] {
  return result.items.map((item) => item.id)
}
