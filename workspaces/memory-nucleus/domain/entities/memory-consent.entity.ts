import { z } from 'zod'

export const MemoryCapabilitySchema = z.enum([
  'persist',
  'retrieve',
  'project',
  'share',
  'delete'
])

export const MemoryConsentStatusSchema = z.enum(['granted', 'revoked'])

export const MemoryConsentLedgerEntrySchema = z
  .object({
    capability: MemoryCapabilitySchema,
    effectiveAt: z.string().datetime({ offset: true }),
    entryId: z.string().uuid(),
    purpose: z.string().min(1).max(80),
    resourceScope: z
      .object({
        category: z.string().min(1).max(120).nullable(),
        memoryId: z.string().uuid().nullable(),
        sensitivity: z
          .enum(['normal', 'sensitive', 'highly-sensitive'])
          .nullable()
      })
      .strict(),
    status: MemoryConsentStatusSchema,
    subjectId: z.string().uuid(),
    tenantId: z.string().uuid(),
    version: z.number().int().positive()
  })
  .strict()

export type MemoryConsentLedgerEntry = z.infer<
  typeof MemoryConsentLedgerEntrySchema
>
