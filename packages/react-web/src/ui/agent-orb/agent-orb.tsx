'use client'

import {
  type OrbzReducedMotion,
  type OrbzSize,
  type OrbzState
} from '@neongate-ai/orbz'
import { Orbz } from '@neongate-ai/orbz/react'

export interface AgentOrbColors {
  accent?: string
  background?: string
  highlight?: string
  primary?: string
  secondary?: string
}

export interface AgentOrbProps {
  animationDuration?: number
  className?: string
  colors?: AgentOrbColors
  paused?: boolean
  reducedMotion?: OrbzReducedMotion
  size?: OrbzSize
  speed?: number
  state?: AgentOrbState
}

export type AgentOrbState = OrbzState

const DEFAULT_ANIMATION_DURATION = 20
const DEFAULT_COLORS = {
  accent: '#F4F502',
  background: '#2B2200',
  highlight: '#FFDD2F',
  primary: '#F4D300',
  secondary: '#FAD715'
} as const satisfies Required<AgentOrbColors>

export function AgentOrb(props: AgentOrbProps) {
  const {
    animationDuration = DEFAULT_ANIMATION_DURATION,
    className,
    colors,
    paused = false,
    reducedMotion = 'system',
    size = '192px',
    speed,
    state = 'idle'
  } = props

  const resolvedColors = { ...DEFAULT_COLORS, ...colors }
  const resolvedSpeed = resolveSpeed(speed, animationDuration)

  return (
    <Orbz
      aria-hidden="true"
      className={className}
      colors={resolvedColors}
      paused={paused}
      reducedMotion={reducedMotion}
      size={size}
      speed={resolvedSpeed}
      state={state}
    />
  )
}

function resolveSpeed(
  speed: number | undefined,
  animationDuration: number
): number {
  if (typeof speed === 'number' && Number.isFinite(speed) && speed > 0) {
    return speed
  }

  if (Number.isFinite(animationDuration) && animationDuration > 0) {
    return DEFAULT_ANIMATION_DURATION / animationDuration
  }

  return 1
}
