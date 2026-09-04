import type { ConversationSafeErrorCode } from '../contracts'

export type ConversationClientErrorCode =
  | ConversationSafeErrorCode
  | 'aborted'
  | 'invalid_response'
  | 'network_error'
  | 'timeout'

export interface ConversationClientErrorOptions {
  readonly cause?: unknown
  readonly code: ConversationClientErrorCode
  readonly message: string
  readonly requestId: string | null
}

export class ConversationClientError extends Error {
  readonly code: ConversationClientErrorCode
  readonly requestId: string | null

  constructor(options: ConversationClientErrorOptions) {
    super(options.message, { cause: options.cause })
    this.name = 'ConversationClientError'
    this.code = options.code
    this.requestId = options.requestId
  }
}
