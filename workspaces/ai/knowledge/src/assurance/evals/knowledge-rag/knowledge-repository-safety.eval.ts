import assert from 'node:assert/strict'

import {
  InMemoryScopedKnowledgeRepository,
  KnowledgeRepositoryScopeError,
  retrieveKnowledge,
  type KnowledgeRetrievalResult,
  type RepositoryKnowledgeChunk,
  type ScopedKnowledgeRepository
} from '#knowledge'
import type { KnowledgeEvalCase } from './knowledge-evaluation.contract.ts'
import {
  EMPTY_REPOSITORY_RESULT,
  FILTER_CORPUS
} from './knowledge-filter.fixtures.ts'
import {
  CORPUS_VERSION,
  knowledgeQuery,
  OTHER_CORPUS_VERSION,
  syntheticChunk
} from './knowledge.fixtures.ts'

function assertOnlyKnowledgeChunkIds(
  result: KnowledgeRetrievalResult,
  expectedIds: readonly string[]
): void {
  assert.deepEqual(
    new Set(result.items.map((item) => item.chunkId)),
    new Set(expectedIds)
  )
}

const evalRepositoryPrefiltersIneligibleEvidence: KnowledgeEvalCase =
  async () => {
    const inner = new InMemoryScopedKnowledgeRepository(FILTER_CORPUS)
    let repositoryReturned: readonly RepositoryKnowledgeChunk[] = []
    const observingRepository: ScopedKnowledgeRepository = {
      async searchScoped(search) {
        const response = await inner.searchScoped(search)
        repositoryReturned = response.records
        return response
      }
    }
    const result = await retrieveKnowledge(
      knowledgeQuery(),
      observingRepository
    )
    const returnedIds = repositoryReturned.map(({ chunkId }) => chunkId)

    assertOnlyKnowledgeChunkIds(result, ['valid-regulatory'])
    assert.deepEqual(
      new Set(returnedIds),
      new Set(['valid-scientific', 'valid-regulatory'])
    )
    for (const forbiddenId of [
      'wrong-corpus-version',
      'wrong-topic',
      'unverified-pending',
      'unverified-rejected',
      'missing-citation',
      'missing-canonical-url',
      'retracted-scientific',
      'retracted-after-as-of',
      'superseded-regulatory',
      'expired-regulatory',
      'published-after-as-of',
      'effective-after-as-of',
      'wrong-purpose',
      'wrong-jurisdiction'
    ]) {
      assert.ok(!returnedIds.includes(forbiddenId), `${forbiddenId} leaked`)
    }

    return {
      name: 'repository prefilter excludes unverifiable and inapplicable evidence'
    }
  }

const evalDefenseInDepthAgainstFaultyRepository: KnowledgeEvalCase =
  async () => {
    const byId = new Map(
      FILTER_CORPUS.map((record) => [record.chunkId, record])
    )
    const fixture = (chunkId: string): RepositoryKnowledgeChunk => {
      const record = byId.get(chunkId)
      assert.ok(record, `missing fixture: ${chunkId}`)
      return record
    }
    const records = [
      fixture('valid-scientific'),
      fixture('wrong-corpus-version'),
      fixture('wrong-topic'),
      fixture('wrong-purpose'),
      fixture('wrong-jurisdiction'),
      fixture('unverified-pending'),
      fixture('missing-citation'),
      fixture('retracted-scientific'),
      fixture('retracted-after-as-of'),
      fixture('superseded-regulatory'),
      fixture('expired-regulatory')
    ]
    const faultyRepository: ScopedKnowledgeRepository = {
      async searchScoped() {
        return {
          corpusVersion: CORPUS_VERSION,
          records,
          diagnostics: {
            eligibleRowsConsidered: records.length,
            matchedRows: records.length,
            vectorCalls: 0,
            modelCalls: 0,
            webCalls: 0
          }
        }
      }
    }
    const result = await retrieveKnowledge(knowledgeQuery(), faultyRepository)

    assertOnlyKnowledgeChunkIds(result, ['valid-scientific'])
    assert.equal(result.diagnostics.repositoryRowsReturned, records.length)
    assert.equal(result.diagnostics.rowsRejectedByDefense, records.length - 1)

    return { name: 'defense in depth rejects a faulty repository response' }
  }

const evalCorpusSnapshotMismatchFailsClosed: KnowledgeEvalCase = async () => {
  const mismatchedEnvelope: ScopedKnowledgeRepository = {
    async searchScoped() {
      return {
        ...EMPTY_REPOSITORY_RESULT,
        corpusVersion: OTHER_CORPUS_VERSION
      }
    }
  }

  await assert.rejects(
    retrieveKnowledge(knowledgeQuery(), mismatchedEnvelope),
    KnowledgeRepositoryScopeError
  )

  const wrongSnapshotRecord = syntheticChunk({
    corpusVersion: OTHER_CORPUS_VERSION,
    documentId: 'synthetic-paper-defense-other-snapshot',
    versionId: 'version-1',
    chunkId: 'defense-wrong-corpus-version',
    text: 'Observatório calibração pétalas em outro snapshot.'
  })
  const mismatchedRecord: ScopedKnowledgeRepository = {
    async searchScoped() {
      return {
        corpusVersion: CORPUS_VERSION,
        records: [wrongSnapshotRecord],
        diagnostics: {
          eligibleRowsConsidered: 1,
          matchedRows: 1,
          vectorCalls: 0,
          modelCalls: 0,
          webCalls: 0
        }
      }
    }
  }
  const defended = await retrieveKnowledge(knowledgeQuery(), mismatchedRecord)

  assert.equal(defended.items.length, 0)
  assert.equal(defended.diagnostics.rowsRejectedByDefense, 1)

  return { name: 'snapshot envelope and record mismatches fail closed' }
}

const evalRetractionAndSupersessionAreCurrentSafetyGates: KnowledgeEvalCase =
  async () => {
    const unsafeIds = new Set([
      'retracted-scientific',
      'retracted-after-as-of',
      'superseded-regulatory'
    ])
    const repository = new InMemoryScopedKnowledgeRepository(
      FILTER_CORPUS.filter(({ chunkId }) => unsafeIds.has(chunkId))
    )
    const result = await retrieveKnowledge(knowledgeQuery(), repository)

    assert.equal(result.items.length, 0)
    assert.equal(repository.diagnostics.searchCalls, 1)

    return {
      name: 'any retraction or supersession excludes evidence regardless of as-of'
    }
  }

const evalRepositoryCandidateOverflowFailsClosed: KnowledgeEvalCase =
  async () => {
    let authorizedCandidateLimit = 0
    const repository: ScopedKnowledgeRepository = {
      async searchScoped(search) {
        authorizedCandidateLimit = search.candidateLimit
        const records = Array.from(
          { length: search.candidateLimit + 1 },
          (_, index) =>
            syntheticChunk({
              documentId: `overflow-${String(index).padStart(2, '0')}`,
              versionId: 'version-1',
              chunkId: `overflow-${String(index).padStart(2, '0')}`,
              text: 'Observatório calibração pétalas em registro excedente.'
            })
        )

        return {
          corpusVersion: search.corpusVersion,
          records,
          diagnostics: {
            eligibleRowsConsidered: records.length,
            matchedRows: records.length,
            vectorCalls: 0,
            modelCalls: 0,
            webCalls: 0
          }
        }
      }
    }

    await assert.rejects(
      retrieveKnowledge(knowledgeQuery({ maxDocs: 1 }), repository),
      KnowledgeRepositoryScopeError
    )
    assert.equal(authorizedCandidateLimit, 4)

    return { name: 'repository candidate overflow fails closed' }
  }

const evalPaidAndNetworkCallsFailClosed: KnowledgeEvalCase = async () => {
  const forbiddenDiagnostics = [
    { vectorCalls: 1, modelCalls: 0, webCalls: 0 },
    { vectorCalls: 0, modelCalls: 1, webCalls: 0 },
    { vectorCalls: 0, modelCalls: 0, webCalls: 1 }
  ] as const

  for (const calls of forbiddenDiagnostics) {
    const repository: ScopedKnowledgeRepository = {
      async searchScoped() {
        return {
          corpusVersion: CORPUS_VERSION,
          records: [],
          diagnostics: {
            eligibleRowsConsidered: 0,
            matchedRows: 0,
            ...calls
          }
        }
      }
    }

    await assert.rejects(
      retrieveKnowledge(knowledgeQuery(), repository),
      KnowledgeRepositoryScopeError
    )
  }

  const repository = new InMemoryScopedKnowledgeRepository(FILTER_CORPUS)
  const result = await retrieveKnowledge(knowledgeQuery(), repository)

  assert.equal(result.diagnostics.vectorFallbackUsed, false)
  assert.equal(result.diagnostics.vectorCalls, 0)
  assert.equal(result.diagnostics.modelCalls, 0)
  assert.equal(result.diagnostics.webCalls, 0)
  assert.deepEqual(repository.diagnostics, {
    searchCalls: 1,
    vectorCalls: 0,
    modelCalls: 0,
    webCalls: 0
  })

  return { name: 'model, vector, and web use fail closed at zero calls' }
}

export const KNOWLEDGE_REPOSITORY_SAFETY_EVALS: readonly KnowledgeEvalCase[] = [
  evalRepositoryPrefiltersIneligibleEvidence,
  evalDefenseInDepthAgainstFaultyRepository,
  evalCorpusSnapshotMismatchFailsClosed,
  evalRetractionAndSupersessionAreCurrentSafetyGates,
  evalRepositoryCandidateOverflowFailsClosed,
  evalPaidAndNetworkCallsFailClosed
]
