import type { Metadata, Viewport } from 'next'

import { satoshi } from '@repo/react/next/fonts'

import './globals.css'

interface LandingLayoutProps {
  children: React.ReactNode
}

export const metadata: Metadata = {
  metadataBase: new URL('https://amarelo.health'),
  title: {
    default: 'Amarelo — memória para conversas que importam',
    template: '%s | Amarelo'
  },
  description:
    'O Amarelo ajuda pessoas adultas a organizar experiências em uma memória longitudinal, com privacidade e controle.',
  applicationName: 'Amarelo',
  openGraph: {
    title: 'Amarelo — memória para conversas que importam',
    description:
      'A IA ajuda a organizar memórias. A rede humana continua no centro.',
    locale: 'pt_BR',
    siteName: 'Amarelo',
    type: 'website',
    url: '/'
  },
  twitter: {
    card: 'summary',
    title: 'Amarelo — memória para conversas que importam',
    description: 'A IA ajuda a rede de apoio humana a funcionar melhor.'
  }
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { color: '#FAF9F5', media: '(prefers-color-scheme: light)' },
    { color: '#121211', media: '(prefers-color-scheme: dark)' }
  ]
}

export default function LandingLayout(props: LandingLayoutProps) {
  const { children } = props

  return (
    <html lang="pt-BR" className={satoshi.variable}>
      <body>{children}</body>
    </html>
  )
}
