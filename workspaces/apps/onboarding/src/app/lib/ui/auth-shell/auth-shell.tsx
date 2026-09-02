import { LockKey } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'

import { ThemeToggle } from '@component/theme'

interface AuthShellProps {
  centered?: boolean
  children: ReactNode
  showThemeToggle?: boolean
}

export function AuthShell(props: AuthShellProps) {
  const { centered = false, children, showThemeToggle = false } = props

  return (
    <div className="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto] overflow-hidden">
      <span
        aria-hidden="true"
        className="fixed inset-0 -z-20 bg-[linear-gradient(rgb(18_18_17_/_2%)_1px,transparent_1px),linear-gradient(90deg,rgb(18_18_17_/_2%)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black,transparent_78%)] dark:bg-[linear-gradient(rgb(255_255_255_/_2%)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_2%)_1px,transparent_1px)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none fixed -right-32 -top-80 -z-10 aspect-square w-[min(36rem,70vw)] rounded-full bg-[rgb(250_215_21_/_12%)] blur-[8rem]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-[26rem] -left-40 -z-10 aspect-square w-[min(36rem,70vw)] rounded-full bg-[rgb(250_215_21_/_12%)] opacity-70 blur-[8rem]"
      />

      <header className="mx-auto flex min-h-[5.5rem] w-[min(calc(100%_-_2rem),92rem)] items-center justify-between max-[40rem]:min-h-[4.75rem]">
        <a
          aria-label="Amarelo, início"
          className="font-heading text-[1.55rem] font-extrabold tracking-[-.055em] text-foreground no-underline"
          href="/"
        >
          Amarelo
          <span aria-hidden="true" className="text-primary">
            .
          </span>
        </a>
        {showThemeToggle ? <ThemeToggle /> : null}
      </header>

      <main
        className={`mx-auto grid w-[min(calc(100%_-_2rem),92rem)] items-center py-8 pb-16 max-[40rem]:items-start max-[40rem]:py-5 max-[40rem]:pb-10 ${centered ? 'justify-items-center' : ''}`}
      >
        {children}
      </main>

      <footer className="flex min-h-[4.5rem] items-center justify-center gap-2 p-4 text-[.78rem] text-muted-foreground max-[40rem]:min-h-[3.75rem]">
        <LockKey
          aria-hidden="true"
          className="text-success"
          size={14}
          weight="fill"
        />
        Privado por padrão. Você controla o que compartilha.
      </footer>
    </div>
  )
}
