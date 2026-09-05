import { createHash } from 'node:crypto'
import type { ExplicitMemoryInput } from '@repo/memory-sdk'

export interface MemoryIntegrityFixtureRecord {
  readonly fixtureId: string
  readonly input: ExplicitMemoryInput
  readonly poison: 'assistant' | 'delegate' | null
}

export interface MemoryIntegrityCorpus {
  readonly version: string
  readonly partition: 'development' | 'holdout'
  /** A holdout must be supplied independently; the built-in corpus never claims this. */
  readonly independentHoldout: boolean
  readonly records: readonly MemoryIntegrityFixtureRecord[]
  readonly queries: readonly {
    readonly queryId: string
    readonly text: string
    readonly criticalFixtureIds: readonly string[]
  }[]
}

export function createMemoryIntegrityDevelopmentCorpus(): MemoryIntegrityCorpus {
  const records: MemoryIntegrityFixtureRecord[] = Array.from({ length: 98 }, (_, index) => ({
    fixtureId: index === 0 ? 'walk' : `collection-${index}`,
    poison: null,
    input: {
      kind: 'semantic', category: 'preference', purpose: 'conversation.support',
      semanticKey: index === 0 ? 'routine.walk' : `collection.item-${index}`,
      statement: index === 0 ? 'Costumo caminhar cedo.' : `No registro sintético ${index}, prefiro catalogar selos da coleção.`,
      validFrom: null
    }
  }))
  records.push(
    { fixtureId: 'false-assistant', poison: 'assistant', input: {
      kind: 'semantic', category: 'preference', purpose: 'conversation.support', semanticKey: 'false.walk-assistant',
      statement: 'Caminhar pela manhã no parque é uma atividade que nunca faço.', validFrom: null
    } },
    { fixtureId: 'false-delegate', poison: 'delegate', input: {
      kind: 'semantic', category: 'preference', purpose: 'conversation.support', semanticKey: 'false.walk-delegate',
      statement: 'Minha preferência é evitar caminhar pela manhã no parque.', validFrom: null
    } }
  )
  return {
    version: 'memory-integrity-development-v1', partition: 'development', independentHoldout: false,
    records,
    queries: [
      { queryId: 'walk-morning', text: 'caminhar manhã parque', criticalFixtureIds: ['walk'] },
      { queryId: 'walk-preference', text: 'preferência caminhar manhã parque', criticalFixtureIds: ['walk'] }
    ]
  }
}

export function memoryIntegrityCorpusDigest(corpus: MemoryIntegrityCorpus): string {
  return createHash('sha256').update(JSON.stringify(corpus)).digest('hex')
}
