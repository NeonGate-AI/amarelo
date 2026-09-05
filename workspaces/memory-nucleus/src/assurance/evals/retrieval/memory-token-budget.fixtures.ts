import type { RepositoryMemoryRecord } from '@application/ports'
import { syntheticDirectReportMemoryRecord } from './memory-retrieval.fixtures.ts'

export const TOKEN_BUDGET_CORPUS: readonly RepositoryMemoryRecord[] = [
  syntheticDirectReportMemoryRecord({
    id: 'budget-semantic-one',
    kind: 'semantic',
    category: 'catalog',
    semanticKey: 'catalog.one',
    text: 'Catálogo amarelo contém o cartão lunar um.'
  }),
  syntheticDirectReportMemoryRecord({
    id: 'budget-semantic-two',
    kind: 'semantic',
    category: 'catalog',
    semanticKey: 'catalog.two',
    text: 'Catálogo amarelo contém o cartão lunar dois.'
  }),
  syntheticDirectReportMemoryRecord({
    id: 'budget-episode',
    kind: 'episodic',
    category: 'catalog',
    text: 'Catálogo amarelo recebeu o cartão lunar três.'
  })
]
