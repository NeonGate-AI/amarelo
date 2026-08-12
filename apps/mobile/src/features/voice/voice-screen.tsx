import { useCallback, useEffect } from 'react'
import { Linking, View } from 'react-native'
import { X } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AgentOrb } from '@/components/agent-orb/agent-orb'
import { ThemeControl } from '@/components/theme-control'
import { useVoiceSession } from '@/features/voice/use-voice-session.hook'
import type { VoiceSessionState } from '@/features/voice/voice-session.type'
import { Button, Icon, Text } from '@repo/react-mobile/ui'

interface VoiceScreenProps {
  onEndSession: () => void
}

const STATE_LABELS: Record<VoiceSessionState, string> = {
  idle: 'Preparando o microfone…',
  listening: 'Estou ouvindo',
  thinking: 'Pensando',
  speaking: 'Falando',
  error: 'O microfone precisa da sua atenção'
}

export function VoiceScreen(props: VoiceScreenProps) {
  const { onEndSession } = props

  const { amplitude, error, recoveryAction, start, state, stop } =
    useVoiceSession()

  useEffect(() => {
    void start()

    return stop
  }, [start, stop])

  const handleEndSession = useCallback(() => {
    stop()
    onEndSession()
  }, [onEndSession, stop])

  function handleRecovery() {
    if (recoveryAction === 'settings') {
      void Linking.openSettings().catch(() => undefined)
      return
    }

    void start()
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <View className="items-end">
        <ThemeControl />
      </View>

      <View className="flex-1 items-center justify-center gap-8 pb-4">
        <AgentOrb amplitude={amplitude} state={state} />

        <View className="max-w-sm items-center gap-3 px-4">
          <Text
            accessibilityLiveRegion="polite"
            className="text-center text-2xl font-semibold text-foreground"
          >
            {STATE_LABELS[state]}
          </Text>
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              className="text-center text-base leading-6 text-muted-foreground"
            >
              {error}
            </Text>
          ) : (
            <Text className="text-center text-base leading-6 text-muted-foreground">
              O áudio é usado só para mover o Orb e não é salvo nesta prévia.
            </Text>
          )}
          {state === 'error' ? (
            <Button onPress={handleRecovery} variant="outline">
              <Text>
                {recoveryAction === 'settings'
                  ? 'Abrir ajustes'
                  : 'Tentar novamente'}
              </Text>
            </Button>
          ) : null}
        </View>
      </View>

      <View className="items-center pb-5">
        <Button
          accessibilityHint="Interrompe o microfone e volta à tela inicial"
          accessibilityLabel="Encerrar sessão"
          onPress={handleEndSession}
          size="icon"
          variant="outline"
        >
          <Icon aria-hidden as={X} className="text-foreground" size={24} />
        </Button>
      </View>
    </SafeAreaView>
  )
}
