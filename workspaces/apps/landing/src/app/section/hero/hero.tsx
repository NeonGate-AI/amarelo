'use client'

import {
  ArrowRight,
  Info,
  LockKey,
  ShieldCheck,
  UsersThree
} from '@phosphor-icons/react/ssr'

import {
  KineticText,
  ShimmerSweep,
  SmoothButton
} from '@repo/react/vendors/smoothui'

import { AgentShowcase } from './agent-showcase'
import { ThemeToggle } from './theme-toggle'
import Link from 'next/link'

const kineticPhrases = [
  'Complementa seu acompanhamento.',
  'A memória acompanha o tempo.',
  'A rede continua humana.'
]

const trustItems = [
  { icon: LockKey, label: 'Privado por padrão' },
  { icon: UsersThree, label: 'Rede escolhida por você' },
  { icon: ShieldCheck, label: 'Acesso revogável' },
  { icon: Info, label: 'Sem diagnóstico' }
]

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate min-h-svh overflow-hidden bg-background text-foreground"
      id="inicio"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-1 overflow-hidden"
      >
        <span className="absolute top-[-22rem] right-[-16rem] block size-[58rem] rounded-full bg-[radial-gradient(circle,rgb(250_215_21_/_25%),transparent_66%)] blur-[1.25rem]" />
        <span className="absolute bottom-[-25rem] left-[-18rem] block size-[52rem] rounded-full bg-[radial-gradient(circle,rgb(125_178_207_/_13%),transparent_68%)] blur-[2rem]" />
        <span className="absolute inset-0 block bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-30 [mask-image:linear-gradient(to_bottom,rgb(0_0_0_/_45%),transparent_82%)]" />
      </div>

      <header className="mx-auto flex min-h-18 w-[min(calc(100%_-_2rem),80rem)] items-center justify-between gap-6 border-[color-mix(in_srgb,var(--border)_76%,transparent)] border-b min-[48.0625rem]:min-h-21">
        <a
          className="inline-flex min-h-11 items-center font-heading text-[1.65rem] font-[820] tracking-[-.055em] no-underline"
          href="#inicio"
          aria-label="Amarelo, início"
        >
          Amarelo
          <span aria-hidden="true" className="text-primary">
            .
          </span>
        </a>

        <nav
          className="hidden items-center gap-[clamp(1rem,2.5vw,2rem)] min-[48.0625rem]:flex"
          aria-label="Navegação principal"
        >
          <a
            className="inline-flex min-h-11 items-center text-sm font-[560] text-muted-foreground no-underline transition-colors duration-160 hover:text-foreground motion-reduce:transition-none"
            href="#como-funciona"
          >
            Como funciona
          </a>
          <a
            className="inline-flex min-h-11 items-center text-sm font-[560] text-muted-foreground no-underline transition-colors duration-160 hover:text-foreground motion-reduce:transition-none"
            href="#privacidade"
          >
            Privacidade
          </a>
          <a
            className="inline-flex min-h-11 items-center text-sm font-[560] text-muted-foreground no-underline transition-colors duration-160 hover:text-foreground motion-reduce:transition-none"
            href="#limites"
          >
            Limites
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link className="font-semibold" href="https://sso.amarelo.life">
            Entrar
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto grid w-[min(calc(100%_-_2rem),80rem)] grid-cols-[minmax(0,1fr)] items-start gap-y-8 [padding-block:3.25rem_3.75rem] min-[48.0625rem]:gap-y-10 min-[48.0625rem]:[padding-block:clamp(3.75rem,9vw,7.5rem)_clamp(3.5rem,8vw,6rem)] min-[64.0625rem]:grid-cols-[minmax(0,.94fr)_minmax(25rem,1.06fr)] min-[64.0625rem]:gap-x-[clamp(2.5rem,6vw,6.5rem)] min-[64.0625rem]:gap-y-0">
        <div className="max-w-[48rem] min-[64.0625rem]:max-w-[41rem] min-[64.0625rem]:self-end">
          <p className="mb-5 inline-flex items-center gap-2 text-xs font-[720] tracking-[.1em] text-[var(--elo-color-fg-brand)] uppercase">
            <ShieldCheck aria-hidden="true" size={17} weight="fill" />
            Entre uma consulta e outra, sua história continua.
          </p>

          <h1
            className="m-0 max-w-[12ch] font-heading font-[760] text-[clamp(3rem,14vw,4.8rem)] leading-[.9] tracking-[-.075em] text-balance min-[48.0625rem]:text-[clamp(3.5rem,6.5vw,6.75rem)] min-[64.0625rem]:max-w-[11ch]"
            id="hero-title"
          >
            IA para organizar.{' '}
            <ShimmerSweep
              className="text-[var(--elo-color-fg-brand)]"
              delay={180}
            >
              Pessoas para cuidar.
            </ShimmerSweep>
          </h1>
        </div>

        <AgentShowcase />

        <div className="max-w-[48rem] min-[64.0625rem]:col-start-1 min-[64.0625rem]:row-start-2 min-[64.0625rem]:max-w-[41rem] min-[64.0625rem]:self-start">
          <KineticText
            className="mt-[1.6rem] min-h-7 flex-wrap text-[clamp(1rem,1.8vw,1.25rem)] font-[650] tracking-[-.02em] text-foreground"
            interval={2300}
            loop
            phrases={kineticPhrases}
          />

          <p className="mt-4 max-w-[55ch] text-[clamp(1rem,1.5vw,1.125rem)] leading-[1.7] text-muted-foreground">
            Converse por voz com um Elo da Amarelo. A IA ajuda a organizar e
            propor memórias sobre o que acontece entre consultas; você revisa e
            decide se quer compartilhar uma parte com pessoas de confiança ou
            profissionais que acompanham você.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 min-[34.0625rem]:flex-row min-[34.0625rem]:flex-wrap">
            <SmoothButton
              asChild
              className="min-h-13 w-full text-primary-foreground shadow-[0_1rem_2.5rem_rgb(250_215_21_/_20%)] min-[34.0625rem]:w-auto"
              color="accent"
              shape="pill"
              size="lg"
              variant="solid"
            >
              <a href="#como-funciona">
                Entender como funciona
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            </SmoothButton>
          </div>

          <p className="mt-6 flex max-w-[38rem] items-start gap-[.6rem] text-xs leading-[1.55] text-muted-foreground">
            <Info
              aria-hidden="true"
              className="mt-[.08rem] shrink-0"
              size={16}
            />
            Uso destinado a maiores de 18 anos. Não substitui profissionais,
            tratamento ou serviços de emergência.
          </p>
        </div>
      </div>

      <aside
        className="border-border border-y bg-[color-mix(in_srgb,var(--card)_72%,transparent)] backdrop-blur-[1rem]"
        aria-label="Princípios do produto"
      >
        <ul className="mx-auto grid min-h-19 w-[min(calc(100%_-_2rem),80rem)] list-none grid-cols-2 items-center p-0 min-[48.0625rem]:grid-cols-4">
          {trustItems.map((item, index) => {
            const Icon = item.icon

            return (
              <li
                className={`flex min-h-11 items-center justify-center gap-[.55rem] border-border border-r px-4 text-center text-xs font-[590] text-muted-foreground ${index === 0 ? 'border-b border-l min-[48.0625rem]:border-b-0' : ''} ${index === 1 ? 'border-r-0 border-b min-[48.0625rem]:border-r min-[48.0625rem]:border-b-0' : ''}`}
                key={item.label}
              >
                <Icon
                  aria-hidden="true"
                  className="shrink-0 text-[var(--elo-color-fg-brand)]"
                  size={19}
                  weight="fill"
                />
                {item.label}
              </li>
            )
          })}
        </ul>
      </aside>
    </section>
  )
}
