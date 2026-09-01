import { z } from 'zod'

import {
  MemoryIdentifierSchema,
  MemoryPurposeSchema,
  MemoryTimestampSchema
} from '../memory/memory-record.contract.js'

const MAX_CONSENT_VERSION = Number.MAX_SAFE_INTEGER
const MAX_EXPECTED_CONSENT_VERSION = MAX_CONSENT_VERSION - 1

export const MemoryConsentStatusSchema = z.enum(['granted', 'revoked'])
export type MemoryConsentStatus = z.infer<typeof MemoryConsentStatusSchema>

export const MemoryConsentEntrySchema = z
  .object({
    policyVersion: MemoryIdentifierSchema,
    purpose: MemoryPurposeSchema,
    status: MemoryConsentStatusSchema,
    updatedAt: MemoryTimestampSchema,
    version: z.number().int().positive().max(MAX_CONSENT_VERSION)
  })
  .strict()
export type MemoryConsentEntry = z.infer<typeof MemoryConsentEntrySchema>

export const MemoryConsentStateSchema = z
  .object({
    entries: z.array(MemoryConsentEntrySchema).max(64),
    updatedAt: MemoryTimestampSchema,
    version: z.number().int().positive().max(MAX_CONSENT_VERSION)
  })
  .strict()
  .superRefine((state, context) => {
    const purposes = state.entries.map((entry) => entry.purpose)

    if (new Set(purposes).size !== purposes.length) {
      context.addIssue({
        code: 'custom',
        message: 'consent entries must have unique purposes',
        path: ['entries']
      })
    }

    state.entries.forEach((entry, index) => {
      if (entry.version > state.version) {
        context.addIssue({
          code: 'custom',
          message: 'consent entry version must not exceed state version',
          path: ['entries', index, 'version']
        })
      }

      if (Date.parse(entry.updatedAt) > Date.parse(state.updatedAt)) {
        context.addIssue({
          code: 'custom',
          message: 'consent entry updatedAt must not exceed state updatedAt',
          path: ['entries', index, 'updatedAt']
        })
      }
    })
  })
export type MemoryConsentState = z.infer<typeof MemoryConsentStateSchema>

export const MemoryConsentChangeSchema = z
  .object({
    policyVersion: MemoryIdentifierSchema,
    purpose: MemoryPurposeSchema,
    status: MemoryConsentStatusSchema
  })
  .strict()
export type MemoryConsentChange = z.infer<typeof MemoryConsentChangeSchema>

export const UpdateMemoryConsentInputSchema = z
  .object({
    changes: z.array(MemoryConsentChangeSchema).min(1).max(64),
    expectedVersion: z
      .number()
      .int()
      .positive()
      .max(MAX_EXPECTED_CONSENT_VERSION)
  })
  .strict()
  .superRefine((input, context) => {
    const purposes = input.changes.map((change) => change.purpose)

    if (new Set(purposes).size !== purposes.length) {
      context.addIssue({
        code: 'custom',
        message: 'consent changes must have unique purposes',
        path: ['changes']
      })
    }
  })
export type UpdateMemoryConsentInput = z.input<
  typeof UpdateMemoryConsentInputSchema
>
export type ValidatedUpdateMemoryConsentInput = z.output<
  typeof UpdateMemoryConsentInputSchema
>
