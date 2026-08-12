import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Platform, Pressable, type PressableProps } from 'react-native'

import { cn } from '#utilities'

import { TextClassContext } from './text'

const buttonVariants = cva(
  cn(
    'group flex-row items-center justify-center gap-2 rounded-full',
    Platform.select({
      web: 'whitespace-nowrap outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none [&_svg]:pointer-events-none'
    })
  ),
  {
    variants: {
      variant: {
        default: 'bg-primary active:opacity-80',
        destructive: 'bg-destructive active:opacity-80',
        outline:
          'border border-border bg-transparent active:bg-secondary dark:active:bg-secondary',
        secondary: 'bg-secondary active:opacity-80',
        ghost: 'bg-transparent active:bg-secondary',
        link: 'bg-transparent'
      },
      size: {
        default: 'h-12 px-6',
        sm: 'h-10 px-4',
        lg: 'h-14 px-8',
        icon: 'h-12 w-12'
      }
    },
    defaultVariants: {
      size: 'default',
      variant: 'default'
    }
  }
)

const buttonTextVariants = cva('text-base font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-white',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      link: 'text-foreground underline'
    },
    size: {
      default: '',
      sm: 'text-sm',
      lg: 'text-base',
      icon: ''
    }
  },
  defaultVariants: {
    size: 'default',
    variant: 'default'
  }
})

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  accessibilityHint?: string
  accessibilityLabel?: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onPress?: PressableProps['onPress']
  testID?: string
}

export function Button(props: ButtonProps) {
  const {
    accessibilityHint,
    accessibilityLabel,
    children,
    className,
    disabled = false,
    onPress,
    size,
    testID,
    variant
  } = props

  return (
    <TextClassContext.Provider value={buttonTextVariants({ size, variant })}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className={cn(
          disabled && 'opacity-50',
          buttonVariants({ className, size, variant })
        )}
        disabled={disabled}
        onPress={onPress}
        testID={testID}
      >
        {children}
      </Pressable>
    </TextClassContext.Provider>
  )
}

export { buttonTextVariants, buttonVariants }
