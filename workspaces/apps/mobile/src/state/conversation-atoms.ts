import { atom } from 'jotai'

export type ColorTheme = 'dark' | 'light'
export type ConversationPhase = 'ended' | 'listening' | 'speaking'
export type ExperienceState = ConversationPhase | 'muted'
export type PreviewState = 'ended' | 'listening' | 'muted' | 'speaking'
export type ThemePreference = ColorTheme | 'system'

export interface CaptionContent {
  accessible: string
  lines: readonly string[]
}

const DEFAULT_VOLUME = 68
const STORAGE_PREFIX = 'amarelo:pwa:v1'

const themePreferenceStorageKey = `${STORAGE_PREFIX}:theme`
const volumeStorageKey = `${STORAGE_PREFIX}:volume`
const lastAudibleVolumeStorageKey = `${STORAGE_PREFIX}:last-audible-volume`

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system'
}

function isVolume(value: unknown): value is number {
  return Number.isFinite(value) && Number(value) >= 0 && Number(value) <= 100
}

function isAudibleVolume(value: unknown): value is number {
  return isVolume(value) && value > 0
}

function readStoredValue<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T
): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const storedValue = window.localStorage.getItem(key)
    if (storedValue === null) {
      return fallback
    }

    const parsedValue: unknown = JSON.parse(storedValue)
    return validate(parsedValue) ? parsedValue : fallback
  } catch {
    return fallback
  }
}

function persistValue(key: string, value: number | ThemePreference) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Preferences remain functional in memory when storage is unavailable.
  }
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME
  }

  return Math.round(Math.min(100, Math.max(0, value)))
}

function readSystemTheme(): ColorTheme {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }

  return 'light'
}

function readStandaloneMode() {
  if (typeof window === 'undefined') {
    return false
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  )
}

const listeningCaption: CaptionContent = {
  accessible:
    'Fala da Ana: Como você está se sentindo neste momento? Quero entender o que tem passado pela sua cabeça.',
  lines: [
    'Como você está se sentindo',
    'neste momento? Quero entender',
    'o que tem passado pela sua cabeça.'
  ]
}

const speakingCaptions: readonly CaptionContent[] = [
  {
    accessible:
      'Fala da Ana: Eu entendo. Vamos organizar isso juntos, começando pelo que parece mais urgente agora.',
    lines: [
      'Eu entendo. Vamos organizar isso',
      'juntos, começando pelo que parece',
      'mais urgente agora.'
    ]
  },
  {
    accessible:
      'Fala da Ana: Você não precisa resolver tudo de uma vez. Podemos olhar primeiro para o que está mais presente.',
    lines: [
      'Você não precisa resolver tudo',
      'de uma vez. Podemos olhar primeiro',
      'para o que está mais presente.'
    ]
  },
  {
    accessible:
      'Fala da Ana: Respira no seu ritmo. Eu vou acompanhar cada parte do que você quiser colocar em palavras.',
    lines: [
      'Respira no seu ritmo. Eu vou',
      'acompanhar cada parte do que você',
      'quiser colocar em palavras.'
    ]
  },
  {
    accessible:
      'Fala da Ana: O que você está sentindo faz sentido dentro do que viveu hoje. Vamos observar isso com calma.',
    lines: [
      'O que você está sentindo faz sentido',
      'dentro do que viveu hoje. Vamos',
      'observar isso com calma.'
    ]
  },
  {
    accessible:
      'Fala da Ana: Quando estiver pronto, me conte qual pensamento está pedindo mais espaço neste momento.',
    lines: [
      'Quando estiver pronto, me conte',
      'qual pensamento está pedindo mais',
      'espaço neste momento.'
    ]
  }
] as const

const mutedCaption: CaptionContent = {
  accessible:
    'Fala da Ana: Mesmo sem o áudio, você pode acompanhar a minha fala inteira pela transcrição desta conversa.',
  lines: [
    'Mesmo sem o áudio, você pode',
    'acompanhar a minha fala inteira',
    'pela transcrição desta conversa.'
  ]
}

const initialVolume = readStoredValue(
  volumeStorageKey,
  DEFAULT_VOLUME,
  isVolume
)

export const themePreferenceAtom = atom<ThemePreference>(
  readStoredValue(themePreferenceStorageKey, 'system', isThemePreference)
)
export const systemThemeAtom = atom<ColorTheme>(readSystemTheme())
export const volumeAtom = atom(initialVolume)
export const lastAudibleVolumeAtom = atom(
  readStoredValue(lastAudibleVolumeStorageKey, DEFAULT_VOLUME, isAudibleVolume)
)
export const microphoneMutedAtom = atom(initialVolume === 0)
export const conversationPhaseAtom = atom<ConversationPhase>('speaking')
export const captionIndexAtom = atom(0)
export const onlineAtom = atom(
  typeof navigator === 'undefined' ? true : navigator.onLine
)
export const standaloneAtom = atom(readStandaloneMode())
export const pwaOfflineReadyAtom = atom(false)
export const pwaUpdateAvailableAtom = atom(false)

export const resolvedThemeAtom = atom<ColorTheme>((get) => {
  const preference = get(themePreferenceAtom)
  return preference === 'system' ? get(systemThemeAtom) : preference
})

export const speakerMutedAtom = atom((get) => get(volumeAtom) === 0)
export const conversationMutedAtom = atom(
  (get) => get(microphoneMutedAtom) || get(speakerMutedAtom)
)
export const sessionOpenAtom = atom(
  (get) => get(conversationPhaseAtom) !== 'ended'
)

export const experienceStateAtom = atom<ExperienceState>((get) => {
  const phase = get(conversationPhaseAtom)
  if (phase === 'ended') {
    return 'ended'
  }

  if (get(conversationMutedAtom)) {
    return 'muted'
  }

  return phase
})

export const statusLabelAtom = atom((get) => {
  const state = get(experienceStateAtom)

  switch (state) {
    case 'ended':
      return 'Conversa encerrada'
    case 'listening':
      return 'Ana está ouvindo você'
    case 'muted':
      return 'Conversa silenciada'
    case 'speaking':
      return 'Ana está falando'
  }
})

export const captionAtom = atom<CaptionContent | null>((get) => {
  const state = get(experienceStateAtom)

  switch (state) {
    case 'ended':
      return null
    case 'muted':
      return mutedCaption
    case 'speaking':
      return speakingCaptions[get(captionIndexAtom)] ?? speakingCaptions[0]
    case 'listening':
      return listeningCaption
  }
})

export const orbStateAtom = atom<'idle' | 'listening' | 'speaking' | null>(
  (get) => {
    const state = get(experienceStateAtom)

    switch (state) {
      case 'ended':
        return null
      case 'muted':
        return 'idle'
      case 'listening':
        return 'listening'
      case 'speaking':
        return 'speaking'
    }
  }
)

export const setSystemThemeAtom = atom(null, (_get, set, theme: ColorTheme) => {
  set(systemThemeAtom, theme)
})

export const toggleThemeAtom = atom(null, (get, set) => {
  const nextTheme: ColorTheme =
    get(resolvedThemeAtom) === 'light' ? 'dark' : 'light'
  set(themePreferenceAtom, nextTheme)
  persistValue(themePreferenceStorageKey, nextTheme)
})

export const setVolumeAtom = atom(null, (get, set, input: number) => {
  const nextVolume = clampVolume(input)
  const currentVolume = get(volumeAtom)

  if (nextVolume === 0) {
    if (currentVolume > 0) {
      set(lastAudibleVolumeAtom, currentVolume)
      persistValue(lastAudibleVolumeStorageKey, currentVolume)
    }
    set(volumeAtom, 0)
    set(microphoneMutedAtom, true)
    persistValue(volumeStorageKey, 0)
    return
  }

  set(volumeAtom, nextVolume)
  set(lastAudibleVolumeAtom, nextVolume)
  set(microphoneMutedAtom, false)
  if (get(conversationPhaseAtom) !== 'ended') {
    set(conversationPhaseAtom, 'listening')
  }
  persistValue(volumeStorageKey, nextVolume)
  persistValue(lastAudibleVolumeStorageKey, nextVolume)
})

export const toggleConversationAudioAtom = atom(null, (get, set) => {
  if (get(conversationMutedAtom)) {
    const restoredVolume = get(lastAudibleVolumeAtom)
    set(microphoneMutedAtom, false)
    set(volumeAtom, restoredVolume)
    set(conversationPhaseAtom, 'listening')
    persistValue(volumeStorageKey, restoredVolume)
    return
  }

  const currentVolume = get(volumeAtom)
  if (currentVolume > 0) {
    set(lastAudibleVolumeAtom, currentVolume)
    persistValue(lastAudibleVolumeStorageKey, currentVolume)
  }
  set(microphoneMutedAtom, true)
  set(volumeAtom, 0)
  persistValue(volumeStorageKey, 0)
})

export const endConversationAtom = atom(null, (_get, set) => {
  set(conversationPhaseAtom, 'ended')
})

export const restartConversationAtom = atom(null, (get, set) => {
  const restoredVolume = get(lastAudibleVolumeAtom)
  set(conversationPhaseAtom, 'speaking')
  set(captionIndexAtom, 0)
  set(microphoneMutedAtom, false)
  set(volumeAtom, restoredVolume)
  persistValue(volumeStorageKey, restoredVolume)
})

export const applyPreviewStateAtom = atom(
  null,
  (get, set, previewState: PreviewState) => {
    const audibleVolume = get(lastAudibleVolumeAtom)

    switch (previewState) {
      case 'ended':
        set(conversationPhaseAtom, 'ended')
        return
      case 'muted':
        set(conversationPhaseAtom, 'listening')
        set(captionIndexAtom, 0)
        set(microphoneMutedAtom, true)
        set(volumeAtom, 0)
        return
      case 'speaking':
        set(conversationPhaseAtom, 'speaking')
        set(captionIndexAtom, 0)
        set(microphoneMutedAtom, false)
        set(volumeAtom, audibleVolume)
        return
      case 'listening':
        set(conversationPhaseAtom, 'listening')
        set(captionIndexAtom, 0)
        set(microphoneMutedAtom, false)
        set(volumeAtom, audibleVolume)
    }
  }
)

export const advanceSpeakingCaptionAtom = atom(null, (get, set) => {
  if (get(experienceStateAtom) !== 'speaking') {
    return
  }

  set(captionIndexAtom, (get(captionIndexAtom) + 1) % speakingCaptions.length)
})

export const setOnlineAtom = atom(null, (_get, set, online: boolean) => {
  set(onlineAtom, online)
})

export const setStandaloneAtom = atom(
  null,
  (_get, set, standalone: boolean) => {
    set(standaloneAtom, standalone)
  }
)

export const setPwaOfflineReadyAtom = atom(
  null,
  (_get, set, ready: boolean) => {
    set(pwaOfflineReadyAtom, ready)
  }
)

export const setPwaUpdateAvailableAtom = atom(
  null,
  (_get, set, available: boolean) => {
    set(pwaUpdateAvailableAtom, available)
  }
)
