import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { satoshi } from '@repo/react/next/fonts'

import './globals.css'

interface RootLayoutProps {
  children: ReactNode
}

export const metadata: Metadata = {
  title: 'Amarelo — Memória e controle',
  description:
    'Console do Amarelo para revisar memória longitudinal, autorrelatos e permissões.',
  robots: {
    index: false,
    follow: false
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF9F5' },
    { media: '(prefers-color-scheme: dark)', color: '#121211' }
  ]
}

export default function RootLayout(props: RootLayoutProps) {
  const { children } = props

  return (
    <html className={satoshi.variable} lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
