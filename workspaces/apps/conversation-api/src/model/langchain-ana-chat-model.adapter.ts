import type { AnaChatModelRequest, AnaChatModelResult } from '@ai/ana'
import { AnaChatModelPort } from '@ai/ana'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage
} from '@langchain/core/messages'

export interface LangChainChatModelInvoker {
  invoke(messages: BaseMessage[]): Promise<AIMessage>
}

export interface LangChainAnaChatModelAdapterOptions {
  readonly model: LangChainChatModelInvoker
  readonly modelId: string
  readonly providerId: string
}

function textFromContent(content: AIMessage['content']): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  const parts: string[] = []
  for (const part of content) {
    if (typeof part === 'string') {
      parts.push(part)
      continue
    }
    if (
      typeof part === 'object' &&
      part !== null &&
      'type' in part &&
      part.type === 'text' &&
      'text' in part &&
      typeof part.text === 'string'
    ) {
      parts.push(part.text)
    }
  }
  return parts.join('\n').trim()
}

export class LangChainAnaChatModelAdapter extends AnaChatModelPort {
  readonly #model: LangChainChatModelInvoker
  readonly #modelId: string
  readonly #providerId: string

  constructor(options: LangChainAnaChatModelAdapterOptions) {
    super()
    this.#model = options.model
    this.#modelId = options.modelId
    this.#providerId = options.providerId
  }

  async invoke(input: AnaChatModelRequest): Promise<AnaChatModelResult> {
    const messages: BaseMessage[] = [new SystemMessage(input.instructions)]
    for (const message of input.messages) {
      messages.push(
        message.role === 'user'
          ? new HumanMessage(message.content)
          : new AIMessage(message.content)
      )
    }

    const response = await this.#model.invoke(messages)
    const usage = response.usage_metadata

    return Object.freeze({
      response: textFromContent(response.content),
      usage:
        usage === undefined
          ? null
          : Object.freeze({
              inputTokens: usage.input_tokens ?? null,
              modelId: this.#modelId,
              outputTokens: usage.output_tokens ?? null,
              providerId: this.#providerId,
              totalTokens: usage.total_tokens ?? null
            })
    })
  }
}
