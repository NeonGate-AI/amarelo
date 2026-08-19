import type { AgentOrbColors } from './agent-orb'

export const agentOrbPalettes = {
  ana: {
    accent: '#F4F502',
    background: '#2B2200',
    highlight: '#FFDD2F',
    primary: '#F4D300',
    secondary: '#FAD715'
  },
  nico: {
    accent: '#4F765C',
    background: '#20362A',
    highlight: '#9BCFE4',
    primary: '#72C596',
    secondary: '#7DB2CF'
  },
  isa: {
    accent: '#8F70AB',
    background: '#33283B',
    highlight: '#E7B7C8',
    primary: '#B99AD0',
    secondary: '#D89B9B'
  }
} as const satisfies Record<string, Required<AgentOrbColors>>
