import {
  type MemoryCurationAuthorizationDecision,
  type MemoryCurationAuthorizationDecisionResolver,
  MemoryCurationAuthorizationDecisionSchema,
  type ResolvedMemoryCurationAuthorization
} from '@application/contracts'
import type { MemoryCurationRequest } from '@application/contracts'

export type MemoryCurationAuthorizationFailure =
  | 'expired-decision'
  | 'invalid-clock'
  | 'invalid-decision'
  | 'not-permitted'
  | 'revoked-decision'
  | 'scope-mismatch'
  | 'unknown-decision'

export class MemoryCurationAuthorizationError extends Error {
  constructor(
    readonly reason: MemoryCurationAuthorizationFailure,
    message: string
  ) {
    super(message)
    this.name = 'MemoryCurationAuthorizationError'
  }
}

const snapshotDecision = (
  decision: MemoryCurationAuthorizationDecision
): MemoryCurationAuthorizationDecision => Object.freeze({ ...decision })

/** Resolve and validate authorization before preparing private source text. */
export const resolveMemoryCurationAuthorization = async (
  request: MemoryCurationRequest,
  resolver: MemoryCurationAuthorizationDecisionResolver,
  clock: () => Date
): Promise<ResolvedMemoryCurationAuthorization> => {
  const decision = await resolver.resolve(request.authorization.decisionId)

  if (decision === null) {
    throw new MemoryCurationAuthorizationError(
      'unknown-decision',
      'memory curation authorization decision is unavailable'
    )
  }

  const parsedDecision =
    MemoryCurationAuthorizationDecisionSchema.safeParse(decision)

  if (!parsedDecision.success) {
    throw new MemoryCurationAuthorizationError(
      'invalid-decision',
      'memory curation authorization decision is malformed'
    )
  }

  const validatedDecision = parsedDecision.data

  if (validatedDecision.status === 'revoked') {
    throw new MemoryCurationAuthorizationError(
      'revoked-decision',
      'memory curation authorization decision is revoked'
    )
  }

  const now = clock()

  const nowEpoch = now.getTime()

  if (!Number.isFinite(nowEpoch)) {
    throw new MemoryCurationAuthorizationError(
      'invalid-clock',
      'memory curation authorization clock returned an invalid instant'
    )
  }

  const expiresAtEpoch = Date.parse(validatedDecision.expiresAt)

  if (!Number.isFinite(expiresAtEpoch)) {
    throw new MemoryCurationAuthorizationError(
      'invalid-decision',
      'memory curation authorization decision has an invalid expiry'
    )
  }

  if (expiresAtEpoch <= nowEpoch) {
    throw new MemoryCurationAuthorizationError(
      'expired-decision',
      'memory curation authorization decision is expired'
    )
  }

  if (!validatedDecision.permitsCandidateProposal) {
    throw new MemoryCurationAuthorizationError(
      'not-permitted',
      'memory curation authorization decision does not permit candidate proposal'
    )
  }

  const scopeMatches =
    validatedDecision.id === request.authorization.decisionId &&
    validatedDecision.actorId === request.actorId &&
    validatedDecision.tenantId === request.tenantId &&
    validatedDecision.subjectId === request.subjectId &&
    validatedDecision.purpose === request.purpose

  if (!scopeMatches) {
    throw new MemoryCurationAuthorizationError(
      'scope-mismatch',
      'memory curation authorization decision does not match the requested scope'
    )
  }

  return Object.freeze({
    decision: snapshotDecision(validatedDecision),
    resolvedAt: new Date(nowEpoch).toISOString()
  })
}
