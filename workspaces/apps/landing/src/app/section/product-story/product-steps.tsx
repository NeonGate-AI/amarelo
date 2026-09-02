'use client'

import {
  HandHeart,
  type Icon,
  Microphone,
  StackSimple
} from '@phosphor-icons/react'

import { GlowHover, type GlowHoverItem } from '@repo/react/vendors/smoothui'

interface ProductStep {
  description: string
  hue: number
  icon: Icon
  id: string
  note: string
  role: string
  saturation: number
  title: string
}

const steps: ProductStep[] = [
  {
    description:
      'Fale sobre o que aconteceu, no momento em que fizer sentido, sem precisar reconstruir semanas inteiras na próxima consulta.',
    hue: 50,
    icon: Microphone,
    id: 'person',
    note: 'Sua conversa começa privada.',
    role: 'Você',
    saturation: 92,
    title: 'Conta o que viveu'
  },
  {
    description:
      'A IA separa relato, transcrição e inferência para propor memórias que você pode revisar, corrigir, recusar ou apagar.',
    hue: 145,
    icon: StackSimple,
    id: 'amarelo',
    note: 'Uma proposta da IA não é um fato clínico.',
    role: 'IA',
    saturation: 36,
    title: 'Organiza e propõe memória'
  },
  {
    description:
      'Amigos e familiares contam sua própria perspectiva em contas separadas. Relação nunca significa acesso automático à conversa de outra pessoa.',
    hue: 280,
    icon: HandHeart,
    id: 'support-network',
    note: 'Compartilhar exige escolha explícita.',
    role: 'Rede de apoio',
    saturation: 36,
    title: 'Acrescenta outra perspectiva'
  }
]

export function ProductSteps() {
  const items: GlowHoverItem[] = steps.map((step) => {
    const StepIcon = step.icon

    return {
      element: (
        <article className="h-full rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex items-center gap-3 text-primary-hover">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15">
              <StepIcon aria-hidden="true" size={23} weight="fill" />
            </span>
            <span className="text-xs font-bold tracking-[0.14em] uppercase">
              {step.role}
            </span>
          </div>
          <h3 className="mt-6 font-heading text-2xl font-semibold tracking-[-0.04em]">
            {step.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {step.description}
          </p>
          <p className="mt-5 border-border border-t pt-4 text-xs font-semibold leading-5 text-foreground/75">
            {step.note}
          </p>
        </article>
      ),
      id: step.id,
      theme: {
        hue: step.hue,
        lightness: 62,
        saturation: step.saturation
      }
    }
  })

  return (
    <GlowHover
      className="mt-10 grid gap-4 md:grid-cols-3"
      glowIntensity={0.12}
      items={items}
      maskSize={340}
    />
  )
}
