import { createStore, Provider } from 'jotai'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'
import { applyPreviewStateAtom, type PreviewState } from './state'
import './styles.css'

function isPreviewState(value: string | null): value is PreviewState {
  return (
    value === 'ended' ||
    value === 'listening' ||
    value === 'muted' ||
    value === 'speaking'
  )
}

const rootElement = document.querySelector<HTMLDivElement>('#root')

if (!rootElement) {
  throw new Error('Missing #root element')
}

const appStore = createStore()
const requestedState = new URLSearchParams(window.location.search).get('state')
const initialState = isPreviewState(requestedState)
  ? requestedState
  : 'speaking'

appStore.set(applyPreviewStateAtom, initialState)

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={appStore}>
      <App />
    </Provider>
  </StrictMode>
)
