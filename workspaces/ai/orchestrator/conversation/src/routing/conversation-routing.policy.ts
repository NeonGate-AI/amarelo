import type {
  CognitiveBudget,
  ConversationRoutingDecision
} from './conversation-routing.contract'

export const CONVERSATION_ROUTING_POLICY_VERSION =
  'conversation-routing-deterministic-v1' as const

const REFLEX_BUDGET: CognitiveBudget = Object.freeze({
  allowKnowledge: false,
  allowTools: false,
  contextTokens: 800,
  memoryTokens: 0,
  reasoning: 'low'
})

const CONTEXTUAL_BUDGET: CognitiveBudget = Object.freeze({
  allowKnowledge: false,
  allowTools: false,
  contextTokens: 4_000,
  memoryTokens: 300,
  reasoning: 'medium'
})

const DELIBERATIVE_BUDGET: CognitiveBudget = Object.freeze({
  allowKnowledge: true,
  allowTools: true,
  contextTokens: 8_000,
  memoryTokens: 600,
  reasoning: 'high'
})

const REFLEX_PATTERN =
  /^(?:oi+|ol[aá]|e a[ií]|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|sim|n[aã]o|ok|certo|entendi|t[aá] bom|beleza)[!,.? ]*$/u

const DELIBERATIVE_PATTERN =
  /\b(?:analise|análise|compare|comparar|planeje|planejamento|pesquise|pesquisa|investigue|estratégia|estrategia|passo a passo|trade-offs?|arquitetura|avaliação profunda|avaliacao profunda)\b/u

const DELIBERATIVE_MESSAGE_LENGTH = 800

function routingDecision(
  lane: ConversationRoutingDecision['lane'],
  budget: CognitiveBudget,
  reasonCode: string
): ConversationRoutingDecision {
  return Object.freeze({ budget, lane, reasonCode })
}

export function routeConversationTurn(
  message: string
): ConversationRoutingDecision {
  const normalized = message
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('pt-BR')

  if (REFLEX_PATTERN.test(normalized)) {
    return routingDecision('reflex', REFLEX_BUDGET, 'brief-social-turn')
  }

  if (
    normalized.length >= DELIBERATIVE_MESSAGE_LENGTH ||
    DELIBERATIVE_PATTERN.test(normalized)
  ) {
    return routingDecision(
      'deliberative',
      DELIBERATIVE_BUDGET,
      normalized.length >= DELIBERATIVE_MESSAGE_LENGTH
        ? 'large-user-input'
        : 'explicit-complexity'
    )
  }

  return routingDecision(
    'contextual',
    CONTEXTUAL_BUDGET,
    'default-contextual'
  )
}
