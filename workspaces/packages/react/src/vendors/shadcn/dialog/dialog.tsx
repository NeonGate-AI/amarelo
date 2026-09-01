'use client'

import { X } from '@phosphor-icons/react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

import { cn } from '@utilities'

export interface DialogProps {
  children: ReactNode
  description: string
  footer?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function Dialog(props: DialogProps) {
  const { children, description, footer, onOpenChange, open, title } = props

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-[var(--shadow-soft)]',
            'data-[state=closed]:animate-out data-[state=open]:animate-in sm:p-7'
          )}
        >
          <div className="pr-12">
            <DialogPrimitive.Title className="text-2xl font-bold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          </div>

          <DialogPrimitive.Close
            className="absolute right-5 top-5 inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Fechar"
          >
            <X size={20} />
          </DialogPrimitive.Close>

          <div className="mt-6">{children}</div>

          {footer ? (
            <div className="mt-6 flex justify-end gap-3">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
