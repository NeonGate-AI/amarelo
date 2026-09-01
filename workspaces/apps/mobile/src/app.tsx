import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'

import { ConversationScreen } from './ui/conversation-screen'
import { PwaLifecycle } from './ui/pwa-lifecycle'
import {
  type ColorTheme,
  resolvedThemeAtom,
  setSystemThemeAtom
} from './state/conversation-atoms'

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

  return (
    <>
      <ConversationScreen />
      <PwaLifecycle />
    </>
  )
}
