import {
  MemoryConsentStateSchema,
  type MemoryConsentState,
  type ValidatedUpdateMemoryConsentInput
} from './memory-consent.contract.js'
import { memoryTimestampsRepresentSameInstant } from '../memory/memory-record.contract.js'

export function createUpdatedMemoryConsentStateSchema(
  input: ValidatedUpdateMemoryConsentInput,
  previousState: MemoryConsentState
) {
  return MemoryConsentStateSchema.superRefine((state, context) => {
    if (state.version !== input.expectedVersion + 1) {
      context.addIssue({
        code: 'custom',
        message: 'updated consent version must advance exactly once',
        path: ['version']
      })
    }

    if (previousState.version !== input.expectedVersion) {
      context.addIssue({
        code: 'custom',
        message: 'base consent state must match expectedVersion',
        path: ['version']
      })
    }

    if (Date.parse(state.updatedAt) < Date.parse(previousState.updatedAt)) {
      context.addIssue({
        code: 'custom',
        message: 'updated consent state must not move backward in time',
        path: ['updatedAt']
      })
    }

    input.changes.forEach((change) => {
      const previousEntry = previousState.entries.find(
        (entry) => entry.purpose === change.purpose
      )

      if (
        previousEntry?.status === change.status &&
        previousEntry.policyVersion === change.policyVersion
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'consent changes must not restamp an existing status and policy version',
          path: ['entries']
        })
      }
    })

    const entriesInAppliedVersion = state.entries.filter(
      (entry) => entry.version === state.version
    )

    if (entriesInAppliedVersion.length !== input.changes.length) {
      context.addIssue({
        code: 'custom',
        message:
          'new consent version must contain exactly the requested changes',
        path: ['entries']
      })
    }

    entriesInAppliedVersion.forEach((entry) => {
      const requestedChange = input.changes.find(
        (change) => change.purpose === entry.purpose
      )

      if (
        requestedChange === undefined ||
        requestedChange.status !== entry.status ||
        requestedChange.policyVersion !== entry.policyVersion
      ) {
        context.addIssue({
          code: 'custom',
          message: 'new consent version must not contain unrequested changes',
          path: ['entries']
        })
      }
    })

    const requestedPurposes = new Set(
      input.changes.map((change) => change.purpose)
    )
    const previousEntries = new Map(
      previousState.entries.map((entry) => [entry.purpose, entry])
    )
    const expectedPurposeCount =
      previousState.entries.length +
      input.changes.filter((change) => !previousEntries.has(change.purpose))
        .length

    if (state.entries.length !== expectedPurposeCount) {
      context.addIssue({
        code: 'custom',
        message: 'updated consent state must preserve the complete base state',
        path: ['entries']
      })
    }

    state.entries.forEach((entry) => {
      const previousEntry = previousEntries.get(entry.purpose)

      if (
        previousEntry === undefined &&
        !requestedPurposes.has(entry.purpose)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'updated consent state must not add unrelated purposes',
          path: ['entries']
        })
        return
      }

      if (previousEntry === undefined) {
        return
      }

      if (requestedPurposes.has(entry.purpose)) {
        const requestedChange = input.changes.find(
          (change) => change.purpose === entry.purpose
        )

        if (entry.policyVersion !== requestedChange?.policyVersion) {
          context.addIssue({
            code: 'custom',
            message: 'consent update must bind the requested policyVersion',
            path: ['entries']
          })
        }
        return
      }

      if (
        entry.policyVersion !== previousEntry.policyVersion ||
        entry.status !== previousEntry.status ||
        !memoryTimestampsRepresentSameInstant(
          entry.updatedAt,
          previousEntry.updatedAt
        ) ||
        entry.version !== previousEntry.version
      ) {
        context.addIssue({
          code: 'custom',
          message: 'consent update must not alter unrelated entries',
          path: ['entries']
        })
      }
    })

    previousState.entries.forEach((previousEntry) => {
      if (
        !state.entries.some((entry) => entry.purpose === previousEntry.purpose)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'consent update must not remove existing entries',
          path: ['entries']
        })
      }
    })

    input.changes.forEach((change) => {
      const updatedEntry = state.entries.find(
        (entry) => entry.purpose === change.purpose
      )

      if (
        updatedEntry === undefined ||
        updatedEntry.status !== change.status ||
        updatedEntry.policyVersion !== change.policyVersion ||
        updatedEntry.version !== state.version ||
        !memoryTimestampsRepresentSameInstant(
          updatedEntry.updatedAt,
          state.updatedAt
        )
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'updated consent state must bind every requested change to the new version',
          path: ['entries']
        })
      }
    })
  })
}
