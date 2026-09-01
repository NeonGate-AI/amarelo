'use client'

import {
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform
} from 'motion/react'
import { type AriaAttributes, useEffect, useRef } from 'react'

import { cn } from '@utilities'

const DEFAULT_AUTO_DURATION_SECONDS = 3.8
const KEY_PREFIX_LENGTH = 3

export interface ScrollRevealParagraphProps {
  'aria-hidden'?: AriaAttributes['aria-hidden']
  autoDuration?: number
  className?: string
  mode?: 'auto' | 'scroll'
  paragraph: string
}

interface ParagraphContentProps extends ScrollRevealParagraphProps {
  progress: MotionValue<number>
}

interface WordProps {
  children: string
  progress: MotionValue<number>
  range: [number, number]
  reduceMotion: boolean
}

function Word({ children, progress, range, reduceMotion }: WordProps) {
  const opacity = useTransform(progress, range, reduceMotion ? [1, 1] : [0, 1])

  if (reduceMotion) {
    return (
      <span className="mr-[0.28em] inline-block last:mr-0">{children}</span>
    )
  }

  return (
    <span className="relative mr-[0.28em] inline-block last:mr-0">
      <span className="text-foreground/18">{children}</span>
      <motion.span
        className="absolute inset-0 text-foreground"
        style={{ opacity }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function ParagraphContent(props: ParagraphContentProps) {
  const { 'aria-hidden': ariaHidden, className, paragraph, progress } = props
  const shouldReduceMotion = useReducedMotion() ?? false
  const lines = paragraph.split('\n')
  const wordCount = Math.max(
    1,
    lines.reduce(
      (count, line) => count + line.split(/\s+/).filter(Boolean).length,
      0
    )
  )
  let wordIndex = 0

  return (
    <p
      aria-hidden={ariaHidden}
      className={cn('m-0 text-lg leading-relaxed', className)}
    >
      {lines.map((line, lineIndex) => (
        <span className="block" key={`line-${lineIndex}-${line.slice(0, 12)}`}>
          {line
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => {
              const currentWordIndex = wordIndex
              wordIndex += 1
              const start = currentWordIndex / wordCount
              const end = start + 1 / wordCount

              return (
                <Word
                  key={`word-${currentWordIndex}-${word.slice(0, KEY_PREFIX_LENGTH)}`}
                  progress={progress}
                  range={[start, end]}
                  reduceMotion={shouldReduceMotion}
                >
                  {word}
                </Word>
              )
            })}
        </span>
      ))}
    </p>
  )
}

function AutoRevealParagraph(props: ScrollRevealParagraphProps) {
  const { autoDuration = DEFAULT_AUTO_DURATION_SECONDS } = props
  const shouldReduceMotion = useReducedMotion() ?? false
  const progress = useMotionValue(shouldReduceMotion ? 1 : 0)

  useEffect(() => {
    progress.set(shouldReduceMotion ? 1 : 0)
    if (shouldReduceMotion) {
      return
    }

    const playback = animate(progress, 1, {
      duration: Math.max(0.2, autoDuration),
      ease: 'linear'
    })

    return () => playback.stop()
  }, [autoDuration, progress, shouldReduceMotion])

  return <ParagraphContent {...props} progress={progress} />
}

function ScrollTrackedParagraph(props: ScrollRevealParagraphProps) {
  const container = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    offset: ['start 0.9', 'start 0.25'],
    target: container
  })

  return (
    <div ref={container}>
      <ParagraphContent {...props} progress={scrollYProgress} />
    </div>
  )
}

/**
 * SmoothUI word-by-word paragraph reveal.
 *
 * `scroll` keeps the upstream component behavior. `auto` reuses the same
 * progressive word treatment for deterministic, locally mocked transcripts.
 */
export function ScrollRevealParagraph(props: ScrollRevealParagraphProps) {
  return props.mode === 'auto' ? (
    <AutoRevealParagraph {...props} />
  ) : (
    <ScrollTrackedParagraph {...props} />
  )
}

export default ScrollRevealParagraph
