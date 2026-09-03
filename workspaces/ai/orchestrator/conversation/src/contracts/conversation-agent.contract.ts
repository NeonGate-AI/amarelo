export const AGENT_IDS = ['ana', 'nico', 'isa'] as const

export type AgentId = (typeof AGENT_IDS)[number]

const AGENT_ID_SET: ReadonlySet<string> = new Set(AGENT_IDS)

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && AGENT_ID_SET.has(value)
}

/** Agent identities currently supported by the conversation domain. */
export const CONVERSATION_AGENT_IDS: readonly AgentId[] = AGENT_IDS
