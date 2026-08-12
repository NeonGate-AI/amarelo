'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

export interface KineticTextProps {
  phrases: string[]
  className?: string
  interval?: number
  loop?: boolean
}

const BUILD_EASE = [0.2, 0.8, 0.2, 1] as const
const EXIT_EASE = [0.4, 0, 0.2, 1] as const

export function KineticText(props: KineticTextProps) {
  const { phrases, className = '', interval = 2500, loop = false } = props

  const [phraseIndex, setPhraseIndex] = useState(0)
  const [wordCount, setWordCount] = useState(1)
  const [exiting, setExiting] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const currentPhrase = phrases[phraseIndex] ?? ''
  const words = currentPhrase.split(' ')
  const visibleWords = shouldReduceMotion ? words : words.slice(0, wordCount)
  const restingAnimate = shouldReduceMotion
    ? { opacity: 1 }
    : { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }
  const exitAnimate = {
    opacity: 0,
    y: -6,
    filter: 'blur(2.5px)',
    transition: { duration: 0.26, ease: EXIT_EASE }
  }

  useEffect(() => {
    if (!loop && phraseIndex === phrases.length - 1) {
      return
    }

    if (shouldReduceMotion) {
      const holdId = setTimeout(() => {
        setPhraseIndex((prev) => {
          if (loop) {
            return (prev + 1) % phrases.length
          }

          return Math.min(prev + 1, phrases.length - 1)
        })
      }, interval)
      return () => clearTimeout(holdId)
    }

    setWordCount(1)
    setExiting(false)

    const buildTimers: ReturnType<typeof setTimeout>[] = []

    for (let i = 1; i < words.length; i++) {
      buildTimers.push(
        setTimeout(() => {
          setWordCount(i + 1)
        }, i * 430)
      )
    }

    const totalBuild = (words.length - 1) * 430 + 340
    const holdId = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length)
        setWordCount(1)
        setExiting(false)
      }, 260 + 220)
    }, totalBuild + interval)

    buildTimers.push(holdId)

    return () => {
      for (const t of buildTimers) {
        clearTimeout(t)
      }
    }
  }, [
    loop,
    phraseIndex,
    phrases.length,
    interval,
    shouldReduceMotion,
    words.length
  ])

  return (
    <span
      aria-live="polite"
      className={`flex ${className}`}
      style={{ gap: 10 }}
    >
      <AnimatePresence mode="popLayout">
        {visibleWords.map((word, i) => (
          <motion.span
            animate={exiting ? exitAnimate : restingAnimate}
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 0,
                    x: 88,
                    y: 6,
                    scale: 0.992,
                    filter: 'blur(3.5px)'
                  }
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: word position is the stable identity within a phrase
            key={`${phraseIndex}-${i}`}
            layout
            style={{ display: 'inline-block' }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: i === 0 ? 0.34 : 0.43,
                    ease: BUILD_EASE,
                    layout: { duration: 0.43, ease: BUILD_EASE }
                  }
            }
          >
            {word}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
}
