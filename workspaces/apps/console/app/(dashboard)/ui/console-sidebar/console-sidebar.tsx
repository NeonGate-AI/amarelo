'use client'

import {
  ChatsCircle,
  House,
  Notebook,
  Plus,
  Question,
  ShieldCheck,
  UsersThree,
  X
} from '@phosphor-icons/react'
import type { MouseEvent, ReactNode } from 'react'

import { dashboardData } from '@dashboard/lib/dashboard.data'
import { Button } from '@repo/react/vendors/shadcn/button'

interface ConsoleSidebarProps {
  activeNavigation: string
  isOpen: boolean
  onActiveNavigationChange: (label: string) => void
  onEntryOpenChange: (open: boolean) => void
  onSidebarOpenChange: (open: boolean) => void
}

export function ConsoleSidebar(props: ConsoleSidebarProps) {
  const {
    activeNavigation,
    isOpen,
    onActiveNavigationChange,
    onEntryOpenChange,
    onSidebarOpenChange
  } = props

  function handleNavigationClick(event: MouseEvent<HTMLButtonElement>) {
    const label = event.currentTarget.dataset.label

    if (label) {
      onActiveNavigationChange(label)
    }
  }

  function handleEntryOpen() {
    onEntryOpenChange(true)
  }

  function handleSidebarClose() {
    onSidebarOpenChange(false)
  }

  return (
    <>
      <button
        aria-label="Fechar menu"
        className={`fixed inset-0 z-40 bg-black/35 backdrop-blur-sm transition-opacity xl:hidden ${
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={handleSidebarClose}
        type="button"
      />

      <aside
        aria-label="Navegação principal"
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-80 flex-col border-r border-sidebar-border bg-sidebar px-7 pb-7 pt-7 text-sidebar-foreground transition-transform duration-200 xl:top-24 xl:z-30 xl:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between xl:hidden">
          <span className="text-3xl font-black tracking-[-0.08em] text-foreground">
            Amarelo<span className="text-primary">.</span>
          </span>
          <Button
            aria-label="Fechar menu"
            onClick={handleSidebarClose}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" size={22} />
          </Button>
        </div>

        <Button
          className="w-full justify-center shadow-[0_0.75rem_2rem_rgb(250_215_21_/_22%)]"
          onClick={handleEntryOpen}
          size="lg"
          variant="gold"
        >
          <Plus aria-hidden="true" size={24} weight="bold" />
          Novo registro
        </Button>

        <nav className="mt-10 flex flex-col gap-2">
          {dashboardData.navigation.map((item) => {
            const isActive = activeNavigation === item.label

            return (
              <button
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-16 w-full items-center gap-4 rounded-xl px-5 text-left text-lg transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent font-semibold text-foreground'
                    : 'text-sidebar-foreground hover:bg-secondary hover:text-foreground'
                }`}
                data-label={item.label}
                key={item.label}
                onClick={handleNavigationClick}
                type="button"
              >
                <span
                  className={
                    isActive ? 'text-primary-emphasis' : 'text-muted-foreground'
                  }
                >
                  {getNavigationIcon(item.icon, isActive)}
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-sidebar-border pt-7">
          <button
            className="flex h-14 w-full items-center gap-4 rounded-xl px-5 text-left text-lg text-sidebar-foreground transition-colors hover:bg-secondary hover:text-foreground"
            type="button"
          >
            <Question aria-hidden="true" size={24} />
            Ajuda e limites
          </button>
        </div>
      </aside>
    </>
  )
}

function getNavigationIcon(icon: string, isActive: boolean): ReactNode {
  const weight = isActive ? 'bold' : 'regular'

  switch (icon) {
    case 'conversations':
      return <ChatsCircle size={25} weight={weight} />
    case 'journal':
      return <Notebook size={25} weight={weight} />
    case 'network':
      return <UsersThree size={25} weight={weight} />
    case 'privacy':
      return <ShieldCheck size={25} weight={weight} />
    default:
      return <House size={25} weight={weight} />
  }
}
