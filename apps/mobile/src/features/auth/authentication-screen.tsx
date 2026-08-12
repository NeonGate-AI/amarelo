import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ThemeControl } from '@/components/theme-control'
import { Button, Text } from '@repo/react-mobile/ui'

interface AuthenticationScreenProps {
  onContinue: () => void
}

export function AuthenticationScreen(props: AuthenticationScreenProps) {
  const { onContinue } = props

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <View className="items-end">
        <ThemeControl />
      </View>

      <View className="flex-1 justify-center gap-8 pb-12">
        <View className="gap-4">
          <Text className="text-sm font-semibold tracking-[3px] text-muted-foreground">
            AMARELO
          </Text>
          <Text
            accessibilityRole="header"
            className="max-w-sm text-5xl font-semibold leading-[52px] text-foreground"
          >
            Um espaço para falar.
          </Text>
          <Text className="max-w-md text-lg leading-7 text-muted-foreground">
            Esta é uma prévia local. Nenhuma conta será criada e nenhuma
            conversa será enviada para um servidor.
          </Text>
        </View>

        <View className="gap-3">
          <Button
            accessibilityHint="Abre a experiência de voz do protótipo"
            onPress={onContinue}
            size="lg"
          >
            <Text>Entrar no protótipo</Text>
          </Button>
          <Button
            accessibilityHint="Abre a mesma experiência local sem criar uma conta"
            onPress={onContinue}
            size="lg"
            variant="outline"
          >
            <Text>Criar acesso de teste</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  )
}
