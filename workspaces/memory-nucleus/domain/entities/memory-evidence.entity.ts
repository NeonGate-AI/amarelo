import { z } from 'zod'

export const MemoryEvidenceSourceSchema = z.enum([
  'conversation',
  'explicit-user',
  'tool-result',
  'import',
  'admin',
  'derived'
])

export const MemoryEvidenceSchema = z
  .object({
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    evidenceId: z.string().uuid(),
    observedAt: z.string().datetime({ offset: true }),
    sourceArtifactId: z.string().min(1).max(200),
    sourceType: MemoryEvidenceSourceSchema,
    subjectId: z.string().uuid(),
    tenantId: z.string().uuid()
  })
  .strict()

export type MemoryEvidence = z.infer<typeof MemoryEvidenceSchema>
