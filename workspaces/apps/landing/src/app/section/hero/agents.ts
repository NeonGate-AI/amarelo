import { agentOrbPresets } from '@repo/react/ui/agent-orb'

export type AgentId = 'ana' | 'nico' | 'isa'

export interface AgentOption {
  description: string
  focus: string
  id: AgentId
  name: string
  preset: (typeof agentOrbPresets)[AgentId]
  shortFocus: string
}

export const agentOptions: readonly AgentOption[] = [
  {
    id: 'ana',
    name: 'Ana',
    shortFocus: 'Neurodivergência',
    focus: 'TDAH e transtornos de personalidade',
    description:
      'Ajuda você e sua rede a entender melhor sobrecarga, rotina, emoções, limites e formas de pedir ou oferecer apoio.',
    preset: agentOrbPresets.ana
  },
  {
    id: 'nico',
    name: 'Nico',
    shortFocus: 'Depressão e ansiedade',
    focus: 'Depressão, ansiedade e fobia social',
    description:
      'Ajuda a organizar momentos de isolamento, medo, crise e sobrecarga emocional — e a transformar isso em memória revisável para pedir apoio com mais clareza.',
    preset: agentOrbPresets.nico
  },
  {
    id: 'isa',
    name: 'Isa',
    shortFocus: 'Relacionamentos',
    focus: 'Relacionamentos, autoestima e autocuidado',
    description:
      'Ajuda a organizar conflitos, necessidades, limites e formas de se cuidar — e a transformar isso em memória revisável para conversar com mais clareza.',
    preset: agentOrbPresets.isa
  }
]
