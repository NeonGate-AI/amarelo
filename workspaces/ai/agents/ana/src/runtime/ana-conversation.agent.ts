import {
  ConversationAgentPort,
  ConversationAgentResultSchema,
  type ConversationAgentInvocation,
  type ConversationAgentResult
} from '@ai/conversation'

import { AnaChatModelPort } from '../model'
import { AnaAgentIdentityError, AnaAgentResponseError } from './ana-agent.error'
import { formatAnaRuntimeContext } from './ana-runtime-context.fmt'

export interface AnaConversationAgentDependencies {
  readonly model: AnaChatModelPort
}

export class AnaConversationAgent extends ConversationAgentPort {
  readonly id = 'ana' as const
  readonly #model: AnaChatModelPort

  constructor(dependencies: AnaConversationAgentDependencies) {
    super()
    this.#model = dependencies.model
  }

  async invoke(
    input: ConversationAgentInvocation
  ): Promise<ConversationAgentResult> {
    if (input.agentId !== this.id) {
      throw new AnaAgentIdentityError(input.agentId)
    }

    const runtimeContext = formatAnaRuntimeContext(input)

    try {
      const result = ConversationAgentResultSchema.parse(
        await this.#model.invoke(
          Object.freeze({
            instructionVersion: runtimeContext.instructionVersion,
            instructions: runtimeContext.instructions,
            messages: input.messages,
            requestId: input.requestId
          })
        )
      )

      return Object.freeze({
        response: result.response,
        usage: result.usage === null ? null : Object.freeze({ ...result.usage })
      })
    } catch (error) {
      throw new AnaAgentResponseError(error)
    }
  }
}
