import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type {
  AriaAttributes,
  ButtonHTMLAttributes,
  MouseEventHandler,
  ReactNode
} from 'react'

import { cn } from '#utilities/cn'

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  'aria-expanded'?: AriaAttributes['aria-expanded']
  'aria-haspopup'?: AriaAttributes['aria-haspopup']
  'aria-label'?: string
  asChild?: boolean
  children?: ReactNode
  className?: string
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLElement>
  title?: string
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
}

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[background-color,color,border-color,transform,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        gold: 'bg-primary text-primary-foreground shadow-[0_0.5rem_1.5rem_rgb(255_193_7_/_18%)] hover:bg-primary-hover',
        outline:
          'border border-border bg-card text-card-foreground hover:bg-secondary',
        ghost: 'bg-transparent text-foreground hover:bg-secondary',
        subtle: 'bg-accent text-accent-foreground hover:bg-primary/20'
      },
      size: {
        default: 'h-11 px-5 text-sm',
        lg: 'h-16 px-6 text-base',
        sm: 'h-9 px-3 text-sm',
        icon: 'size-11 p-0'
      }
    },
    defaultVariants: {
      variant: 'outline',
      size: 'default'
    }
  }
)

export function Button(props: ButtonProps) {
  const {
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHasPopup,
    'aria-label': ariaLabel,
    asChild = false,
    children,
    className,
    disabled = false,
    onClick,
    size,
    title,
    type = 'button',
    variant
  } = props

  const classes = cn(buttonVariants({ className, size, variant }))

  if (asChild) {
    return (
      <Slot
        aria-disabled={disabled || undefined}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        aria-label={ariaLabel}
        className={classes}
        onClick={disabled ? undefined : onClick}
        title={title}
      >
        {children}
      </Slot>
    )
  }

  return (
    <button
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      aria-label={ariaLabel}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  )
}
