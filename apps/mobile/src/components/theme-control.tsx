import { Moon, Sun } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'

import { Button, Icon } from '@repo/react-mobile/ui'

export function ThemeControl() {
  const { colorScheme, setColorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const label = isDark ? 'Usar tema claro' : 'Usar tema escuro'

  function handleThemeChange() {
    setColorScheme(isDark ? 'light' : 'dark')
  }

  return (
    <Button
      accessibilityHint="Alterna a aparência do aplicativo"
      accessibilityLabel={label}
      onPress={handleThemeChange}
      size="icon"
      variant="ghost"
    >
      <Icon
        aria-hidden
        as={isDark ? Sun : Moon}
        className="text-foreground"
        size={22}
      />
    </Button>
  )
}
