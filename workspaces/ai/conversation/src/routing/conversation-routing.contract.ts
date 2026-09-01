export type ConversationLane = 'reflex' | 'contextual' | 'deliberative'

export interface CognitiveBudget {
  readonly contextTokens: number
  readonly memoryTokens: number
  readonly reasoning: 'low' | 'medium' | 'high'
  readonly allowKnowledge: boolean
  readonly allowTools: boolean
}

export interface ConversationRoutingDecision {
  readonly lane: ConversationLane
  readonly budget: CognitiveBudget
  readonly reasonCode: string
}
