import { z } from 'zod'

export const CanonicalMemoryKindSchema = z.enum(['semantic', 'episodic'])
export type CanonicalMemoryKind = z.infer<typeof CanonicalMemoryKindSchema>

export const CanonicalMemoryStateSchema = z.enum([
  'active',
  'superseded',
  'expired',
  'quarantined',
  'tombstoned'
])
export type CanonicalMemoryState = z.infer<typeof CanonicalMemoryStateSchema>

export const CanonicalMemorySensitivitySchema = z.enum([
  'normal',
  'sensitive',
  'highly-sensitive'
])
export type CanonicalMemorySensitivity = z.infer<
  typeof CanonicalMemorySensitivitySchema
>

export const CanonicalMemorySchema = z
  .object({
    category: z.string().min(1).max(120),
    confidence: z.number().min(0).max(1),
    createdAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
    kind: CanonicalMemoryKindSchema,
    observedAt: z.string().datetime({ offset: true }),
    purposeIds: z.array(z.string().min(1).max(80)).min(1).max(16),
    semanticKey: z.string().min(1).max(200).nullable(),
    sensitivity: CanonicalMemorySensitivitySchema,
    state: CanonicalMemoryStateSchema,
    statement: z.string().min(1).max(4_000),
    subjectId: z.string().uuid(),
    tenantId: z.string().uuid(),
    updatedAt: z.string().datetime({ offset: true }),
    validFrom: z.string().datetime({ offset: true }).nullable(),
    validUntil: z.string().datetime({ offset: true }).nullable(),
    version: z.number().int().positive(),
    viewIds: z.array(z.string().min(1).max(120)).min(1).max(16)
  })
  .strict()
  .superRefine((memory, context) => {
    if (memory.kind === 'semantic' && memory.semanticKey === null) {
      context.addIssue({
        code: 'custom',
        message: 'semantic memory requires semanticKey',
        path: ['semanticKey']
      })
    }

    if (memory.kind === 'episodic' && memory.semanticKey !== null) {
      context.addIssue({
        code: 'custom',
        message: 'episodic memory must not have semanticKey',
        path: ['semanticKey']
      })
    }

    if (
      memory.validFrom !== null &&
      memory.validUntil !== null &&
      Date.parse(memory.validFrom) >= Date.parse(memory.validUntil)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'validUntil must be later than validFrom',
        path: ['validUntil']
      })
    }
  })

export type CanonicalMemory = z.infer<typeof CanonicalMemorySchema>

/** Domain entity wrapper around a validated canonical-memory snapshot. */
export class MemoryEntity {
  readonly #snapshot: CanonicalMemory

  private constructor(snapshot: CanonicalMemory) {
    this.#snapshot = Object.freeze({ ...snapshot })
  }

  static from(snapshot: CanonicalMemory): MemoryEntity {
    return new MemoryEntity(CanonicalMemorySchema.parse(snapshot))
  }

  get id(): string {
    return this.#snapshot.id
  }
  get state(): CanonicalMemoryState {
    return this.#snapshot.state
  }
  get version(): number {
    return this.#snapshot.version
  }
  get snapshot(): CanonicalMemory {
    return this.#snapshot
  }

  canBeRetrieved(at: Date): boolean {
    if (this.state !== 'active') return false
    const epoch = at.getTime()
    const from = this.#snapshot.validFrom
      ? Date.parse(this.#snapshot.validFrom)
      : null
    const until = this.#snapshot.validUntil
      ? Date.parse(this.#snapshot.validUntil)
      : null
    return (from === null || epoch >= from) && (until === null || epoch < until)
  }
}
