import assert from 'node:assert/strict'

import {
  InMemoryScopedKnowledgeRepository,
  InvalidKnowledgeRetrievalQueryError,
  retrieveKnowledge,
  type KnowledgeRepositorySearch,
  type KnowledgeRetrievalQuery,
  type KnowledgeRetrievalResult,
  type ScopedKnowledgeRepository
} from '#knowledge'
import type { KnowledgeEvalCase } from './knowledge-evaluation.contract.ts'
import {
  EMPTY_REPOSITORY_RESULT,
  FILTER_CORPUS
} from './knowledge-filter.fixtures.ts'
import {
  AS_OF,
  CORPUS_VERSION,
  JURISDICTION,
  knowledgeQuery,
  OTHER_CORPUS_VERSION,
  OTHER_JURISDICTION,
  OTHER_PURPOSE_CODE,
  OTHER_TOPIC_ID,
  PURPOSE_CODE,
  TOPIC_ID
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

const evalRepositoryReceivesFrozenNonPersonalScope: KnowledgeEvalCase =
  async () => {
    let captured: KnowledgeRepositorySearch | undefined
    const repository: ScopedKnowledgeRepository = {
      async searchScoped(search) {
        captured = search
        return EMPTY_REPOSITORY_RESULT
      }
    }
    await retrieveKnowledge(
      knowledgeQuery({
        sourceTypes: ['scientific'],
        maxDocs: 3,
        maxTokens: 240
      }),
      repository
    )

    assert.ok(captured)
    assert.equal(captured.corpusVersion, CORPUS_VERSION)
    assert.deepEqual(captured.topicIds, [TOPIC_ID])
    assert.equal(captured.purposeCode, PURPOSE_CODE)
    assert.equal(captured.jurisdiction, JURISDICTION)
    assert.equal(captured.asOf, AS_OF)
    assert.deepEqual(captured.sourceTypes, ['scientific'])
    assert.equal(captured.requiredVerificationStatus, 'verified')
    assert.equal(captured.requireCitation, true)
    assert.equal(captured.requireProvenance, true)
    assert.equal(captured.excludeRetracted, true)
    assert.equal(captured.excludeSuperseded, true)
    assert.equal(captured.distinctDocuments, true)
    assert.equal(captured.maxChunkTokens, 240)
    assert.equal(captured.candidateLimit, 12)
    assert.equal(captured.vectorFallback, false)
    assert.ok(Object.isFrozen(captured))
    assert.ok(Object.isFrozen(captured.sourceTypes))
    assert.ok(Object.isFrozen(captured.topicIds))
    assert.ok(!('tenantId' in captured))
    assert.ok(!('subjectId' in captured))
    assert.ok(!('authorizationDecisionId' in captured))

    return {
      name: 'repository receives immutable non-personal knowledge scope'
    }
  }

const evalUnknownQueryPropertiesFailBeforeRepository: KnowledgeEvalCase =
  async () => {
    const repository = new InMemoryScopedKnowledgeRepository(FILTER_CORPUS)
    const queryWithPersonalFields = {
      ...knowledgeQuery(),
      actorId: 'must-not-enter-knowledge-scope',
      authorizationDecisionId: 'must-not-enter-knowledge-scope',
      subjectId: 'must-not-enter-knowledge-scope',
      tenantId: 'must-not-enter-knowledge-scope'
    } as unknown as KnowledgeRetrievalQuery

    await assert.rejects(
      retrieveKnowledge(queryWithPersonalFields, repository),
      InvalidKnowledgeRetrievalQueryError
    )
    assert.equal(repository.diagnostics.searchCalls, 0)

    return {
      name: 'unknown and personal query properties fail before repository'
    }
  }

const evalInvalidQueriesFailBeforeRepository: KnowledgeEvalCase = async () => {
  const repository = new InMemoryScopedKnowledgeRepository(FILTER_CORPUS)
  const invalidQueries: readonly KnowledgeRetrievalQuery[] = [
    knowledgeQuery({ corpusVersion: '' }),
    knowledgeQuery({ topicIds: [] }),
    knowledgeQuery({ topicIds: [TOPIC_ID, TOPIC_ID] }),
    knowledgeQuery({ topicIds: [''] }),
    knowledgeQuery({ sourceTypes: [] }),
    knowledgeQuery({ sourceTypes: ['scientific', 'scientific'] }),
    knowledgeQuery({
      sourceTypes: ['unsupported'] as unknown as readonly ['scientific']
    }),
    knowledgeQuery({ maxDocs: -1 }),
    knowledgeQuery({ maxDocs: 1.5 }),
    knowledgeQuery({ maxTokens: -1 }),
    knowledgeQuery({ maxTokens: 1.5 }),
    knowledgeQuery({ vectorFallback: true as false })
  ]

  for (const invalidQuery of invalidQueries) {
    await assert.rejects(
      retrieveKnowledge(invalidQuery, repository),
      InvalidKnowledgeRetrievalQueryError
    )
  }

  assert.equal(repository.diagnostics.searchCalls, 0)

  return { name: 'invalid scope, budgets, and fallback fail before repository' }
}

const evalZeroBudgetsAvoidRepository: KnowledgeEvalCase = async () => {
  for (const budget of [{ maxDocs: 0 }, { maxTokens: 0 }] as const) {
    const repository = new InMemoryScopedKnowledgeRepository(FILTER_CORPUS)
    const result = await retrieveKnowledge(knowledgeQuery(budget), repository)

    assert.equal(result.items.length, 0)
    assert.equal(result.totalEstimatedTokens, 0)
    assert.equal(repository.diagnostics.searchCalls, 0)
  }

  return { name: 'zero document or token budget makes zero repository calls' }
}

const evalSnapshotTopicPurposeJurisdictionAndSourceIsolation: KnowledgeEvalCase =
  async () => {
    const repository = new InMemoryScopedKnowledgeRepository(FILTER_CORPUS)

    assertOnlyKnowledgeChunkIds(
      await retrieveKnowledge(knowledgeQuery(), repository),
      ['valid-regulatory']
    )
    assertOnlyKnowledgeChunkIds(
      await retrieveKnowledge(
        knowledgeQuery({ purposeCode: OTHER_PURPOSE_CODE }),
        repository
      ),
      ['wrong-purpose']
    )
    assertOnlyKnowledgeChunkIds(
      await retrieveKnowledge(
        knowledgeQuery({ jurisdiction: OTHER_JURISDICTION }),
        repository
      ),
      ['wrong-jurisdiction']
    )
    assertOnlyKnowledgeChunkIds(
      await retrieveKnowledge(
        knowledgeQuery({ corpusVersion: OTHER_CORPUS_VERSION }),
        repository
      ),
      ['wrong-corpus-version']
    )
    assertOnlyKnowledgeChunkIds(
      await retrieveKnowledge(
        knowledgeQuery({ topicIds: [OTHER_TOPIC_ID] }),
        repository
      ),
      ['wrong-topic']
    )
    assertOnlyKnowledgeChunkIds(
      await retrieveKnowledge(
        knowledgeQuery({
          queryText: 'prisma violeta',
          topicIds: [TOPIC_ID, OTHER_TOPIC_ID]
        }),
        repository
      ),
      ['compound-topic']
    )
    assertOnlyKnowledgeChunkIds(
      await retrieveKnowledge(
        knowledgeQuery({ sourceTypes: ['scientific'] }),
        repository
      ),
      ['valid-scientific']
    )
    assertOnlyKnowledgeChunkIds(
      await retrieveKnowledge(
        knowledgeQuery({ sourceTypes: ['regulatory'] }),
        repository
      ),
      ['valid-regulatory']
    )

    return {
      name: 'snapshot, all-topic, purpose, jurisdiction, and source isolation'
    }
  }

export const KNOWLEDGE_SCOPE_EVALS: readonly KnowledgeEvalCase[] = [
  evalRepositoryReceivesFrozenNonPersonalScope,
  evalUnknownQueryPropertiesFailBeforeRepository,
  evalInvalidQueriesFailBeforeRepository,
  evalZeroBudgetsAvoidRepository,
  evalSnapshotTopicPurposeJurisdictionAndSourceIsolation
]
