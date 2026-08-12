import { agentOrbPalettes } from '@repo/react-web/ui/agent-orb/palettes'

export type AgentId = 'ana' | 'nico' | 'isa'

export interface AgentOption {
  colors: (typeof agentOrbPalettes)[AgentId]
  context: string
  description: string
  id: AgentId
  name: string
  shortContext: string
}

export const agentOptions: readonly AgentOption[] = [
  {
    id: 'ana',
    name: 'Ana',
    shortContext: 'Neurodivergência',
    context: 'Autismo, TDAH e transtornos de personalidade',
    description:
      'Ajuda você e sua rede a entender melhor sobrecarga, rotina, emoções, limites e formas de pedir ou oferecer apoio.',
    colors: agentOrbPalettes.ana
  },
  {
    id: 'nico',
    name: 'Nico',
    shortContext: 'Depressão e ansiedade',
    context: 'Depressão, ansiedade e fobia social',
    description:
      'Ajuda a organizar momentos de isolamento, medo, crise e sobrecarga emocional — e a transformar isso em contexto para pedir apoio com mais clareza.',
    colors: agentOrbPalettes.nico
  },
  {
    id: 'isa',
    name: 'Isa',
    shortContext: 'Relacionamentos',
    context: 'Relacionamentos, autoestima e autocuidado',
    description:
      'Ajuda a organizar conflitos, necessidades, limites e formas de se cuidar — e a transformar isso em contexto para conversar com mais clareza.',
    colors: agentOrbPalettes.isa
  }
]
