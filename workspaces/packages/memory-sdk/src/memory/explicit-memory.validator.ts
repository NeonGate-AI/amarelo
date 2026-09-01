import {
  ExplicitMemoryResultSchema,
  type ValidatedExplicitMemoryInput
} from './explicit-memory.contract.js'
import { memoryTimestampsRepresentSameInstant } from './memory-record.contract.js'

export function createExplicitMemoryResultSchema(
  input: ValidatedExplicitMemoryInput
) {
  return ExplicitMemoryResultSchema.superRefine((memory, context) => {
    if (memory.kind !== input.kind) {
      context.addIssue({
        code: 'custom',
        message: 'created memory kind must match the explicit request',
        path: ['kind']
      })
    }

    if (memory.category !== input.category) {
      context.addIssue({
        code: 'custom',
        message: 'created memory category must match the explicit request',
        path: ['category']
      })
    }

    if (memory.statement !== input.statement) {
      context.addIssue({
        code: 'custom',
        message: 'created memory statement must match the explicit request',
        path: ['statement']
      })
    }

    if (memory.uncertainty !== input.uncertainty) {
      context.addIssue({
        code: 'custom',
        message: 'created memory uncertainty must match the explicit request',
        path: ['uncertainty']
      })
    }

    if (
      memory.purposeIds.length !== 1 ||
      memory.purposeIds[0] !== input.purpose
    ) {
      context.addIssue({
        code: 'custom',
        message: 'created memory must preserve only the requested purpose',
        path: ['purposeIds']
      })
    }

    if (memory.kind === 'episodic' && input.kind === 'episodic') {
      if (
        !memoryTimestampsRepresentSameInstant(
          memory.occurredAt,
          input.occurredAt
        )
      ) {
        context.addIssue({
          code: 'custom',
          message: 'created memory occurredAt must match the explicit request',
          path: ['occurredAt']
        })
      }

      if (memory.temporalPrecision !== input.temporalPrecision) {
        context.addIssue({
          code: 'custom',
          message:
            'created memory temporalPrecision must match the explicit request',
          path: ['temporalPrecision']
        })
      }

      if (memory.temporalReference !== input.temporalReference) {
        context.addIssue({
          code: 'custom',
          message:
            'created memory temporalReference must match the explicit request',
          path: ['temporalReference']
        })
      }
    }

    if (memory.kind === 'semantic' && input.kind === 'semantic') {
      if (memory.semanticKey !== input.semanticKey) {
        context.addIssue({
          code: 'custom',
          message: 'created memory semanticKey must match the explicit request',
          path: ['semanticKey']
        })
      }

      if (
        !memoryTimestampsRepresentSameInstant(memory.validFrom, input.validFrom)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'created memory validFrom must match the explicit request',
          path: ['validFrom']
        })
      }

      if (memory.validUntil !== null) {
        context.addIssue({
          code: 'custom',
          message: 'explicit semantic memory must not invent validUntil',
          path: ['validUntil']
        })
      }
    }
  })
}
