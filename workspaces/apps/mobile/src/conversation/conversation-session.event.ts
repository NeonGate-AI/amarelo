import type {
  ConversationClientErrorCode,
  ConversationTurnResponseData
} from '@repo/conversation-sdk'

export interface ConversationSessionFailure {
  readonly code: ConversationClientErrorCode
  readonly message: string
  readonly requestId: string
}

export type ConversationSessionEvent =
  | {
      readonly requestId: string
      readonly type: 'aborted'
    }
  | {
      readonly failure: ConversationSessionFailure
      readonly requestId: string
      readonly type: 'failed'
    }
  | {
      readonly requestId: string
      readonly type: 'pending'
    }
  | {
      readonly requestId: string
      readonly result: ConversationTurnResponseData
      readonly type: 'succeeded'
    }
