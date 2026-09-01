import type { RepositoryKnowledgeChunk } from './knowledge-repository.contract.ts'
import type { KnowledgeRetrievalQuery } from './knowledge-retrieval.contract.ts'
import { knowledgeChunkRecency } from './knowledge-retrieval.validator.ts'

const STOP_WORDS = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'com',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'para',
  'por',
  'que',
  'um',
  'uma'
])

export interface RankedKnowledgeChunk {
  readonly record: RepositoryKnowledgeChunk
  readonly lexicalScore: number
  readonly recencyEpoch: number
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function knowledgeLexicalTokens(value: string): ReadonlySet<string> {
  const matches = normalizeSearchText(value).match(/[\p{L}\p{N}]+/gu) ?? []

  return new Set(
    matches.filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  )
}

function lexicalOverlapScore(
  queryTokens: ReadonlySet<string>,
  text: string
): number {
  const documentTokens = knowledgeLexicalTokens(text)
  let overlap = 0

  for (const token of queryTokens) {
    if (documentTokens.has(token)) {
      overlap += 1
    }
  }

  return overlap
}

export function compareRankedKnowledgeChunks(
  left: RankedKnowledgeChunk,
  right: RankedKnowledgeChunk
): number {
  if (left.lexicalScore !== right.lexicalScore) {
    return right.lexicalScore - left.lexicalScore
  }

  if (left.recencyEpoch !== right.recencyEpoch) {
    return right.recencyEpoch - left.recencyEpoch
  }

  const leftId = `${left.record.documentId}\u0000${left.record.versionId}\u0000${left.record.chunkId}`
  const rightId = `${right.record.documentId}\u0000${right.record.versionId}\u0000${right.record.chunkId}`

  if (leftId === rightId) {
    return 0
  }

  return leftId < rightId ? -1 : 1
}

export function rankEligibleKnowledgeChunk(
  record: RepositoryKnowledgeChunk,
  query: KnowledgeRetrievalQuery,
  asOfEpoch: number,
  queryTokens: ReadonlySet<string>
): RankedKnowledgeChunk | null {
  const recency = knowledgeChunkRecency(record, query, asOfEpoch)

  if (recency === null) {
    return null
  }

  const lexicalScore = lexicalOverlapScore(queryTokens, record.text)

  if (lexicalScore === 0) {
    return null
  }

  return {
    record: {
      ...record,
      topicIds: Object.freeze([...record.topicIds]),
      purposeCodes: Object.freeze([...record.purposeCodes]),
      jurisdictions: Object.freeze([...record.jurisdictions])
    },
    lexicalScore,
    recencyEpoch: Math.max(recency.publishedAtEpoch, recency.effectiveFromEpoch)
  }
}

export function distinctRankedKnowledgeDocuments(
  rankedChunks: readonly RankedKnowledgeChunk[]
): readonly RankedKnowledgeChunk[] {
  const seenDocumentIds = new Set<string>()

  return rankedChunks.filter(({ record }) => {
    if (seenDocumentIds.has(record.documentId)) {
      return false
    }

    seenDocumentIds.add(record.documentId)
    return true
  })
}
