import type {
  ConversationAgentResult,
  ConversationMessage
} from '@ai/conversation'

export type AnaChatModelResult = ConversationAgentResult

export interface AnaChatModelRequest {
  readonly instructionVersion: string
  readonly instructions: string
  readonly messages: readonly ConversationMessage[]
  readonly requestId: string
}

export abstract class AnaChatModelPort {
  abstract invoke(input: AnaChatModelRequest): Promise<AnaChatModelResult>
}
