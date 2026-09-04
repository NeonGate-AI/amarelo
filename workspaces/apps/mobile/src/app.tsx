import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'

import { validateDevelopmentConversationConfiguration } from '@/conversation'
import {
  ConversationScreen,
  DevelopmentConversationView,
  PwaLifecycle
} from '@/ui'
import { type ColorTheme, resolvedThemeAtom, setSystemThemeAtom } from './state'

function useThemeBridge() {
  const resolvedTheme = useAtomValue(resolvedThemeAtom)
  const setSystemTheme = useSetAtom(setSystemThemeAtom)

  useEffect(() => {
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function updateSystemTheme() {
      const nextTheme: ColorTheme = colorSchemeQuery.matches ? 'dark' : 'light'
      setSystemTheme(nextTheme)
    }

    updateSystemTheme()
    colorSchemeQuery.addEventListener('change', updateSystemTheme)

    return () => {
      colorSchemeQuery.removeEventListener('change', updateSystemTheme)
    }
  }, [setSystemTheme])

  useEffect(() => {
    const root = document.documentElement
    const themeColor =
      document.querySelector<HTMLMetaElement>('#app-theme-color')

    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.dataset.theme = resolvedTheme
    root.style.colorScheme = resolvedTheme
    themeColor?.setAttribute(
      'content',
      resolvedTheme === 'dark' ? '#121211' : '#F9F8F2'
    )
  }, [resolvedTheme])
}

export function App() {
  useThemeBridge()
  const configuration = validateDevelopmentConversationConfiguration(
    import.meta.env
  )

  return (
    <>
      {configuration.enabled ? (
        <DevelopmentConversationView configuration={configuration} />
      ) : (
        <ConversationScreen />
      )}
      <PwaLifecycle />
    </>
  )
}
