import { z } from 'zod'

import {
  MemoryCurationIdentifierSchema,
  type PurposeCode,
  PurposeCodeSchema
} from './memory-curation.contract'

export const MemoryCurationAuthorizationDecisionStatusSchema = z.enum([
  'active',
  'revoked'
])
export type MemoryCurationAuthorizationDecisionStatus = z.infer<
  typeof MemoryCurationAuthorizationDecisionStatusSchema
>

/**
 * Deterministic candidate-proposal policy result persisted outside model
 * control. The referenced decision is validated again by the curation use
 * case before source preparation, persistence access, or model use.
 */
export interface MemoryCurationAuthorizationDecision {
  readonly actorId: string
  readonly expiresAt: string
  readonly id: string
  readonly permitsCandidateProposal: boolean
  readonly purpose: PurposeCode
  readonly status: MemoryCurationAuthorizationDecisionStatus
  readonly subjectId: string
  readonly tenantId: string
}

export const MemoryCurationAuthorizationDecisionSchema: z.ZodType<MemoryCurationAuthorizationDecision> =
  z
    .object({
      actorId: MemoryCurationIdentifierSchema,
      expiresAt: z.string().datetime({ offset: true }),
      id: MemoryCurationIdentifierSchema,
      permitsCandidateProposal: z.boolean(),
      purpose: PurposeCodeSchema,
      status: MemoryCurationAuthorizationDecisionStatusSchema,
      subjectId: MemoryCurationIdentifierSchema,
      tenantId: MemoryCurationIdentifierSchema
    })
    .strict()

/** Offline or production port for loading a policy decision by opaque ID. */
export interface MemoryCurationAuthorizationDecisionResolver {
  resolve(
    authorizationDecisionId: string
  ): Promise<MemoryCurationAuthorizationDecision | null>
}

export interface ResolvedMemoryCurationAuthorization {
  readonly decision: MemoryCurationAuthorizationDecision
  readonly resolvedAt: string
}
