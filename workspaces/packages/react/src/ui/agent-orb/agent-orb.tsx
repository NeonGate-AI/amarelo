'use client'

import '@neongate-ai/orbz/react-types'
import '@neongate-ai/orbz/browser'

import {
  normalizeOrbzSize,
  type OrbzPresetName,
  type OrbzReducedMotion,
  type OrbzSize,
  type OrbzState
} from '@neongate-ai/orbz'

export interface AgentOrbProps {
  /** Use an outer element for layout styling. */
  className?: never
  paused?: boolean
  preset?: AgentOrbPreset
  reducedMotion?: OrbzReducedMotion
  size?: OrbzSize
  speed?: number
  state?: AgentOrbState
}

export type AgentOrbPreset = OrbzPresetName
export type AgentOrbState = OrbzState

const DEFAULT_PRESET = 'peach' satisfies AgentOrbPreset

export function AgentOrb(props: AgentOrbProps) {
  const {
    paused = false,
    preset = DEFAULT_PRESET,
    reducedMotion = 'system',
    size = '192px',
    speed = 1,
    state = 'idle'
  } = props

  const resolvedSize = normalizeOrbzSize(size)

  return (
    // The Orbz host has no focus behavior; its visual shadow tree is decorative.
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: custom elements are conservatively treated as focusable.
    <orb-z
      aria-hidden="true"
      paused={paused}
      preset={preset}
      reduced-motion={reducedMotion}
      size={resolvedSize}
      speed={speed}
      state={state}
    />
  )
}
