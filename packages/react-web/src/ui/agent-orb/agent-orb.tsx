'use client'

import {
  motion,
  type MotionStyle,
  type MotionValue,
  type TargetAndTransition,
  type Transition,
  useMotionValue,
  useReducedMotion,
  useTransform
} from 'motion/react'
import { useEffect } from 'react'

export interface AgentOrbColors {
  background?: string
  primary?: string
  secondary?: string
  tertiary?: string
  highlight?: string
}

export interface AgentOrbProps {
  amplitude?: number | MotionValue<number>
  animationDuration?: number
  className?: string
  colors?: AgentOrbColors
  size?: number | string
  state?: AgentOrbState
}

export type AgentOrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'streaming'
  | 'done'
  | 'error'

interface StateMotion {
  glow: number
  hueRotate: number
  motif: 'breathe' | 'receive' | 'scan' | 'pulse' | 'ping' | 'fault'
  reactivity: number
  saturation: number
  scale: number
  speed: number
}

const STATE_MOTION: Record<AgentOrbState, StateMotion> = {
  done: {
    glow: 0.7,
    hueRotate: 0,
    motif: 'ping',
    reactivity: 0,
    saturation: 1,
    scale: 1.1,
    speed: 0.8
  },
  error: {
    glow: 0.25,
    hueRotate: 0,
    motif: 'fault',
    reactivity: 0,
    saturation: 0.3,
    scale: 0.96,
    speed: 1
  },
  idle: {
    glow: 0.15,
    hueRotate: 0,
    motif: 'breathe',
    reactivity: 0,
    saturation: 0.8,
    scale: 0.94,
    speed: 0.6
  },
  listening: {
    glow: 0.6,
    hueRotate: 0,
    motif: 'receive',
    reactivity: 1,
    saturation: 1.05,
    scale: 1.06,
    speed: 1
  },
  streaming: {
    glow: 0.45,
    hueRotate: -10,
    motif: 'pulse',
    reactivity: 0.6,
    saturation: 1,
    scale: 1.02,
    speed: 1.4
  },
  thinking: {
    glow: 0.35,
    hueRotate: 18,
    motif: 'scan',
    reactivity: 0.15,
    saturation: 1,
    scale: 1,
    speed: 2.4
  }
}

const SIZE_THRESHOLD_TINY = 30
const SIZE_THRESHOLD_SMALL = 50
const SIZE_THRESHOLD_MEDIUM = 100
const ERROR_SHAKE_KEYFRAMES = [0, -3, 3, 0]
const EASE_IN_OUT = [0.645, 0.045, 0.355, 1] as const
const BREATHE_SCALE = [1, 1.035, 1]
const SPRING_DEFAULT: Transition = {
  bounce: 0.1,
  duration: 0.25,
  type: 'spring'
}
const DEFAULT_COLORS: Required<AgentOrbColors> = {
  background: 'oklch(92% 0.03 300)',
  primary: 'oklch(68% 0.21 350)',
  secondary: 'oklch(70% 0.18 210)',
  tertiary: 'oklch(66% 0.2 285)',
  highlight: 'oklch(72% 0.19 325)'
}

export function AgentOrb(props: AgentOrbProps) {
  const {
    amplitude,
    animationDuration = 20,
    className,
    colors,
    size = '192px',
    state = 'idle'
  } = props

  const shouldReduceMotion = useReducedMotion()
  const amplitudeValue = useAmplitudeValue(amplitude)
  const stateMotion = getAgentOrbStateMotion(state)

  const finalColors = { ...DEFAULT_COLORS, ...colors }
  const resolvedSize = typeof size === 'number' ? `${size}px` : size
  const sizeValue = Number.parseInt(resolvedSize.replace('px', ''), 10)
  const blurAmount =
    sizeValue < SIZE_THRESHOLD_SMALL
      ? Math.max(sizeValue * 0.008, 1)
      : Math.max(sizeValue * 0.015, 4)
  const contrastAmount =
    sizeValue < SIZE_THRESHOLD_SMALL
      ? Math.max(sizeValue * 0.004, 1.2)
      : Math.max(sizeValue * 0.008, 1.5)
  const dotSize =
    sizeValue < SIZE_THRESHOLD_SMALL
      ? Math.max(sizeValue * 0.004, 0.05)
      : Math.max(sizeValue * 0.008, 0.1)
  const shadowSpread =
    sizeValue < SIZE_THRESHOLD_SMALL
      ? Math.max(sizeValue * 0.004, 0.5)
      : Math.max(sizeValue * 0.008, 2)
  const maskRadius = getMaskRadius(sizeValue)
  const finalContrast = getFinalContrast(sizeValue, contrastAmount)
  const reactivity = shouldReduceMotion ? 0 : stateMotion.reactivity
  const reactiveBlur = useTransform(amplitudeValue, (level) => {
    const focus = 1 - level * reactivity * 0.45

    return `${blurAmount * focus}px`
  })
  const reactiveScale = useTransform(amplitudeValue, (level) => {
    return stateMotion.scale + level * reactivity * 0.12
  })
  const loopDuration = shouldReduceMotion
    ? animationDuration
    : animationDuration / stateMotion.speed
  const rim = Math.max(sizeValue * 0.06, 1.5)
  const driftDuration = (12 / (1 + stateMotion.speed)) * 2

  function getRootAnimate(): TargetAndTransition {
    if (shouldReduceMotion) {
      return { scale: 1, x: 0 }
    }

    if (state === 'error') {
      return { scale: 1, x: ERROR_SHAKE_KEYFRAMES }
    }

    if (stateMotion.motif === 'breathe') {
      return { scale: BREATHE_SCALE, x: 0 }
    }

    return { scale: 1, x: 0 }
  }

  function getRootTransition(): Transition {
    if (shouldReduceMotion) {
      return { duration: 0 }
    }

    if (state === 'error') {
      return { duration: 0.18, ease: EASE_IN_OUT }
    }

    if (stateMotion.motif === 'breathe') {
      return {
        duration: 5.5,
        ease: EASE_IN_OUT,
        repeat: Number.POSITIVE_INFINITY
      }
    }

    return SPRING_DEFAULT
  }

  return (
    <motion.div
      animate={getRootAnimate()}
      aria-hidden="true"
      className={joinClassNames('relative', className)}
      style={
        {
          '--orb-size': resolvedSize,
          height: resolvedSize,
          width: resolvedSize
        } as MotionStyle
      }
      transition={getRootTransition()}
    >
      <motion.div
        animate={{ opacity: stateMotion.glow * 0.7 }}
        className="absolute rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${finalColors.secondary} 0%, transparent 64%)`,
          filter: 'blur(calc(var(--orb-size) * 0.28))',
          inset: '-12%'
        }}
        transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
      />

      <motion.div
        className="siri-orb"
        style={
          {
            '--animation-duration': `${loopDuration}s`,
            '--bg': finalColors.background,
            '--blur-amount': reactiveBlur,
            '--c1': finalColors.primary,
            '--c2': finalColors.secondary,
            '--c3': finalColors.tertiary,
            '--c4': finalColors.highlight,
            '--contrast-amount': finalContrast,
            '--dot-size': `${dotSize}px`,
            '--drift-duration': `${driftDuration}s`,
            '--mask-radius': maskRadius,
            '--rim': `${rim}px`,
            '--shadow-spread': `${shadowSpread}px`,
            filter: `saturate(${stateMotion.saturation}) hue-rotate(${stateMotion.hueRotate}deg)`,
            height: '100%',
            scale: reactiveScale,
            width: '100%'
          } as MotionStyle
        }
      >
        <span aria-hidden="true" className="siri-orb-layer siri-orb-sheen" />
        <span aria-hidden="true" className="siri-orb-layer siri-orb-rim" />
        <style>{`
          @property --angle {
            syntax: '<angle>';
            inherits: false;
            initial-value: 0deg;
          }

          .siri-orb {
            display: grid;
            grid-template-areas: 'stack';
            overflow: hidden;
            border-radius: 50%;
            position: relative;
            isolation: isolate;
          }

          .siri-orb::before,
          .siri-orb::after,
          .siri-orb > .siri-orb-layer {
            content: '';
            display: block;
            grid-area: stack;
            width: 100%;
            height: 100%;
            border-radius: 50%;
          }

          .siri-orb-sheen {
            background:
              radial-gradient(circle at 30% 24%, hsl(0 0% 100% / 0.32), transparent 34%),
              radial-gradient(circle at 72% 80%, hsl(0 0% 100% / 0.07), transparent 48%);
            mix-blend-mode: screen;
            animation: siri-drift var(--drift-duration) ease-in-out infinite alternate;
          }

          .siri-orb-rim {
            box-shadow:
              inset 0 0 0 1px hsl(0 0% 100% / 0.16),
              inset 0 var(--rim) calc(var(--rim) * 2) hsl(0 0% 100% / 0.22),
              inset 0 calc(var(--rim) * -1.2) calc(var(--rim) * 2.4) hsl(0 0% 0% / 0.4);
            pointer-events: none;
          }

          .siri-orb::before {
            background:
              conic-gradient(from calc(var(--angle) * 2) at 25% 70%, var(--c3), transparent 20% 80%, var(--c3)),
              conic-gradient(from calc(var(--angle) * 2) at 45% 75%, var(--c2), transparent 30% 60%, var(--c2)),
              conic-gradient(from calc(var(--angle) * -3) at 80% 20%, var(--c1), transparent 40% 60%, var(--c1)),
              conic-gradient(from calc(var(--angle) * 1.5) at 60% 35%, var(--c4), transparent 25% 75%, var(--c4)),
              conic-gradient(from calc(var(--angle) * 2) at 15% 5%, var(--c2), transparent 10% 90%, var(--c2)),
              conic-gradient(from var(--angle) at 20% 80%, var(--c1), transparent 10% 90%, var(--c1)),
              conic-gradient(from calc(var(--angle) * -2) at 85% 10%, var(--c3), transparent 20% 80%, var(--c3));
            box-shadow: inset var(--bg) 0 0 var(--shadow-spread) calc(var(--shadow-spread) * 0.2);
            filter: blur(var(--blur-amount)) contrast(var(--contrast-amount)) saturate(1.4);
            animation: siri-rotate var(--animation-duration) linear infinite;
          }

          .siri-orb::after {
            background-image: radial-gradient(circle at center, var(--bg) var(--dot-size), transparent var(--dot-size));
            background-size: calc(var(--dot-size) * 2) calc(var(--dot-size) * 2);
            backdrop-filter: blur(calc(var(--blur-amount) * 2)) contrast(calc(var(--contrast-amount) * 2));
            mix-blend-mode: overlay;
          }

          .siri-orb[style*='--mask-radius: 0%']::after {
            mask-image: none;
          }

          .siri-orb:not([style*='--mask-radius: 0%'])::after {
            mask-image: radial-gradient(black var(--mask-radius), transparent 75%);
          }

          @keyframes siri-drift {
            0% { transform: translate(-6%, -4%) scale(1.05); }
            100% { transform: translate(7%, 6%) scale(1.12); }
          }

          @keyframes siri-rotate {
            to { --angle: 360deg; }
          }

          @media (prefers-reduced-motion: reduce) {
            .siri-orb::before,
            .siri-orb-sheen {
              animation: none;
            }
          }
        `}</style>
      </motion.div>
    </motion.div>
  )
}

function getAgentOrbStateMotion(state: AgentOrbState): StateMotion {
  return STATE_MOTION[state] ?? STATE_MOTION.idle
}

function useAmplitudeValue(
  amplitude: number | MotionValue<number> | undefined
): MotionValue<number> {
  const fallback = useMotionValue(0)
  const numericAmplitude = typeof amplitude === 'number' ? amplitude : null

  useEffect(() => {
    if (numericAmplitude !== null) {
      fallback.set(numericAmplitude)
    }
  }, [fallback, numericAmplitude])

  return isMotionValue(amplitude) ? amplitude : fallback
}

function isMotionValue(
  value: number | MotionValue<number> | undefined
): value is MotionValue<number> {
  return typeof value === 'object' && value !== null && 'get' in value
}

function getMaskRadius(size: number): string {
  if (size < SIZE_THRESHOLD_TINY) {
    return '0%'
  }

  if (size < SIZE_THRESHOLD_SMALL) {
    return '5%'
  }

  if (size < SIZE_THRESHOLD_MEDIUM) {
    return '15%'
  }

  return '25%'
}

function getFinalContrast(size: number, contrast: number): number {
  if (size < SIZE_THRESHOLD_TINY) {
    return 1.1
  }

  if (size < SIZE_THRESHOLD_SMALL) {
    return Math.max(contrast * 1.2, 1.3)
  }

  return contrast
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}
