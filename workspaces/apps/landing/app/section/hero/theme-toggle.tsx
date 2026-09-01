'use client'

import { MoonStars, Sun } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  function handleThemeToggle() {
    const nextTheme = theme === 'light' ? 'dark' : 'light'

    setTheme(nextTheme)
    applyTheme(nextTheme)
    window.localStorage.setItem('amarelo-theme', nextTheme)
  }

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('amarelo-theme')
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'
    const initialTheme =
      storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : preferredTheme

    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  return (
    <button
      aria-label={theme === 'light' ? 'Usar tema escuro' : 'Usar tema claro'}
      aria-pressed={theme === 'dark'}
      className="inline-grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-[color-mix(in_srgb,var(--card)_78%,transparent)] text-foreground [transition:background-color_160ms_ease,border-color_160ms_ease] hover:border-ring hover:bg-card motion-reduce:transition-none"
      title={theme === 'light' ? 'Usar tema escuro' : 'Usar tema claro'}
      type="button"
      onClick={handleThemeToggle}
    >
      {theme === 'light' ? (
        <MoonStars aria-hidden="true" size={19} />
      ) : (
        <Sun aria-hidden="true" size={19} />
      )}
    </button>
  )
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
}
