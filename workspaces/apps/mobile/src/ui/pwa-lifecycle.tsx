import { SmoothButton } from '@repo/react/ui/smooth-button'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

import {
  pwaOfflineReadyAtom,
  pwaUpdateAvailableAtom,
  setOnlineAtom,
  setPwaOfflineReadyAtom,
  setPwaUpdateAvailableAtom,
  setStandaloneAtom
} from '../state/conversation-atoms'

export function PwaLifecycle() {
  const offlineReady = useAtomValue(pwaOfflineReadyAtom)
  const updateAvailable = useAtomValue(pwaUpdateAvailableAtom)
  const setOfflineReady = useSetAtom(setPwaOfflineReadyAtom)
  const setOnline = useSetAtom(setOnlineAtom)
  const setStandalone = useSetAtom(setStandaloneAtom)
  const setUpdateAvailable = useSetAtom(setPwaUpdateAvailableAtom)
  const {
    offlineReady: [serviceWorkerOfflineReady],
    needRefresh: [serviceWorkerNeedsRefresh],
    updateServiceWorker
  } = useRegisterSW()

  useEffect(() => {
    setOfflineReady(serviceWorkerOfflineReady)
  }, [serviceWorkerOfflineReady, setOfflineReady])

  useEffect(() => {
    setUpdateAvailable(serviceWorkerNeedsRefresh)
  }, [serviceWorkerNeedsRefresh, setUpdateAvailable])

  useEffect(() => {
    function updateOnlineState() {
      setOnline(window.navigator.onLine)
    }

    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)

    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [setOnline])

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const navigatorWithStandalone = window.navigator as Navigator & {
      standalone?: boolean
    }

    function updateStandaloneState() {
      setStandalone(
        standaloneQuery.matches || navigatorWithStandalone.standalone === true
      )
    }

    updateStandaloneState()
    standaloneQuery.addEventListener('change', updateStandaloneState)

    return () => {
      standaloneQuery.removeEventListener('change', updateStandaloneState)
    }
  }, [setStandalone])

  if (!(offlineReady || updateAvailable)) {
    return null
  }

  return (
    <output
      aria-live="polite"
      className="fixed top-[calc(env(safe-area-inset-top)+5.25rem)] right-3 left-3 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-xl"
    >
      <span className="m-0 font-medium">
        {updateAvailable
          ? 'Uma nova versão está disponível.'
          : 'O Amarelo está pronto para uso offline.'}
      </span>
      {updateAvailable ? (
        <SmoothButton
          className="shrink-0"
          color="accent"
          onClick={() => updateServiceWorker(true)}
          size="sm"
          variant="solid"
        >
          Atualizar
        </SmoothButton>
      ) : (
        <SmoothButton
          className="shrink-0"
          color="neutral"
          onClick={() => {
            setOfflineReady(false)
            window.requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>('#conversation-theme-button')
                ?.focus()
            })
          }}
          size="sm"
          variant="ghost"
        >
          OK
        </SmoothButton>
      )}
    </output>
  )
}
