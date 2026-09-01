'use client'

import { useEffect, useMemo, useState } from 'react'

import { dashboardData } from '@dashboard/lib/dashboard.data'

export type ConsoleTheme = 'dark' | 'light'

export function useDashboard() {
  const [activeNavigation, setActiveNavigation] = useState('Início')
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false)
  const [isEntryOpen, setIsEntryOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<ConsoleTheme>('light')

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filteredActivities = useMemo(() => {
    return dashboardData.activities.filter((activity) => {
      const searchableValue = [
        activity.title,
        activity.category,
        activity.visibility,
        activity.date
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      return searchableValue.includes(normalizedQuery)
    })
  }, [normalizedQuery])

  function handleActiveNavigationChange(label: string) {
    setActiveNavigation(label)
    setIsSidebarOpen(false)
  }

  function handleAppMenuToggle() {
    setIsAppMenuOpen((isOpen) => !isOpen)
    setIsProfileOpen(false)
  }

  function handleEntryOpenChange(open: boolean) {
    setIsEntryOpen(open)
  }

  function handleProfileToggle() {
    setIsProfileOpen((isOpen) => !isOpen)
    setIsAppMenuOpen(false)
  }

  function handleQueryChange(value: string) {
    setQuery(value)
  }

  function handleSidebarOpenChange(open: boolean) {
    setIsSidebarOpen(open)
  }

  function handleThemeToggle() {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
  }

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('amarelo-console-theme')
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'

    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme)
      return
    }

    setTheme(systemTheme)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('amarelo-console-theme', theme)
  }, [theme])

  return {
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
  }
}
