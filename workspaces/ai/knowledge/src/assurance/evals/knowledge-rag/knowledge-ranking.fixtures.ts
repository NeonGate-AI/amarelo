import type { RepositoryKnowledgeChunk } from '#knowledge'
import { syntheticChunk } from './knowledge.fixtures.ts'

/** Lexical score, then recency, then stable chunk ID determine the order. */
export const RANKING_CORPUS: readonly RepositoryKnowledgeChunk[] = [
  syntheticChunk({
    documentId: 'synthetic-paper-three-token',
    versionId: 'version-1',
    chunkId: 'rank-three-token-old',
    publishedAt: '2026-01-01T00:00:00.000Z',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    text: 'Observatório descreve calibração cuidadosa de pétalas.'
  }),
  syntheticChunk({
    documentId: 'synthetic-paper-two-token-newer',
    versionId: 'version-1',
    chunkId: 'rank-two-token-newer',
    publishedAt: '2026-08-10T00:00:00.000Z',
    effectiveFrom: '2026-08-10T00:00:00.000Z',
    text: 'Calibração recente de pétalas.'
  }),
  syntheticChunk({
    documentId: 'synthetic-paper-two-token-older-b',
    versionId: 'version-1',
    chunkId: 'rank-two-token-older-b',
    publishedAt: '2026-07-01T00:00:00.000Z',
    effectiveFrom: '2026-07-01T00:00:00.000Z',
    text: 'Calibração anterior de pétalas.'
  }),
  syntheticChunk({
    documentId: 'synthetic-paper-two-token-older-a',
    versionId: 'version-1',
    chunkId: 'rank-two-token-older-a',
    publishedAt: '2026-07-01T00:00:00.000Z',
    effectiveFrom: '2026-07-01T00:00:00.000Z',
    text: 'Calibração anterior de pétalas.'
  }),
  syntheticChunk({
    documentId: 'synthetic-paper-distractor',
    versionId: 'version-1',
    chunkId: 'rank-zero-overlap',
    publishedAt: '2026-08-19T00:00:00.000Z',
    effectiveFrom: '2026-08-19T00:00:00.000Z',
    text: 'Catálogo fictício de luas azuis.'
  })
]
