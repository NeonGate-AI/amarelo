'use client'

import {
  Bell,
  ChatCircleDots,
  DotsNine,
  List,
  MagnifyingGlass,
  Moon,
  Question,
  ShieldCheck,
  Sun
} from '@phosphor-icons/react'
import type { ChangeEvent } from 'react'

import type { ConsoleTheme } from '@dashboard/lib/use-dashboard.hook'
import { Button } from '@repo/react/vendors/shadcn/button'

interface ConsoleHeaderProps {
  fullName: string
  initials: string
  isAppMenuOpen: boolean
  isProfileOpen: boolean
  onAppMenuToggle: () => void
  onProfileToggle: () => void
  onQueryChange: (value: string) => void
  onSidebarOpenChange: (open: boolean) => void
  onThemeToggle: () => void
  query: string
  theme: ConsoleTheme
}

export function ConsoleHeader(props: ConsoleHeaderProps) {
  const {
    fullName,
    initials,
    isAppMenuOpen,
    isProfileOpen,
    onAppMenuToggle,
    onProfileToggle,
    onQueryChange,
    onSidebarOpenChange,
    onThemeToggle,
    query,
    theme
  } = props

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    onQueryChange(event.currentTarget.value)
  }

  function handleSidebarOpen() {
    onSidebarOpenChange(true)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-24 border-b border-border bg-card/95 text-card-foreground backdrop-blur-xl">
      <div className="flex h-full shrink-0 items-center gap-3 px-4 xl:w-80 xl:px-10">
        <Button
          aria-label="Abrir menu"
          className="xl:hidden"
          onClick={handleSidebarOpen}
          size="icon"
          variant="ghost"
        >
          <List aria-hidden="true" size={24} />
        </Button>

        <a
          aria-label="Amarelo, início"
          className="text-4xl font-black tracking-[-0.08em] text-foreground"
          href="#inicio"
        >
          Amarelo<span className="text-primary">.</span>
        </a>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:gap-5 lg:px-8">
        <div className="relative hidden sm:block">
          <Button
            aria-expanded={isAppMenuOpen}
            aria-haspopup="menu"
            aria-label="Abrir experiências Amarelo"
            className="size-16 rounded-2xl"
            onClick={onAppMenuToggle}
            size="icon"
            variant="outline"
          >
            <DotsNine aria-hidden="true" size={27} weight="bold" />
          </Button>

          {isAppMenuOpen ? (
            <div
              aria-label="Experiências Amarelo"
              className="absolute left-0 top-20 w-64 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-[var(--shadow-soft)]"
              role="menu"
            >
              <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Experiências Amarelo
              </p>
              <a
                className="flex items-center gap-3 rounded-xl bg-accent px-3 py-3 text-sm font-semibold"
                href="#inicio"
                role="menuitem"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary font-black text-primary-foreground">
                  A
                </span>
                Memória e controle
              </a>
              <button
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                role="menuitem"
                type="button"
              >
                <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-card">
                  <ChatCircleDots aria-hidden="true" size={19} />
                </span>
                Conversa no app
              </button>
            </div>
          ) : null}
        </div>

        <label className="hidden h-14 min-w-0 max-w-2xl flex-1 items-center gap-3 rounded-2xl border border-input bg-background px-5 text-muted-foreground transition-colors focus-within:border-ring md:flex">
          <MagnifyingGlass aria-hidden="true" size={22} />
          <span className="sr-only">Buscar registros</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground"
            onChange={handleQueryChange}
            placeholder="Buscar registros"
            type="search"
            value={query}
          />
        </label>

        <nav
          aria-label="Ações da conta"
          className="ml-auto flex items-center gap-1 sm:gap-2"
        >
          <Button
            aria-label="Ajuda"
            className="hidden rounded-full sm:inline-flex"
            size="icon"
            title="Ajuda"
            variant="ghost"
          >
            <Question aria-hidden="true" size={25} />
          </Button>
          <Button
            aria-label={
              theme === 'light' ? 'Usar tema escuro' : 'Usar tema claro'
            }
            className="rounded-full"
            onClick={onThemeToggle}
            size="icon"
            title={theme === 'light' ? 'Usar tema escuro' : 'Usar tema claro'}
            variant="ghost"
          >
            {theme === 'light' ? (
              <Moon aria-hidden="true" size={24} />
            ) : (
              <Sun aria-hidden="true" size={24} />
            )}
          </Button>
          <Button
            aria-label="Notificações"
            className="relative hidden rounded-full sm:inline-flex"
            size="icon"
            title="Notificações"
            variant="ghost"
          >
            <Bell aria-hidden="true" size={25} />
            <span className="absolute right-2 top-1.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />
          </Button>

          <div className="relative ml-1">
            <button
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
              aria-label="Abrir perfil"
              className="flex size-12 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground transition-transform active:scale-95"
              onClick={onProfileToggle}
              type="button"
            >
              {initials}
            </button>

            {isProfileOpen ? (
              <div
                aria-label="Perfil"
                className="absolute right-0 top-16 w-60 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-[var(--shadow-soft)]"
                role="menu"
              >
                <div className="border-b border-border px-3 pb-3 pt-1">
                  <p className="font-bold">{fullName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Conta com dados de exemplo
                  </p>
                </div>
                <button
                  className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
                  role="menuitem"
                  type="button"
                >
                  <ShieldCheck aria-hidden="true" size={18} />
                  Privacidade e conta
                </button>
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  )
}
