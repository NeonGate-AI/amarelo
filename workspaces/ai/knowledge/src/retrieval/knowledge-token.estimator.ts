import type { RankedKnowledgeChunk } from './knowledge-retrieval.ranker.ts'

const APPROXIMATE_CHARACTERS_PER_TOKEN = 3
const SERIALIZATION_TOKEN_OVERHEAD = 24

export function estimateKnowledgeChunkTokens(
  ranked: RankedKnowledgeChunk
): number {
  const { record } = ranked
  const serialized = JSON.stringify({
    corpusVersion: record.corpusVersion,
    topicIds: record.topicIds,
    documentId: record.documentId,
    versionId: record.versionId,
    chunkId: record.chunkId,
    purposeCodes: record.purposeCodes,
    jurisdictions: record.jurisdictions,
    publisher: record.publisher,
    canonicalUrl: record.canonicalUrl,
    citation: record.citation,
    sourceType: record.sourceType,
    publishedAt: record.publishedAt,
    effectiveFrom: record.effectiveFrom,
    effectiveToExclusive: record.effectiveToExclusive,
    contentHash: record.contentHash,
    verificationStatus: record.verificationStatus,
    text: record.text,
    lexicalScore: ranked.lexicalScore,
    trust: 'untrusted-knowledge-data'
  })

  return (
    SERIALIZATION_TOKEN_OVERHEAD +
    Math.max(
      1,
      Math.ceil(
        Array.from(serialized).length / APPROXIMATE_CHARACTERS_PER_TOKEN
      )
    )
  )
}
