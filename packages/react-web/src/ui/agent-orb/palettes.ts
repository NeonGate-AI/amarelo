import type { AgentOrbColors } from './agent-orb'

export const agentOrbPalettes = {
  ana: {
    background: '#2B2200',
    primary: '#F4D300',
    secondary: '#FAD715',
    tertiary: '#F4F502',
    highlight: '#FFDD2F'
  },
  nico: {
    background: '#20362A',
    primary: '#72C596',
    secondary: '#7DB2CF',
    tertiary: '#4F765C',
    highlight: '#9BCFE4'
  },
  isa: {
    background: '#33283B',
    primary: '#B99AD0',
    secondary: '#D89B9B',
    tertiary: '#8F70AB',
    highlight: '#E7B7C8'
  }
} as const satisfies Record<string, Required<AgentOrbColors>>
