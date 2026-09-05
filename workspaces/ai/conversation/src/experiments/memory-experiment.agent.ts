import { ConversationAgentPort, type ConversationAgentInvocation, type ConversationAgentResult } from '../ports'
import { estimateConversationMessageTokens } from '../context'
import { MemoryPairVersionsSchema } from '../shadow'
import type { MemoryExperimentRequest } from './memory-experiment.contract'
import type { MemoryExperimentController } from './memory-experiment.controller'

/** Select once before invocation; failures never trigger a second model call. */
export class MemoryExperimentAgent extends ConversationAgentPort {
  readonly id: ConversationAgentPort['id']
  constructor(private readonly agent: ConversationAgentPort, private readonly controller: MemoryExperimentController, private readonly request: MemoryExperimentRequest) {
    super()
    this.id = agent.id
  }

  async invoke(invocation: ConversationAgentInvocation): Promise<ConversationAgentResult> {
    const selection = await this.controller.select(invocation, this.request)
    const chosen = selection.plan?.treatment ?? invocation
    const started = performance.now()
    let result: ConversationAgentResult | undefined
    try {
      result = await this.agent.invoke(chosen)
      return result
    } finally {
      // Bad reporting metadata cannot turn a delivered response into an error.
      try {
        const versions = MemoryPairVersionsSchema.parse(this.request.versions)
        if (/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(this.request.reportId)) this.controller.record({
          schemaVersion: 'memory-experiment-turn-v1', specId: 'SPEC-017', reportId: this.request.reportId,
          experimentId: selection.policy?.experimentId ?? null, policyVersion: selection.policy?.version ?? null,
          versions, assignment: selection.assignment, subjectHash: selection.subjectHash, decision: selection.decision,
          controlComparableTokensEstimated: selection.plan?.controlComparableTokensEstimated ?? invocation.messages.slice(0, -1).reduce((sum, message) => sum + estimateConversationMessageTokens(message.content), 0),
          treatmentComparableTokensEstimated: selection.plan?.treatmentComparableTokensEstimated ?? null,
          totalModelInputTokens: result?.usage?.inputTokens ?? null, invocationLatencyMs: performance.now() - started,
          agentInvocations: 1, modelCalls: null, costBrl: null, voiceEvidence: 'not-measured', outcome: result === undefined ? 'failed' : 'returned'
        })
      } catch { /* Reports contain no response or raw provider error. */ }
    }
  }
}
