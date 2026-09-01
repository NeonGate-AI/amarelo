import type { CanonicalMemoryPort } from '#application/ports/canonical-memory.port'

export interface ForgetMemoryCommand {
  readonly memoryId: string
  readonly tenantId: string
  readonly subjectId: string
  readonly reasonCode: string
}

export class ForgetMemoryUseCase {
  constructor(private readonly memory: CanonicalMemoryPort) {}

  async execute(command: ForgetMemoryCommand): Promise<void> {
    const forgotten = await this.memory.tombstoneMemory(command)
    if (!forgotten) {
      throw new Error('memory was not found or was already forgotten')
    }
  }
}
