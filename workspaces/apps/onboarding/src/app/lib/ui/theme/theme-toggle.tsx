'use client'

import { MoonStars, Sun } from '@phosphor-icons/react'
import type { MouseEvent } from 'react'

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
      className="grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-[color-mix(in_srgb,var(--card)_88%,transparent)] p-0 text-foreground shadow-[0_.4rem_1.2rem_rgb(0_0_0_/_8%)] transition-[transform,border-color,background] duration-[180ms] hover:-translate-y-[.1rem] hover:border-primary hover:bg-card focus-visible:outline-[.2rem] focus-visible:outline-offset-[.2rem] focus-visible:outline-ring"
      type="button"
      onClick={handleThemeToggle}
    >
      <MoonStars
        aria-hidden="true"
        className="col-start-1 row-start-1 rotate-0 scale-100 opacity-100 transition-[opacity,transform] duration-[240ms] dark:rotate-[40deg] dark:scale-[.72] dark:opacity-0"
        size={19}
      />
      <Sun
        aria-hidden="true"
        className="col-start-1 row-start-1 -rotate-[40deg] scale-[.72] opacity-0 transition-[opacity,transform] duration-[240ms] dark:rotate-0 dark:scale-100 dark:opacity-100"
        size={19}
      />
    </button>
  )
}
