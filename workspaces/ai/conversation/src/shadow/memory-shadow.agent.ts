import { ConversationAgentPort, type ConversationAgentInvocation, type ConversationAgentResult } from '../ports'
import type { MemoryShadowRequest } from './memory-shadow.contract'
import type { MemoryShadowExecutor } from './memory-shadow.executor'

/** Exactly one delegated visible invocation; shadow is detached after its result. */
export class MemoryShadowAgent extends ConversationAgentPort {
  readonly id: ConversationAgentPort['id']
  constructor(private readonly agent: ConversationAgentPort, private readonly executor: MemoryShadowExecutor, private readonly request: MemoryShadowRequest) {
    super()
    this.id = agent.id
  }
  async invoke(invocation: ConversationAgentInvocation): Promise<ConversationAgentResult> {
    const result = await this.agent.invoke(invocation)
    try { this.executor.schedule({ ...this.request, invocation, controlUsage: result.usage }) } catch { /* Shadow cannot change the delivered result. */ }
    return result
  }
}
