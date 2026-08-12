import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { AMARELO_COLORS } from '@/design/theme.data'
import type { VoiceSessionState } from '@/features/voice/voice-session.type'

interface OrbPalette {
  primary: [string, string, string]
  secondary: [string, string]
  glow: string
}

interface AgentOrbProps {
  amplitude?: number
  state?: VoiceSessionState
}

const ORB_PALETTES: Record<VoiceSessionState, OrbPalette> = {
  idle: {
    primary: [AMARELO_COLORS.yellow, AMARELO_COLORS.cream, AMARELO_COLORS.pink],
    secondary: [AMARELO_COLORS.white, AMARELO_COLORS.yellow],
    glow: AMARELO_COLORS.yellow
  },
  listening: {
    primary: [
      AMARELO_COLORS.turquoise,
      AMARELO_COLORS.blue,
      AMARELO_COLORS.yellow
    ],
    secondary: [AMARELO_COLORS.white, AMARELO_COLORS.turquoise],
    glow: AMARELO_COLORS.turquoise
  },
  thinking: {
    primary: [
      AMARELO_COLORS.purple,
      AMARELO_COLORS.blue,
      AMARELO_COLORS.yellow
    ],
    secondary: [AMARELO_COLORS.pink, AMARELO_COLORS.white],
    glow: AMARELO_COLORS.purple
  },
  speaking: {
    primary: [AMARELO_COLORS.yellow, AMARELO_COLORS.coral, AMARELO_COLORS.pink],
    secondary: [AMARELO_COLORS.white, AMARELO_COLORS.yellow],
    glow: AMARELO_COLORS.coral
  },
  error: {
    primary: [AMARELO_COLORS.coral, AMARELO_COLORS.pink, AMARELO_COLORS.ink],
    secondary: [AMARELO_COLORS.white, AMARELO_COLORS.coral],
    glow: AMARELO_COLORS.coral
  }
}

const ROTATION_DURATION: Record<VoiceSessionState, number> = {
  idle: 12_000,
  listening: 7_000,
  thinking: 4_500,
  speaking: 5_500,
  error: 14_000
}

const STATE_SCALE: Record<VoiceSessionState, number> = {
  idle: 0.98,
  listening: 1,
  thinking: 1.02,
  speaking: 1.04,
  error: 0.96
}

export function AgentOrb(props: AgentOrbProps) {
  const { amplitude = 0, state = 'idle' } = props

  const { width } = useWindowDimensions()
  const [reduceMotion, setReduceMotion] = useState(false)
  const rotation = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(STATE_SCALE[state])).current
  const glowOpacity = useRef(new Animated.Value(0.2)).current
  const size = Math.min(280, Math.max(196, width * 0.62))
  const palette = ORB_PALETTES[state]

  useEffect(() => {
    let isMounted = true

    void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (isMounted) {
        setReduceMotion(isEnabled)
      }
    })
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    )

    return () => {
      isMounted = false
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    rotation.stopAnimation()
    rotation.setValue(0)

    if (reduceMotion) {
      return
    }

    const animation = Animated.loop(
      Animated.timing(rotation, {
        duration: ROTATION_DURATION[state],
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true
      })
    )
    animation.start()

    return () => animation.stop()
  }, [reduceMotion, rotation, state])

  useEffect(() => {
    const normalizedAmplitude = Math.min(1, Math.max(0, amplitude))
    const targetScale = reduceMotion
      ? STATE_SCALE[state]
      : STATE_SCALE[state] + normalizedAmplitude * 0.13
    const scaleAnimation = Animated.spring(scale, {
      damping: 13,
      mass: 0.45,
      stiffness: 210,
      toValue: targetScale,
      useNativeDriver: true
    })
    const glowAnimation = Animated.timing(glowOpacity, {
      duration: reduceMotion ? 0 : 100,
      toValue: state === 'error' ? 0.36 : 0.18 + normalizedAmplitude * 0.34,
      useNativeDriver: true
    })

    scaleAnimation.start()
    glowAnimation.start()

    return () => {
      scaleAnimation.stop()
      glowAnimation.stop()
    }
  }, [amplitude, glowOpacity, reduceMotion, scale, state])

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  })

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { height: size, width: size }]}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: palette.glow,
            opacity: glowOpacity,
            transform: [{ scale }]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            transform: [{ rotate }, { scale }]
          }
        ]}
      >
        <LinearGradient
          colors={palette.primary}
          end={{ x: 0.95, y: 0.85 }}
          start={{ x: 0.12, y: 0.08 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={palette.secondary}
          end={{ x: 0.15, y: 0.9 }}
          start={{ x: 0.8, y: 0.1 }}
          style={[StyleSheet.absoluteFill, styles.secondaryGradient]}
        />
        <View style={styles.highlight} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  glow: {
    borderRadius: 999,
    height: '82%',
    position: 'absolute',
    width: '82%'
  },
  highlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.33)',
    borderRadius: 999,
    height: '34%',
    left: '18%',
    position: 'absolute',
    top: '14%',
    transform: [{ rotate: '-18deg' }],
    width: '18%'
  },
  orb: {
    borderRadius: 999,
    height: '72%',
    overflow: 'hidden',
    width: '72%'
  },
  secondaryGradient: {
    opacity: 0.54,
    transform: [{ rotate: '52deg' }, { scale: 1.24 }]
  }
})
