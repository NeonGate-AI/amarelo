import type { AgentOrbPreset } from './agent-orb'

export const agentOrbPresets = {
  ana: 'peach',
  isa: 'magenta',
  nico: 'periwinkle'
} as const satisfies Record<string, AgentOrbPreset>
