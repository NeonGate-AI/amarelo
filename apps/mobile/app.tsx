import './global.css'

import { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthenticationScreen } from '@/features/auth/authentication-screen'
import { VoiceScreen } from '@/features/voice/voice-screen'

type AppScreen = 'authentication' | 'voice'

export function App() {
  const [screen, setScreen] = useState<AppScreen>('authentication')
  const { colorScheme } = useColorScheme()

  function handleAuthenticationContinue() {
    setScreen('voice')
  }

  function handleSessionEnd() {
    setScreen('authentication')
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {screen === 'authentication' ? (
        <AuthenticationScreen onContinue={handleAuthenticationContinue} />
      ) : (
        <VoiceScreen onEndSession={handleSessionEnd} />
      )}
    </SafeAreaProvider>
  )
}
