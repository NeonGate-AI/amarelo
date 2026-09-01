import {
  MAX_EPISODIC_MEMORY_SEARCH_ITEMS,
  MAX_SEMANTIC_MEMORY_SEARCH_ITEMS,
  MemorySearchResultSchema,
  type ValidatedMemorySearchInput
} from './memory-search.contract.js'
import { memoryTimestampsRepresentSameInstant } from '../memory/memory-record.contract.js'

export function createScopedMemorySearchResultSchema(
  input: ValidatedMemorySearchInput
) {
  return MemorySearchResultSchema.superRefine((result, context) => {
    if (!memoryTimestampsRepresentSameInstant(result.asOf, input.asOf)) {
      context.addIssue({
        code: 'custom',
        message: 'response asOf must match the authorized request instant',
        path: ['asOf']
      })
    }

    if (result.governance.purpose !== input.purpose) {
      context.addIssue({
        code: 'custom',
        message: 'response purpose must match the authorized request purpose',
        path: ['governance', 'purpose']
      })
    }

    if (result.tokenBudget.requestedTokens !== input.tokenBudget) {
      context.addIssue({
        code: 'custom',
        message: 'response token budget must match the requested budget',
        path: ['tokenBudget', 'requestedTokens']
      })
    }

    if (input.maxItems !== undefined && result.items.length > input.maxItems) {
      context.addIssue({
        code: 'custom',
        message: 'response item count must not exceed maxItems',
        path: ['items']
      })
    }

    const episodicItems = result.items.filter(
      (item) => item.memory.kind === 'episodic'
    ).length
    const semanticItems = result.items.filter(
      (item) => item.memory.kind === 'semantic'
    ).length

    if (episodicItems > MAX_EPISODIC_MEMORY_SEARCH_ITEMS) {
      context.addIssue({
        code: 'custom',
        message: 'response exceeded the episodic item hard cap',
        path: ['items']
      })
    }

    if (semanticItems > MAX_SEMANTIC_MEMORY_SEARCH_ITEMS) {
      context.addIssue({
        code: 'custom',
        message: 'response exceeded the semantic item hard cap',
        path: ['items']
      })
    }

    const asOfMilliseconds = Date.parse(input.asOf)

    result.items.forEach((item, index) => {
      if (item.memory.state !== 'active') {
        context.addIssue({
          code: 'custom',
          message: 'search must return active memory only',
          path: ['items', index, 'memory', 'state']
        })
      }

      if (
        item.memory.purposeIds.length !== 1 ||
        item.memory.purposeIds[0] !== input.purpose
      ) {
        context.addIssue({
          code: 'custom',
          message: 'memory must expose only the requested purpose',
          path: ['items', index, 'memory', 'purposeIds']
        })
      }

      if (
        input.kinds !== undefined &&
        !input.kinds.includes(item.memory.kind)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'memory kind must match the requested kind filter',
          path: ['items', index, 'memory', 'kind']
        })
      }

      if (
        input.categories !== undefined &&
        !input.categories.includes(item.memory.category)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'memory category must match the requested category filter',
          path: ['items', index, 'memory', 'category']
        })
      }

      if (Date.parse(item.memory.observedAt) > asOfMilliseconds) {
        context.addIssue({
          code: 'custom',
          message: 'memory must not have been observed after asOf',
          path: ['items', index, 'memory', 'observedAt']
        })
      }

      if (Date.parse(item.memory.createdAt) > asOfMilliseconds) {
        context.addIssue({
          code: 'custom',
          message: 'memory must not be created after asOf',
          path: ['items', index, 'memory', 'createdAt']
        })
      }

      if (Date.parse(item.memory.updatedAt) > asOfMilliseconds) {
        context.addIssue({
          code: 'custom',
          message: 'memory must not be updated after asOf',
          path: ['items', index, 'memory', 'updatedAt']
        })
      }

      if (
        item.memory.kind === 'episodic' &&
        item.memory.occurredAt !== null &&
        Date.parse(item.memory.occurredAt) > asOfMilliseconds
      ) {
        context.addIssue({
          code: 'custom',
          message: 'episodic memory must not occur after asOf',
          path: ['items', index, 'memory', 'occurredAt']
        })
      }

      if (item.memory.kind === 'semantic') {
        if (
          item.memory.validFrom !== null &&
          Date.parse(item.memory.validFrom) > asOfMilliseconds
        ) {
          context.addIssue({
            code: 'custom',
            message: 'semantic memory must be valid by asOf',
            path: ['items', index, 'memory', 'validFrom']
          })
        }

        if (
          item.memory.validUntil !== null &&
          Date.parse(item.memory.validUntil) <= asOfMilliseconds
        ) {
          context.addIssue({
            code: 'custom',
            message: 'semantic memory must remain valid at asOf',
            path: ['items', index, 'memory', 'validUntil']
          })
        }
      }
    })
  })
}
