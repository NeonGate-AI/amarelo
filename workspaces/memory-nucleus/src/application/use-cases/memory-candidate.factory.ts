import {
  type MemoryCandidate,
  MemoryCandidateSchema
} from '@domain/entities/memory-candidate.entity'
import type { MemoryCurationAuthorizationDecision } from '@application/contracts/memory-curation-authorization.contract'
import { createCandidateFingerprint } from '@application/use-cases/memory-curation.fingerprint'
import type {
  MemoryCurationRequest,
  PreparedMemorySource
} from '@application/contracts/memory-curation.contract'
import type { MemoryExtraction } from '@application/ports/memory-extractor.port'
import type { MemoryTextNormalizerPort } from '@application/ports/memory-text-normalizer.port'

export interface CreateMemoryCandidatesInput {
  authorization: MemoryCurationAuthorizationDecision
  createdAt: Date
  extraction: MemoryExtraction | null
  maxCandidates: number
  request: MemoryCurationRequest
  source: PreparedMemorySource
}

export const createMemoryCandidates = (
  input: CreateMemoryCandidatesInput,
  textNormalizer: MemoryTextNormalizerPort
): MemoryCandidate[] => {
  const sourceTurnIds = new Set(input.source.turns.map((turn) => turn.id))
  const fingerprints = new Set<string>()
  const candidates: MemoryCandidate[] = []

  for (const extracted of (input.extraction?.candidates ?? []).slice(
    0,
    input.maxCandidates
  )) {
    const referencedTurnIds = [...new Set(extracted.sourceTurnIds)]

    if (
      referencedTurnIds.length === 0 ||
      referencedTurnIds.some((turnId) => !sourceTurnIds.has(turnId))
    ) {
      continue
    }

    const normalized = {
      ...extracted,
      occurredAt: extracted.kind === 'episodic' ? extracted.occurredAt : null,
      sourceTurnIds: referencedTurnIds,
      statement: textNormalizer.normalize(extracted.statement),
      tags: [
        ...new Set(
          extracted.tags.map((tag) =>
            textNormalizer.normalize(tag).toLocaleLowerCase('pt-BR')
          )
        )
      ],
      temporalPrecision:
        extracted.kind === 'episodic' ? extracted.temporalPrecision : null,
      temporalReference:
        extracted.kind === 'episodic' && extracted.temporalReference
          ? textNormalizer.normalize(extracted.temporalReference)
          : null,
      uncertainty: extracted.uncertainty
        ? textNormalizer.normalize(extracted.uncertainty)
        : null,
      validFrom: extracted.kind === 'semantic' ? extracted.validFrom : null
    }
    const candidateFingerprint = createCandidateFingerprint(
      input.authorization.tenantId,
      input.source.sourceFingerprint,
      normalized,
      textNormalizer
    )

    if (fingerprints.has(candidateFingerprint)) {
      continue
    }

    const parsedCandidate = MemoryCandidateSchema.safeParse({
      actorId: input.authorization.actorId,
      authorizationDecisionId: input.authorization.id,
      candidateFingerprint,
      confidence: normalized.confidence,
      createdAt: input.createdAt.toISOString(),
      kind: normalized.kind,
      occurredAt: normalized.occurredAt,
      provenance: {
        conversationId: input.request.conversationId,
        sourceFingerprint: input.source.sourceFingerprint,
        sourceTurnIds: normalized.sourceTurnIds
      },
      purpose: input.authorization.purpose,
      sensitivity: 'restricted',
      statement: normalized.statement,
      status: 'candidate',
      subjectId: input.authorization.subjectId,
      tags: normalized.tags,
      temporalPrecision: normalized.temporalPrecision,
      temporalReference: normalized.temporalReference,
      tenantId: input.authorization.tenantId,
      uncertainty: normalized.uncertainty,
      validFrom: normalized.validFrom
    })

    // Compatibility normalization can expand otherwise schema-valid input
    // (for example, one ligature into multiple ASCII characters). Treat that as
    // a rejected candidate instead of letting a provider payload escape the
    // graph's typed result boundary.
    if (!parsedCandidate.success) {
      continue
    }

    fingerprints.add(candidateFingerprint)
    candidates.push(parsedCandidate.data)
  }

  return candidates
}
