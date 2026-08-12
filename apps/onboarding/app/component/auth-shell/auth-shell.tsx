import { LockKey } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'

import { ThemeToggle } from '@component/theme/theme-toggle'

import styles from '@component/auth-shell/auth-shell.module.css'

interface AuthShellProps {
  centered?: boolean
  children: ReactNode
  showThemeToggle?: boolean
}

export function AuthShell(props: AuthShellProps) {
  const { centered = false, children, showThemeToggle = false } = props

  return (
    <div className={styles.shell}>
      <span aria-hidden="true" className={`${styles.glow} ${styles.glowOne}`} />
      <span aria-hidden="true" className={`${styles.glow} ${styles.glowTwo}`} />

      <header className={styles.header}>
        <a aria-label="Amarelo, início" className={styles.brand} href="/">
          Amarelo<span aria-hidden="true">.</span>
        </a>
        {showThemeToggle ? <ThemeToggle /> : null}
      </header>

      <main className={`${styles.main} ${centered ? styles.centered : ''}`}>
        {children}
      </main>

      <footer className={styles.footer}>
        <LockKey aria-hidden="true" size={14} weight="fill" />
        Privado por padrão. Você controla o que compartilha.
      </footer>
    </div>
  )
}
