import { z } from 'zod'

import {
  MemoryIdentifierSchema,
  MemoryKindSchema,
  MemoryPurposeSchema,
  MemoryRecordSchema,
  MemoryTimestampSchema
} from '../memory/memory-record.contract.js'
import {
  MEMORY_SEARCH_TOKEN_ESTIMATOR_VERSION,
  createMemorySearchContextProjection,
  estimateMemorySearchItemTokens
} from './memory-search-token.estimator.js'

export const MAX_MEMORY_SEARCH_TOKENS = 600
export const MAX_EPISODIC_MEMORY_SEARCH_ITEMS = 3
export const MAX_SEMANTIC_MEMORY_SEARCH_ITEMS = 8
export const MAX_MEMORY_SEARCH_ITEMS =
  MAX_EPISODIC_MEMORY_SEARCH_ITEMS + MAX_SEMANTIC_MEMORY_SEARCH_ITEMS

const UniqueMemoryKindsSchema = z
  .array(MemoryKindSchema)
  .min(1)
  .max(MemoryKindSchema.options.length)
  .superRefine((kinds, context) => {
    if (new Set(kinds).size !== kinds.length) {
      context.addIssue({
        code: 'custom',
        message: 'kinds must not contain duplicates'
      })
    }
  })

const UniqueCategoriesSchema = z
  .array(MemoryIdentifierSchema)
  .min(1)
  .max(32)
  .superRefine((categories, context) => {
    if (new Set(categories).size !== categories.length) {
      context.addIssue({
        code: 'custom',
        message: 'categories must not contain duplicates'
      })
    }
  })

export const MemorySearchInputSchema = z
  .object({
    categories: UniqueCategoriesSchema.optional(),
    asOf: MemoryTimestampSchema,
    kinds: UniqueMemoryKindsSchema.optional(),
    maxItems: z.number().int().min(1).max(MAX_MEMORY_SEARCH_ITEMS).optional(),
    purpose: MemoryPurposeSchema,
    query: z.string().trim().min(1).max(4_000),
    tokenBudget: z.number().int().min(1).max(MAX_MEMORY_SEARCH_TOKENS)
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.kinds?.length === 1 &&
      input.kinds[0] === 'episodic' &&
      input.maxItems !== undefined &&
      input.maxItems > MAX_EPISODIC_MEMORY_SEARCH_ITEMS
    ) {
      context.addIssue({
        code: 'custom',
        message: `episodic maxItems must not exceed ${MAX_EPISODIC_MEMORY_SEARCH_ITEMS}`,
        path: ['maxItems']
      })
    }

    if (
      input.kinds?.length === 1 &&
      input.kinds[0] === 'semantic' &&
      input.maxItems !== undefined &&
      input.maxItems > MAX_SEMANTIC_MEMORY_SEARCH_ITEMS
    ) {
      context.addIssue({
        code: 'custom',
        message: `semantic maxItems must not exceed ${MAX_SEMANTIC_MEMORY_SEARCH_ITEMS}`,
        path: ['maxItems']
      })
    }
  })
export type MemorySearchInput = z.input<typeof MemorySearchInputSchema>
export type ValidatedMemorySearchInput = z.output<
  typeof MemorySearchInputSchema
>

export const MemorySearchScoreSchema = z
  .object({
    freshness: z.number().min(0).max(1).optional(),
    lexical: z.number().min(0).max(1).optional(),
    salience: z.number().min(0).max(1).optional(),
    semantic: z.number().min(0).max(1).optional(),
    total: z.number().min(0).max(1)
  })
  .strict()
export type MemorySearchScore = z.infer<typeof MemorySearchScoreSchema>

export const MemorySearchItemSchema = z
  .object({
    estimatedTokens: z.number().int().positive().max(MAX_MEMORY_SEARCH_TOKENS),
    memory: MemoryRecordSchema,
    score: MemorySearchScoreSchema,
    trust: z.literal('untrusted-memory-data')
  })
  .strict()
  .transform((item) =>
    Object.freeze({
      ...item,
      context: createMemorySearchContextProjection(item)
    })
  )
export type MemorySearchItem = z.infer<typeof MemorySearchItemSchema>

export const MemoryTokenBudgetSchema = z
  .object({
    effectiveTokens: z.number().int().min(1).max(MAX_MEMORY_SEARCH_TOKENS),
    estimatorVersion: z.literal(MEMORY_SEARCH_TOKEN_ESTIMATOR_VERSION),
    remainingTokens: z.number().int().nonnegative(),
    requestedTokens: z.number().int().min(1).max(MAX_MEMORY_SEARCH_TOKENS),
    truncated: z.boolean(),
    usedTokens: z.number().int().nonnegative()
  })
  .strict()
  .superRefine((budget, context) => {
    if (budget.effectiveTokens > budget.requestedTokens) {
      context.addIssue({
        code: 'custom',
        message: 'effectiveTokens must not exceed requestedTokens',
        path: ['effectiveTokens']
      })
    }

    if (budget.usedTokens > budget.effectiveTokens) {
      context.addIssue({
        code: 'custom',
        message: 'usedTokens must not exceed effectiveTokens',
        path: ['usedTokens']
      })
    }

    if (budget.remainingTokens !== budget.effectiveTokens - budget.usedTokens) {
      context.addIssue({
        code: 'custom',
        message: 'remainingTokens must equal effectiveTokens - usedTokens',
        path: ['remainingTokens']
      })
    }
  })
export type MemoryTokenBudget = z.infer<typeof MemoryTokenBudgetSchema>

export const MemorySearchDiagnosticsSchema = z
  .object({
    candidateItems: z.number().int().nonnegative(),
    eligibleItems: z.number().int().nonnegative(),
    modelCalls: z.literal(0),
    omittedByBudget: z.number().int().nonnegative(),
    omittedByLimit: z.number().int().nonnegative(),
    omittedByPolicy: z.number().int().nonnegative(),
    rerankerUsed: z.literal(false),
    returnedItems: z.number().int().nonnegative(),
    vectorCalls: z.literal(0),
    vectorSearchUsed: z.literal(false),
    webCalls: z.literal(0)
  })
  .strict()
  .superRefine((diagnostics, context) => {
    if (diagnostics.eligibleItems > diagnostics.candidateItems) {
      context.addIssue({
        code: 'custom',
        message: 'eligibleItems must not exceed candidateItems',
        path: ['eligibleItems']
      })
    }

    if (diagnostics.returnedItems > diagnostics.eligibleItems) {
      context.addIssue({
        code: 'custom',
        message: 'returnedItems must not exceed eligibleItems',
        path: ['returnedItems']
      })
    }

    if (
      diagnostics.omittedByPolicy !==
      diagnostics.candidateItems - diagnostics.eligibleItems
    ) {
      context.addIssue({
        code: 'custom',
        message: 'omittedByPolicy must equal candidateItems - eligibleItems',
        path: ['omittedByPolicy']
      })
    }

    if (
      diagnostics.omittedByBudget + diagnostics.omittedByLimit !==
      diagnostics.eligibleItems - diagnostics.returnedItems
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'budget and limit omissions must account for eligible non-returned items',
        path: ['omittedByBudget']
      })
    }
  })
export type MemorySearchDiagnostics = z.infer<
  typeof MemorySearchDiagnosticsSchema
>

export const MemorySearchGovernanceSchema = z
  .object({
    authorizationDecisionId: MemoryIdentifierSchema,
    consentVersion: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .nullable(),
    purpose: MemoryPurposeSchema,
    viewId: MemoryIdentifierSchema
  })
  .strict()
export type MemorySearchGovernance = z.infer<
  typeof MemorySearchGovernanceSchema
>

export const MemorySearchResultSchema = z
  .object({
    asOf: MemoryTimestampSchema,
    diagnostics: MemorySearchDiagnosticsSchema,
    governance: MemorySearchGovernanceSchema,
    items: z.array(MemorySearchItemSchema).max(MAX_MEMORY_SEARCH_ITEMS),
    policyVersion: MemoryIdentifierSchema,
    requestId: MemoryIdentifierSchema,
    tokenBudget: MemoryTokenBudgetSchema
  })
  .strict()
  .superRefine((result, context) => {
    const memoryIds = result.items.map((item) => item.memory.id)

    if (new Set(memoryIds).size !== memoryIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'search items must not contain duplicate memory IDs',
        path: ['items']
      })
    }

    const reportedItemTokens = result.items.reduce(
      (total, item) => total + item.estimatedTokens,
      0
    )
    const locallyEstimatedTokens = result.items.map((item, index) => {
      const estimate = estimateMemorySearchItemTokens(item)

      if (item.estimatedTokens < estimate) {
        context.addIssue({
          code: 'custom',
          message:
            'item estimatedTokens must not understate the local conservative estimate',
          path: ['items', index, 'estimatedTokens']
        })
      }

      return estimate
    })
    const localTokenTotal = locallyEstimatedTokens.reduce(
      (total, estimate) =>
        Math.min(
          MAX_MEMORY_SEARCH_TOKENS + 1,
          total + Math.min(estimate, MAX_MEMORY_SEARCH_TOKENS + 1)
        ),
      0
    )

    if (reportedItemTokens !== result.tokenBudget.usedTokens) {
      context.addIssue({
        code: 'custom',
        message: 'usedTokens must equal the sum of item token estimates',
        path: ['tokenBudget', 'usedTokens']
      })
    }

    if (localTokenTotal > result.tokenBudget.effectiveTokens) {
      context.addIssue({
        code: 'custom',
        message: 'local item estimates must fit inside effectiveTokens',
        path: ['items']
      })
    }

    const episodicItems = result.items.filter(
      (item) => item.memory.kind === 'episodic'
    ).length
    const semanticItems = result.items.length - episodicItems

    if (episodicItems > MAX_EPISODIC_MEMORY_SEARCH_ITEMS) {
      context.addIssue({
        code: 'custom',
        message: 'search result exceeded the episodic item hard cap',
        path: ['items']
      })
    }

    if (semanticItems > MAX_SEMANTIC_MEMORY_SEARCH_ITEMS) {
      context.addIssue({
        code: 'custom',
        message: 'search result exceeded the semantic item hard cap',
        path: ['items']
      })
    }

    if (result.diagnostics.returnedItems !== result.items.length) {
      context.addIssue({
        code: 'custom',
        message: 'returnedItems must equal the number of result items',
        path: ['diagnostics', 'returnedItems']
      })
    }

    const expectedTruncated =
      result.diagnostics.omittedByBudget + result.diagnostics.omittedByLimit > 0

    if (result.tokenBudget.truncated !== expectedTruncated) {
      context.addIssue({
        code: 'custom',
        message:
          'truncated must report whether eligible items were omitted by budget or limit',
        path: ['tokenBudget', 'truncated']
      })
    }
  })
export type MemorySearchResult = z.infer<typeof MemorySearchResultSchema>
