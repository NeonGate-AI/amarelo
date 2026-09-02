import type { ScopedMemoryRepository } from '@application/ports/memory-repository.port'
import type { MemoryRetrievalObserver } from '@application/ports/memory-retrieval-observer.port'
import type {
  AuthorizedMemoryQuery,
  MemoryKind,
  MemoryTimeWindow
} from '@application/contracts/memory-retrieval.contract'

export type MemoryAuthorizationDecisionStatus = 'active' | 'revoked'
export type MemorySensitivity = 'normal' | 'sensitive' | 'highly-sensitive'

/**
 * Deterministic policy result persisted outside model control. Kinds,
 * categories, and the time window are maximum grants: a query may narrow them
 * but may never widen them.
 */
export interface MemoryAuthorizationDecision {
  readonly id: string
  readonly status: MemoryAuthorizationDecisionStatus
  readonly expiresAt: string
  readonly tenantId: string
  readonly subjectId: string
  readonly purpose: string
  readonly viewId: string
  readonly kinds: readonly MemoryKind[]
  readonly categories: readonly string[]
  readonly sensitivities: readonly MemorySensitivity[]
  readonly timeWindow: MemoryTimeWindow
}

/**
 * Port for loading a policy decision by opaque ID. Returning a record does not
 * authorize retrieval; the use case independently validates status, expiry,
 * identity, and scope before repository access.
 */
export abstract class MemoryAuthorizationDecisionResolver {
  abstract resolve(
    authorizationDecisionId: string
  ): Promise<MemoryAuthorizationDecision | null>
}

export interface AuthorizedMemoryRetrievalDependencies {
  readonly authorizationResolver: MemoryAuthorizationDecisionResolver
  readonly monotonicClock?: () => number
  readonly observer: MemoryRetrievalObserver
  readonly observerTimeoutMilliseconds?: number
  readonly repository: ScopedMemoryRepository
  readonly now?: () => Date
}

export interface ResolvedMemoryAuthorization {
  readonly decision: MemoryAuthorizationDecision
  readonly query: AuthorizedMemoryQuery
}
