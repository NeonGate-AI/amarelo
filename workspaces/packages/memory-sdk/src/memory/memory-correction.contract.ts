import { z } from 'zod'

export const MemoryCorrectionInputSchema = z
  .object({
    memoryId: z.string().uuid(),
    statement: z.string().trim().min(1).max(4_000),
    reason: z.string().trim().min(1).max(240).optional()
  })
  .strict()

export type MemoryCorrectionInput = z.infer<typeof MemoryCorrectionInputSchema>

export interface MemoryCorrectionResult {
  readonly memoryId: string
  readonly version: number
}
