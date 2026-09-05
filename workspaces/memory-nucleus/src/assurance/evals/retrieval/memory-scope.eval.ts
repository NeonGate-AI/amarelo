import assert from 'node:assert/strict'

import type { AuthorizedMemoryRetrievalResult } from '@application/contracts'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  memoryResultIds
} from './memory-retrieval.fixtures.ts'
import {
  OTHER_CATEGORY,
  OTHER_PURPOSE,
  OTHER_SUBJECT_ID,
  OTHER_TENANT_ID,
  OTHER_VIEW_ID,
  SCOPED_AUTHORIZATION_DECISION_IDS,
  retrieveScopedMemory
} from './memory-scope.fixtures.ts'

function assertOnlyMemoryIds(
  result: AuthorizedMemoryRetrievalResult,
  expectedIds: readonly string[]
): void {
  assert.deepEqual(new Set(memoryResultIds(result)), new Set(expectedIds))
}

const evalTenantSubjectAndCategoryIsolation: MemoryRetrievalEvalCase =
  async () => {
    const base = {
      kinds: ['semantic'] as const,
      categories: ['preference'] as const,
      queryText: '',
      semanticKeys: ['preference.beverage']
    }

    assertOnlyMemoryIds(
      await retrieveScopedMemory(authorizedMemoryQuery(base)),
      ['semantic-hibiscus-tea']
    )
    assertOnlyMemoryIds(
      await retrieveScopedMemory(
        authorizedMemoryQuery({
          ...base,
          authorizationDecisionId:
            SCOPED_AUTHORIZATION_DECISION_IDS.otherTenant,
          tenantId: OTHER_TENANT_ID
        })
      ),
      ['other-tenant']
    )
    assertOnlyMemoryIds(
      await retrieveScopedMemory(
        authorizedMemoryQuery({
          ...base,
          authorizationDecisionId:
            SCOPED_AUTHORIZATION_DECISION_IDS.otherSubject,
          subjectId: OTHER_SUBJECT_ID
        })
      ),
      ['other-subject']
    )
    assertOnlyMemoryIds(
      await retrieveScopedMemory(
        authorizedMemoryQuery({
          ...base,
          authorizationDecisionId:
            SCOPED_AUTHORIZATION_DECISION_IDS.otherCategory,
          categories: [OTHER_CATEGORY]
        })
      ),
      ['other-category']
    )

    return { name: 'tenant, subject, and category isolation' }
  }

const evalPurposeAndViewIsolation: MemoryRetrievalEvalCase = async () => {
  const base = {
    kinds: ['semantic'] as const,
    categories: ['preference'] as const,
    queryText: '',
    semanticKeys: ['preference.beverage']
  }

  assertOnlyMemoryIds(await retrieveScopedMemory(authorizedMemoryQuery(base)), [
    'semantic-hibiscus-tea'
  ])
  assertOnlyMemoryIds(
    await retrieveScopedMemory(
      authorizedMemoryQuery({
        ...base,
        authorizationDecisionId: SCOPED_AUTHORIZATION_DECISION_IDS.otherPurpose,
        purpose: OTHER_PURPOSE
      })
    ),
    ['other-purpose']
  )
  assertOnlyMemoryIds(
    await retrieveScopedMemory(
      authorizedMemoryQuery({
        ...base,
        authorizationDecisionId: SCOPED_AUTHORIZATION_DECISION_IDS.otherView,
        viewId: OTHER_VIEW_ID
      })
    ),
    ['other-view']
  )

  return { name: 'purpose and view isolation' }
}

export const MEMORY_SCOPE_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalTenantSubjectAndCategoryIsolation,
  evalPurposeAndViewIsolation
]
