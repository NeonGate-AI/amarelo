import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { satoshi } from '@repo/react/next/fonts'

import { ThemeScript } from '@component/theme/theme-script'

import './globals.css'

interface OnboardingLayoutProps {
  children: ReactNode
}

export const metadata: Metadata = {
  metadataBase: new URL('https://onboarding.amarelo.health'),
  title: {
    default: 'Entrar ou criar conta | Amarelo',
    template: '%s | Amarelo'
  },
  description:
    'Acesse a Amarelo, escolha seu Elo e prepare seu espaço com uma conversa por voz, privada e revisável.',
  applicationName: 'Amarelo',
  robots: {
    follow: false,
    index: false
  }
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { color: '#FAF9F5', media: '(prefers-color-scheme: light)' },
    { color: '#121211', media: '(prefers-color-scheme: dark)' }
  ]
}

export default function OnboardingLayout(props: OnboardingLayoutProps) {
  const { children } = props

  return (
    <html className={satoshi.variable} lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  )
}
