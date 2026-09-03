import {
  AnaChatModelPort,
  type AnaChatModelRequest,
  type AnaChatModelResult
} from '@ai/ana'

export class RecordingAnaChatModel extends AnaChatModelPort {
  readonly requests: AnaChatModelRequest[] = []

  constructor(
    private readonly result: AnaChatModelResult = {
      response: 'Estou aqui para acompanhar você com calma.',
      usage: {
        inputTokens: 32,
        modelId: 'synthetic-ana-model',
        outputTokens: 10,
        providerId: 'synthetic-provider',
        totalTokens: 42
      }
    },
    private readonly failure: Error | null = null
  ) {
    super()
  }

  async invoke(input: AnaChatModelRequest): Promise<AnaChatModelResult> {
    this.requests.push(input)
    if (this.failure !== null) {
      throw this.failure
    }
    return this.result
  }
}
