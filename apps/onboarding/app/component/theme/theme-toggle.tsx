'use client'

import { MoonStars, Sun } from '@phosphor-icons/react'
import type { MouseEvent } from 'react'

import styles from '@component/theme/theme-toggle.module.css'

export function ThemeToggle() {
  function handleThemeToggle(event: MouseEvent<HTMLButtonElement>) {
    const nextTheme = document.documentElement.classList.contains('dark')
      ? 'light'
      : 'dark'

    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem('amarelo-theme', nextTheme)
    // biome-ignore lint/suspicious/noDocumentCookie: Keeps the server-rendered theme aligned in browsers without Cookie Store API.
    document.cookie = `amarelo-theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`
    event.currentTarget.setAttribute(
      'aria-label',
      nextTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'
    )
  }

  return (
    <button
      aria-label="Alternar tema claro ou escuro"
      className={styles.toggle}
      type="button"
      onClick={handleThemeToggle}
    >
      <MoonStars aria-hidden="true" className={styles.moon} size={19} />
      <Sun aria-hidden="true" className={styles.sun} size={19} />
    </button>
  )
}
