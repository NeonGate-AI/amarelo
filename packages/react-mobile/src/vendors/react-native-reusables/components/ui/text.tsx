import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import {
  Platform,
  Text as NativeText,
  type TextProps as NativeTextProps
} from 'react-native'

import { cn } from '#utilities'

const textVariants = cva(
  cn('text-base text-foreground', Platform.select({ web: 'select-text' })),
  {
    variants: {
      variant: {
        default: '',
        h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
        h2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight',
        h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
        h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
        p: 'mt-6 leading-7',
        blockquote: 'mt-6 border-l-2 pl-6 italic',
        code: 'rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
        lead: 'text-xl text-muted-foreground',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-none',
        muted: 'text-sm text-muted-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export const TextClassContext = React.createContext<string | undefined>(
  undefined
)

export interface TextProps extends VariantProps<typeof textVariants> {
  accessibilityLiveRegion?: NativeTextProps['accessibilityLiveRegion']
  accessibilityRole?: NativeTextProps['accessibilityRole']
  children: React.ReactNode
  className?: string
  numberOfLines?: number
  selectable?: boolean
}

export function Text(props: TextProps) {
  const {
    accessibilityLiveRegion,
    accessibilityRole,
    children,
    className,
    numberOfLines,
    selectable,
    variant
  } = props

  const contextClassName = React.useContext(TextClassContext)

  return (
    <NativeText
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityRole={accessibilityRole}
      className={cn(textVariants({ variant }), contextClassName, className)}
      numberOfLines={numberOfLines}
      selectable={selectable}
    >
      {children}
    </NativeText>
  )
}
