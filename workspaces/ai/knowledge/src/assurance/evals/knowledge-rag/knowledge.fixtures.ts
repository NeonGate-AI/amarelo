import type {
  KnowledgeRetrievalQuery,
  RepositoryKnowledgeChunk
} from '@knowledge'

export const PURPOSE_CODE = 'synthetic-evidence-brief'
export const OTHER_PURPOSE_CODE = 'synthetic-export-preview'
export const CORPUS_VERSION = 'synthetic-corpus-2026-08-20-v1'
export const OTHER_CORPUS_VERSION = 'synthetic-corpus-2026-08-20-v2'
export const TOPIC_ID = 'synthetic-optics-calibration'
export const OTHER_TOPIC_ID = 'synthetic-lunar-catalog'
export const JURISDICTION = 'ZZ-LUMEN'
export const OTHER_JURISDICTION = 'ZZ-ORBIT'
export const AS_OF = '2026-08-20T12:00:00.000Z'

const SYNTHETIC_SHA_256 = '0123456789abcdef'.repeat(4)

export function syntheticChunk(
  input: Pick<
    RepositoryKnowledgeChunk,
    'documentId' | 'versionId' | 'chunkId' | 'text'
  > &
    Partial<RepositoryKnowledgeChunk>
): RepositoryKnowledgeChunk {
  return {
    corpusVersion: CORPUS_VERSION,
    topicIds: [TOPIC_ID],
    purposeCodes: [PURPOSE_CODE],
    jurisdictions: [JURISDICTION],
    publisher: 'Arquivo Aurora',
    canonicalUrl: `https://knowledge.example.invalid/${input.documentId}/${input.versionId}`,
    citation: `[SINTÉTICA] ${input.documentId}, ${input.versionId}.`,
    sourceType: 'scientific',
    publishedAt: '2026-02-01T00:00:00.000Z',
    effectiveFrom: '2026-02-01T00:00:00.000Z',
    effectiveToExclusive: null,
    contentHash: SYNTHETIC_SHA_256,
    verificationStatus: 'verified',
    retractedAt: null,
    supersededBy: null,
    ...input
  }
}

export function knowledgeQuery(
  overrides: Partial<KnowledgeRetrievalQuery> = {}
): KnowledgeRetrievalQuery {
  return {
    corpusVersion: CORPUS_VERSION,
    topicIds: [TOPIC_ID],
    purposeCode: PURPOSE_CODE,
    jurisdiction: JURISDICTION,
    asOf: AS_OF,
    sourceTypes: ['scientific', 'regulatory'],
    queryText: 'observatório calibração pétalas',
    maxDocs: 8,
    maxTokens: 600,
    vectorFallback: false,
    ...overrides
  }
}
