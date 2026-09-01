import { createHash } from 'node:crypto'

import type { ExtractedMemoryCandidate } from '#domain/entities/memory-candidate.entity'
import type {
  MemoryCurationRequest,
  PreparedConversationTurn
} from '#application/contracts/memory-curation.contract'
import type { MemoryTextNormalizerPort } from '#application/ports/memory-text-normalizer.port'

const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex')

export const createSourceFingerprint = (
  request: MemoryCurationRequest,
  turns: PreparedConversationTurn[],
  textNormalizer: MemoryTextNormalizerPort
): string =>
  sha256(
    JSON.stringify({
      conversationId: request.conversationId,
      purpose: request.purpose,
      subjectId: request.subjectId,
      tenantId: request.tenantId,
      turns: turns.map((turn) => ({
        id: turn.id,
        observedAt: turn.observedAt,
        text: textNormalizer.normalize(turn.text)
      }))
    })
  )

export const createCandidateFingerprint = (
  tenantId: string,
  sourceFingerprint: string,
  candidate: ExtractedMemoryCandidate,
  textNormalizer: MemoryTextNormalizerPort
): string =>
  sha256(
    JSON.stringify({
      kind: candidate.kind,
      sourceFingerprint,
      tenantId,
      sourceTurnIds: [...new Set(candidate.sourceTurnIds)].sort(),
      statement: textNormalizer
        .normalize(candidate.statement)
        .toLocaleLowerCase('pt-BR')
    })
  )

export const createCurationIdempotencyKey = (input: {
  extractorVersion: string
  modelId: string
  policyVersion: string
  promptVersion: string
  providerId: string
  schemaVersion: string
  sourceFingerprint: string
  subjectId: string
  tenantId: string
}): string =>
  sha256(
    JSON.stringify({
      extractorVersion: input.extractorVersion,
      modelId: input.modelId,
      policyVersion: input.policyVersion,
      promptVersion: input.promptVersion,
      providerId: input.providerId,
      schemaVersion: input.schemaVersion,
      sourceFingerprint: input.sourceFingerprint,
      subjectId: input.subjectId,
      tenantId: input.tenantId
    })
  )
