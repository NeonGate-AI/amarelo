import type { RepositoryMemoryRecord } from '@application/ports'
import { syntheticDirectReportMemoryRecord } from './memory-retrieval.fixtures.ts'

/** Exact key outranks lexical results; application recency breaks lexical ties. */
export const RANKING_CORPUS: readonly RepositoryMemoryRecord[] = [
  syntheticDirectReportMemoryRecord({
    id: 'rank-exact-older',
    kind: 'semantic',
    category: 'collection',
    semanticKey: 'collection.favorite-format',
    text: 'Chave semântica estável.',
    validFrom: '2026-01-01T00:00:00.000Z'
  }),
  syntheticDirectReportMemoryRecord({
    id: 'rank-lexical-newer',
    kind: 'semantic',
    category: 'collection',
    semanticKey: 'collection.newer',
    text: 'Coleção cartões estrela recente.',
    validFrom: '2026-08-25T00:00:00.000Z'
  }),
  syntheticDirectReportMemoryRecord({
    id: 'rank-lexical-older',
    kind: 'semantic',
    category: 'collection',
    semanticKey: 'collection.older',
    text: 'Coleção cartões estrela anterior.',
    validFrom: '2026-08-05T00:00:00.000Z'
  })
]
