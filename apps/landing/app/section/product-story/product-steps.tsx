'use client'

import {
  ChatCircleDots,
  type Icon,
  Notepad,
  ShareNetwork
} from '@phosphor-icons/react'

import { GlowHover, type GlowHoverItem } from '@repo/react-web/vendors/smoothui'

interface ProductStep {
  description: string
  hue: number
  icon: Icon
  number: string
  saturation: number
  title: string
}

const steps: ProductStep[] = [
  {
    description:
      'Converse por texto ou voz e registre o que aconteceu sem precisar explicar tudo de uma vez.',
    hue: 50,
    icon: ChatCircleDots,
    number: '01',
    saturation: 92,
    title: 'Organize no seu ritmo'
  },
  {
    description:
      'Revise o registro, diferencie seu relato de resumos da IA e mantenha tudo privado por padrão.',
    hue: 145,
    icon: Notepad,
    number: '02',
    saturation: 36,
    title: 'Construa contexto'
  },
  {
    description:
      'Escolha exatamente o que compartilhar, com quem e por quanto tempo. Depois, revogue quando quiser.',
    hue: 280,
    icon: ShareNetwork,
    number: '03',
    saturation: 36,
    title: 'Aproxime sua rede'
  }
]

export function ProductSteps() {
  const items: GlowHoverItem[] = steps.map((step) => {
    const StepIcon = step.icon

    return {
      element: (
        <article className="h-full rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex items-center justify-between text-primary-hover">
            <span className="font-mono text-xs font-bold tracking-[0.14em]">
              {step.number}
            </span>
            <StepIcon aria-hidden="true" size={24} weight="fill" />
          </div>
          <h3 className="mt-12 font-heading text-2xl font-semibold tracking-[-0.04em]">
            {step.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {step.description}
          </p>
        </article>
      ),
      id: step.number,
      theme: {
        hue: step.hue,
        lightness: 62,
        saturation: step.saturation
      }
    }
  })

  return (
    <GlowHover
      className="mt-12 grid gap-4 md:grid-cols-3"
      glowIntensity={0.12}
      items={items}
      maskSize={340}
    />
  )
}
