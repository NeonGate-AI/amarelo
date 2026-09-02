'use client'

import { CaretRight, Notebook, ShareNetwork } from '@phosphor-icons/react'

interface MetricCardProps {
  icon: string
  label: string
  value: string
}

export function MetricCard(props: MetricCardProps) {
  const { icon, label, value } = props

  return (
    <button
      className="group flex min-h-28 w-full items-center gap-5 rounded-2xl border border-border bg-card p-5 text-left text-card-foreground shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-secondary active:scale-[0.99] sm:p-6"
      type="button"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {icon === 'journal' ? (
          <Notebook aria-hidden="true" size={30} />
        ) : (
          <ShareNetwork aria-hidden="true" size={31} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className="mt-1 block truncate text-2xl font-semibold sm:text-3xl">
          {value}
        </span>
      </span>
      <CaretRight
        aria-hidden="true"
        className="ml-auto shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        size={24}
      />
    </button>
  )
}
