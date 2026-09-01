import type { ReactNode } from 'react'

import { cn } from '#utilities/cn'

export interface CardProps {
  children: ReactNode
  className?: string
}

export function Card(props: CardProps) {
  const { children, className } = props

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]',
        className
      )}
    >
      {children}
    </div>
  )
}
