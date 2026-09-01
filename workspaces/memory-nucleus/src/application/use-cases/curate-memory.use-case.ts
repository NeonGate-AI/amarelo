import { z } from 'zod'

import {
  MEMORY_CANDIDATE_SCHEMA_VERSION,
  MemoryCandidateSchema
} from '#domain/entities/memory-candidate.entity'
import { createMemoryCandidates } from '#application/use-cases/memory-candidate.factory'
import { type MemoryCurationAuthorizationDecisionResolver } from '#application/contracts/memory-curation-authorization.contract'
import {
  MemoryCurationAuthorizationError,
  resolveMemoryCurationAuthorization
} from '#application/use-cases/resolve-curation-authorization'
import {
  type MemoryCurationRequest,
  MemoryCurationRequestSchema,
  type MemoryCurationResult,
  MemoryCurationResultSchema,
  type MemoryCurationUsage
} from '#application/contracts/memory-curation.contract'
import { createCurationIdempotencyKey } from '#application/use-cases/memory-curation.fingerprint'
import {
  DEFAULT_MEMORY_CURATION_POLICY,
  type MemoryCurationPolicy,
  MemoryCurationPolicySchema,
  prepareMemoryCuration
} from '#application/use-cases/memory-formation.policy'
import { createMemoryCurationUsage } from '#application/use-cases/memory-curation.usage'
import {
  MemoryExtractionDeadlineError,
  type MemoryExtractor,
  type MemoryModelUsage,
  MemoryModelUsageSchema
} from '#application/ports/memory-extractor.port'
import { type MemoryPersistenceClient } from '#application/ports/memory-curation-persistence.port'
import { MEMORY_EXTRACTION_INPUT_ESTIMATOR_VERSION } from '#application/contracts/memory-extraction.contract'

const ExtractorIdentitySchema = z
  .object({
    deadlineMilliseconds: z.number().int().min(1).max(120_000),
    modelId: z.string().min(1).max(200),
    promptVersion: z.string().min(1).max(100),
    providerId: z.string().min(1).max(200),
    schemaVersion: z.string().min(1).max(100),
    version: z.string().min(1).max(100)
  })
  .strict()

export interface MemoryCurationDependencies {
  readonly authorizationResolver: MemoryCurationAuthorizationDecisionResolver
  readonly extractor: MemoryExtractor
  readonly persistence: MemoryPersistenceClient
  readonly policy?: MemoryCurationPolicy
  readonly now?: () => Date
}

async function extractWithinDeadline(
  extractor: MemoryExtractor,
  input: Parameters<MemoryExtractor['extract']>[0]
) {
  const controller = new AbortController()
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort()
      reject(new MemoryExtractionDeadlineError())
    }, extractor.deadlineMilliseconds)
  })

  try {
    return await Promise.race([
      Promise.resolve().then(() =>
        extractor.extract(input, { signal: controller.signal })
      ),
      timeout
    ])
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
  }
}

function hasExecutionWindow(
  expiresAt: string,
  now: Date,
  durationMs: number
): boolean {
  return Date.parse(expiresAt) > now.getTime() + durationMs
}

export class CurateMemoryUseCase {
  readonly #policy: MemoryCurationPolicy
  readonly #now: () => Date
  readonly #identity: z.infer<typeof ExtractorIdentitySchema>

  constructor(private readonly dependencies: MemoryCurationDependencies) {
    this.#policy = Object.freeze(
      MemoryCurationPolicySchema.parse(
        dependencies.policy ?? DEFAULT_MEMORY_CURATION_POLICY
      )
    )
    this.#now = dependencies.now ?? (() => new Date())
    this.#identity = Object.freeze(
      ExtractorIdentitySchema.parse({
        deadlineMilliseconds: dependencies.extractor.deadlineMilliseconds,
        modelId: dependencies.extractor.modelId,
        promptVersion: dependencies.extractor.promptVersion,
        providerId: dependencies.extractor.providerId,
        schemaVersion: MEMORY_CANDIDATE_SCHEMA_VERSION,
        version: dependencies.extractor.version
      })
    )
  }

  async execute(
    rawRequest: MemoryCurationRequest
  ): Promise<MemoryCurationResult> {
    const request = MemoryCurationRequestSchema.parse(rawRequest)
    const preparation = prepareMemoryCuration(request, this.#policy)

    const usage = (
      candidateCount: number,
      modelCalls: 0 | 1 = 0,
      modelUsage: MemoryModelUsage | null = null
    ): MemoryCurationUsage =>
      createMemoryCurationUsage({
        candidateCount,
        estimatedInputTokens: preparation.source?.estimatedInputTokens ?? 0,
        fallbackModelId: this.#identity.modelId,
        fallbackProviderId: this.#identity.providerId,
        inputEstimatorVersion:
          preparation.source?.inputEstimatorVersion ??
          MEMORY_EXTRACTION_INPUT_ESTIMATOR_VERSION,
        modelCalls,
        modelUsage
      })

    if (!preparation.decision.eligible || preparation.source === null) {
      const reason = preparation.decision.reason ?? 'no-person-source'
      return MemoryCurationResultSchema.parse({
        candidateIds: [],
        reason,
        retryAt: null,
        runId: null,
        status: reason === 'input-over-budget' ? 'deferred' : 'skipped',
        usage: usage(0)
      })
    }

    let authorization: Awaited<
      ReturnType<typeof resolveMemoryCurationAuthorization>
    >
    try {
      authorization = await resolveMemoryCurationAuthorization(
        request,
        this.dependencies.authorizationResolver,
        this.#now
      )
    } catch (error) {
      if (!(error instanceof MemoryCurationAuthorizationError)) throw error
      if (
        error.reason === 'invalid-clock' ||
        error.reason === 'invalid-decision'
      )
        throw error
      return MemoryCurationResultSchema.parse({
        candidateIds: [],
        reason:
          error.reason === 'expired-decision'
            ? 'authorization-expired'
            : 'authorization-not-permitted',
        retryAt: null,
        runId: null,
        status: 'skipped',
        usage: usage(0)
      })
    }

    const idempotencyKey = createCurationIdempotencyKey({
      extractorVersion: this.#identity.version,
      modelId: this.#identity.modelId,
      policyVersion: this.#policy.version,
      promptVersion: this.#identity.promptVersion,
      providerId: this.#identity.providerId,
      schemaVersion: this.#identity.schemaVersion,
      sourceFingerprint: preparation.source.sourceFingerprint,
      subjectId: request.subjectId,
      tenantId: request.tenantId
    })

    const claim = await this.dependencies.persistence.claimSource({
      actorId: authorization.decision.actorId,
      authorizationDecisionId: authorization.decision.id,
      conversationId: request.conversationId,
      extractorVersion: this.#identity.version,
      idempotencyKey,
      modelId: this.#identity.modelId,
      policyVersion: this.#policy.version,
      promptVersion: this.#identity.promptVersion,
      providerId: this.#identity.providerId,
      purpose: authorization.decision.purpose,
      requestId: request.requestId,
      schemaVersion: this.#identity.schemaVersion,
      sourceFingerprint: preparation.source.sourceFingerprint,
      subjectId: authorization.decision.subjectId,
      tenantId: authorization.decision.tenantId
    })

    if (claim.status === 'duplicate') {
      return MemoryCurationResultSchema.parse({
        candidateIds: [],
        reason: null,
        retryAt: null,
        runId: claim.runId,
        status: 'duplicate',
        usage: usage(0)
      })
    }

    if (claim.status === 'in-progress') {
      return MemoryCurationResultSchema.parse({
        candidateIds: [],
        reason: 'source-in-progress',
        retryAt: claim.claimExpiresAt,
        runId: null,
        status: 'deferred',
        usage: usage(0)
      })
    }

    const now = this.#now()
    if (
      !hasExecutionWindow(
        authorization.decision.expiresAt,
        now,
        this.#identity.deadlineMilliseconds
      )
    ) {
      return MemoryCurationResultSchema.parse({
        candidateIds: [],
        reason: 'authorization-window-too-short',
        retryAt: null,
        runId: null,
        status: 'deferred',
        usage: usage(0)
      })
    }

    if (
      !hasExecutionWindow(
        claim.claimExpiresAt,
        now,
        this.#identity.deadlineMilliseconds
      )
    ) {
      return MemoryCurationResultSchema.parse({
        candidateIds: [],
        reason: 'source-claim-window-too-short',
        retryAt: null,
        runId: null,
        status: 'deferred',
        usage: usage(0)
      })
    }

    let modelUsage: MemoryModelUsage | null = null
    let extraction: Awaited<
      ReturnType<MemoryExtractor['extract']>
    >['extraction']
    try {
      const extracted = await extractWithinDeadline(
        this.dependencies.extractor,
        {
          maxCandidates: this.#policy.maxCandidates,
          purpose: authorization.decision.purpose,
          turns: preparation.source.turns
        }
      )
      const parsedUsage: MemoryModelUsage = MemoryModelUsageSchema.parse(
        extracted.usage
      )
      modelUsage = parsedUsage
      if (
        parsedUsage.modelId !== this.#identity.modelId ||
        parsedUsage.providerId !== this.#identity.providerId
      ) {
        throw new Error(
          'Memory extraction usage identity does not match configured extractor'
        )
      }
      extraction = extracted.extraction
    } catch (error) {
      return MemoryCurationResultSchema.parse({
        candidateIds: [],
        reason:
          error instanceof MemoryExtractionDeadlineError
            ? 'extraction-deadline'
            : 'extraction-failed',
        retryAt: null,
        runId: null,
        status: 'deferred',
        usage: usage(0, 1, modelUsage)
      })
    }

    const candidates = createMemoryCandidates({
      authorization: authorization.decision,
      createdAt: new Date(authorization.resolvedAt),
      extraction,
      maxCandidates: this.#policy.maxCandidates,
      request,
      source: preparation.source
    }).map((candidate) => MemoryCandidateSchema.parse(candidate))

    // Re-resolve authority immediately before durable persistence.
    const currentAuthorization = await resolveMemoryCurationAuthorization(
      request,
      this.dependencies.authorizationResolver,
      this.#now
    )

    const persisted = await this.dependencies.persistence.saveCurationRun({
      actorId: currentAuthorization.decision.actorId,
      authorizationDecisionId: currentAuthorization.decision.id,
      candidates,
      claimId: claim.claimId,
      conversationId: request.conversationId,
      extractorVersion: this.#identity.version,
      idempotencyKey,
      modelId: this.#identity.modelId,
      policyVersion: this.#policy.version,
      promptVersion: this.#identity.promptVersion,
      providerId: this.#identity.providerId,
      purpose: currentAuthorization.decision.purpose,
      requestId: request.requestId,
      schemaVersion: this.#identity.schemaVersion,
      sourceFingerprint: preparation.source.sourceFingerprint,
      subjectId: currentAuthorization.decision.subjectId,
      tenantId: currentAuthorization.decision.tenantId,
      usage: usage(candidates.length, 1, modelUsage)
    })

    if (persisted.status === 'claim-lost') {
      return MemoryCurationResultSchema.parse({
        candidateIds: [],
        reason: 'source-claim-lost',
        retryAt: null,
        runId: null,
        status: 'deferred',
        usage: usage(candidates.length, 1, modelUsage)
      })
    }

    return MemoryCurationResultSchema.parse({
      candidateIds: persisted.candidateIds,
      reason: null,
      retryAt: null,
      runId: persisted.runId,
      status: 'persisted',
      usage: usage(candidates.length, 1, modelUsage)
    })
  }
}

/** Compatibility seam for existing evals; this is no longer a LangGraph dependency. */
export const createMemoryCurationGraph = (
  dependencies: MemoryCurationDependencies
) => {
  const useCase = new CurateMemoryUseCase(dependencies)
  return {
    async invoke(input: { request: MemoryCurationRequest }) {
      return {
        request: input.request,
        result: await useCase.execute(input.request)
      }
    }
  }
}

export type MemoryCurationGraph = ReturnType<typeof createMemoryCurationGraph>
export type MemoryCurationGraphDependencies = MemoryCurationDependencies

export const invokeMemoryCurationGraph = async (
  graph: MemoryCurationGraph,
  request: MemoryCurationRequest
) => graph.invoke({ request })
