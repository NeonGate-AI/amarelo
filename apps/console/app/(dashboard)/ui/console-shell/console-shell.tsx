'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'
import type { ChangeEvent } from 'react'

import { dashboardMock } from '@dashboard/lib/dashboard.mock'
import { ActivityTable } from '@dashboard/ui/activity-table/activity-table'
import { AgentCard } from '@dashboard/ui/agent-card/agent-card'
import { ConsoleHeader } from '@dashboard/ui/console-header/console-header'
import { ConsoleSidebar } from '@dashboard/ui/console-sidebar/console-sidebar'
import { MetricCard } from '@dashboard/ui/metric-card/metric-card'
import { NewEntryDialog } from '@dashboard/ui/new-entry-dialog/new-entry-dialog'
import { TrendChartCard } from '@dashboard/ui/trend-chart-card/trend-chart-card'
import { useDashboard } from '@dashboard/lib/use-dashboard.hook'

export function ConsoleShell() {
  const {
    activeNavigation,
    filteredActivities,
    handleActiveNavigationChange,
    handleAppMenuToggle,
    handleEntryOpenChange,
    handleProfileToggle,
    handleQueryChange,
    handleSidebarOpenChange,
    handleThemeToggle,
    isAppMenuOpen,
    isEntryOpen,
    isProfileOpen,
    isSidebarOpen,
    query,
    theme
  } = useDashboard()

  function handleMobileQueryChange(event: ChangeEvent<HTMLInputElement>) {
    handleQueryChange(event.currentTarget.value)
  }

  function handleShowAll() {
    handleQueryChange('')
  }

  return (
    <div className="min-h-svh bg-background text-foreground transition-colors duration-200">
      <ConsoleHeader
        fullName={dashboardMock.user.fullName}
        initials={dashboardMock.user.initials}
        isAppMenuOpen={isAppMenuOpen}
        isProfileOpen={isProfileOpen}
        onAppMenuToggle={handleAppMenuToggle}
        onProfileToggle={handleProfileToggle}
        onQueryChange={handleQueryChange}
        onSidebarOpenChange={handleSidebarOpenChange}
        onThemeToggle={handleThemeToggle}
        query={query}
        theme={theme}
      />

      <ConsoleSidebar
        activeNavigation={activeNavigation}
        isOpen={isSidebarOpen}
        onActiveNavigationChange={handleActiveNavigationChange}
        onEntryOpenChange={handleEntryOpenChange}
        onSidebarOpenChange={handleSidebarOpenChange}
      />

      <main className="min-h-svh pt-24 xl:pl-80" id="inicio">
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-7 sm:px-6 sm:pt-9 lg:px-8">
          <header>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Olá, {dashboardMock.user.firstName}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground sm:text-xl">
              Seu contexto, suas escolhas.
            </p>
          </header>

          <label className="mt-6 flex h-13 items-center gap-3 rounded-xl border border-input bg-card px-4 text-muted-foreground md:hidden">
            <MagnifyingGlass aria-hidden="true" size={20} />
            <span className="sr-only">Buscar registros</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground"
              onChange={handleMobileQueryChange}
              placeholder="Buscar registros"
              type="search"
              value={query}
            />
          </label>

          <section
            aria-label="Visão geral desta semana"
            className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-12"
          >
            <div className="lg:col-span-7">
              <TrendChartCard trend={dashboardMock.trend} />
            </div>
            <div className="lg:col-span-5">
              <AgentCard agents={dashboardMock.agents} />
            </div>
          </section>

          <section
            aria-label="Indicadores"
            className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            {dashboardMock.metrics.map((metric) => (
              <MetricCard
                icon={metric.icon}
                key={metric.id}
                label={metric.label}
                value={metric.value}
              />
            ))}
          </section>

          <section className="mt-5">
            <ActivityTable
              activities={filteredActivities}
              onShowAll={handleShowAll}
              query={query}
            />
          </section>
        </div>
      </main>

      <NewEntryDialog onOpenChange={handleEntryOpenChange} open={isEntryOpen} />
    </div>
  )
}
