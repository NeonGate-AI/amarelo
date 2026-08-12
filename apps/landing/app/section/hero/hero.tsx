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
} from '@repo/react-web/vendors/smoothui'

import { AgentShowcase } from './agent-showcase'
import styles from './hero.module.css'
import { ThemeToggle } from './theme-toggle'

const kineticPhrases = [
  'Complementa seu acompanhamento.',
  'A IA é a ponte',
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
    <section aria-labelledby="hero-title" className={styles.hero} id="inicio">
      <div aria-hidden="true" className={styles.ambient}>
        <span className={styles.ambientOne} />
        <span className={styles.ambientTwo} />
        <span className={styles.ambientGrid} />
      </div>

      <header className={styles.header}>
        <a className={styles.logo} href="#inicio" aria-label="Amarelo, início">
          Amarelo<span aria-hidden="true">.</span>
        </a>

        <nav className={styles.navigation} aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#privacidade">Privacidade</a>
          <a href="#limites">Limites</a>
        </nav>

        <div className={styles.headerActions}>
          <ThemeToggle />
          <SmoothButton
            asChild
            className={styles.headerCta}
            color="accent"
            shape="pill"
            size="sm"
            variant="solid"
          >
            <a href="#participar">Participar</a>
          </SmoothButton>
        </div>
      </header>

      <div className={styles.heroMain}>
        <div className={styles.heroIntro}>
          <p className={styles.eyebrow}>
            <ShieldCheck aria-hidden="true" size={17} weight="fill" />
            Entre uma consulta e outra, sua história continua.
          </p>

          <h1 className={styles.title} id="hero-title">
            IA para organizar.{' '}
            <ShimmerSweep className={styles.titleAccent} delay={180}>
              Pessoas para cuidar.
            </ShimmerSweep>
          </h1>
        </div>

        <AgentShowcase />

        <div className={styles.heroDetails}>
          <KineticText
            className={styles.kinetic}
            interval={2300}
            loop
            phrases={kineticPhrases}
          />

          <p className={styles.description}>
            Converse com a Amarelo por texto ou voz. A IA ajuda a organizar o
            que acontece entre consultas; você revisa e escolhe se quer
            compartilhar partes desse contexto com pessoas de confiança ou
            profissionais que acompanham você.
          </p>

          <div className={styles.heroActions}>
            <SmoothButton
              asChild
              className={styles.primaryAction}
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
            <SmoothButton
              asChild
              className={styles.secondaryAction}
              color="neutral"
              shape="pill"
              size="lg"
              variant="outline"
            >
              <a href="#rede">Ver a rede de apoio</a>
            </SmoothButton>
          </div>

          <p className={styles.heroLimit}>
            <Info aria-hidden="true" size={16} />
            Para maiores de 18 anos. Não substitui profissionais, tratamento ou
            serviços de emergência.
          </p>
        </div>
      </div>

      <aside className={styles.trustStrip} aria-label="Princípios do produto">
        <ul>
          {trustItems.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.label}>
                <Icon aria-hidden="true" size={19} weight="fill" />
                {item.label}
              </li>
            )
          })}
        </ul>
      </aside>
    </section>
  )
}
