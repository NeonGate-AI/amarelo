import {
  ArrowRight,
  CheckCircle,
  ClockCounterClockwise,
  EyeSlash,
  HandHeart,
  LockKey,
  ShareNetwork,
  ShieldCheck,
  UserCircle,
  UsersThree,
  WarningCircle
} from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'

import { AgentOrb } from '@repo/react-web/ui/agent-orb'
import { agentOrbPalettes } from '@repo/react-web/ui/agent-orb/palettes'
import { ShimmerSweep, SmoothButton } from '@repo/react-web/vendors/smoothui'

import { ProductSteps } from './product-steps'

interface FlowNodeProps {
  icon: ReactNode
  label: string
  note: string
}

interface LimitProps {
  icon: ReactNode
  text: string
}

interface MockChartBar {
  height: number
  id: string
}

interface SectionHeadingProps {
  description: string
  eyebrow: string
  id: string
  title: ReactNode
}

interface SurfaceCardProps {
  children: ReactNode
  label: string
  note: string
  title: string
}

const contexts = [
  'Ansiedade e pânico',
  'Humor e depressão',
  'Autismo e sobrecarga',
  'TDAH e rotina',
  'Relações e intensidade emocional',
  'Autocuidado cotidiano'
]

const mockChartBars: MockChartBar[] = [
  { height: 46, id: 'segunda' },
  { height: 70, id: 'terca' },
  { height: 52, id: 'quarta' },
  { height: 82, id: 'quinta' },
  { height: 64, id: 'sexta' },
  { height: 76, id: 'sabado' },
  { height: 58, id: 'domingo' }
]

const privacyPrinciples = [
  {
    description: 'Nenhum registro sai da sua conta sem uma ação intencional.',
    icon: EyeSlash,
    title: 'Privado por padrão'
  },
  {
    description:
      'Você define conteúdo, pessoa, finalidade e duração do acesso.',
    icon: ShareNetwork,
    title: 'Compartilhamento granular'
  },
  {
    description:
      'Permissões podem ser interrompidas, com histórico de acesso visível.',
    icon: ClockCounterClockwise,
    title: 'Revogável e auditável'
  },
  {
    description: 'Seu conteúdo não é usado para treinar modelos por padrão.',
    icon: ShieldCheck,
    title: 'Sem treino silencioso'
  }
]

const sectionShell = 'mx-auto w-full max-w-300 px-4 sm:px-8'
const eyebrow =
  'm-0 text-[0.7rem] font-bold tracking-[0.16em] text-primary-hover uppercase'

export function ProductStorySection() {
  return (
    <>
      <section className="py-24 sm:py-32" id="como-funciona">
        <div className={sectionShell}>
          <SectionHeading
            description="O Amarelo não fala por você. Ele ajuda a organizar uma história que continua sendo sua."
            eyebrow="Do vivido ao compartilhável"
            id="como-funciona-title"
            title={
              <>
                Menos esforço para explicar.{' '}
                <ShimmerSweep className="text-primary-hover">
                  Mais contexto para entender.
                </ShimmerSweep>
              </>
            }
          />
          <ProductSteps />
        </div>
      </section>

      <section
        aria-labelledby="rede-title"
        className="bg-surface-inverse py-24 text-surface-inverse-foreground sm:py-32"
        id="rede"
      >
        <div
          className={`${sectionShell} grid gap-12 lg:grid-cols-2 lg:items-center`}
        >
          <div>
            <p className={eyebrow}>A tese em uma imagem</p>
            <h2
              className="mt-4 font-heading text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl"
              id="rede-title"
            >
              A IA é a ponte. A rede é humana.
            </h2>
            <p className="mt-6 max-w-[58ch] text-base leading-7 text-current/65">
              Ana, Nico e Isa podem ajudar a nomear padrões, recuperar contexto
              autorizado e preparar uma conversa. Apoio, cuidado e decisões
              continuam entre pessoas.
            </p>
            <SmoothButton
              asChild
              className="mt-8"
              color="neutral"
              shape="pill"
              size="lg"
              variant="outline"
            >
              <a href="#privacidade">
                Ver como o controle funciona
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            </SmoothButton>
          </div>

          <figure className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-8">
            <figcaption className="sr-only">
              Fluxo em que uma pessoa usa a IA como ponte até sua rede de apoio
            </figcaption>
            <FlowNode
              icon={<UserCircle size={36} weight="fill" />}
              label="Você"
              note="vive e escolhe"
            />
            <span aria-hidden="true" className="h-px w-full bg-white/20" />
            <div className="grid justify-items-center gap-3 text-center">
              <AgentOrb
                colors={agentOrbPalettes.ana}
                size={74}
                state="thinking"
              />
              <strong className="text-sm">Amarelo</strong>
              <small className="text-xs text-current/55">
                organiza e prepara
              </small>
            </div>
            <span aria-hidden="true" className="h-px w-full bg-white/20" />
            <FlowNode
              icon={<UsersThree size={36} weight="fill" />}
              label="Sua rede"
              note="escuta e apoia"
            />
          </figure>
        </div>
      </section>

      <section className="py-24 sm:py-32" id="produto">
        <div className={sectionShell}>
          <SectionHeading
            description="Esta é uma hipótese de produto em validação: leve para registrar no momento e deliberada para revisar depois."
            eyebrow="Duas superfícies, um só controle"
            id="superficies-title"
            title="Conversa no app. Contexto na web."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <SurfaceCard
              label="App"
              note="Conversa"
              title="Uma entrada simples para o que é complexo"
            >
              <div className="mx-auto max-w-72 rounded-[2rem] border-[6px] border-foreground bg-card p-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <AgentOrb
                    colors={agentOrbPalettes.nico}
                    size={42}
                    state="listening"
                  />
                  <span>
                    <strong className="block text-sm">Nico</strong>
                    <small className="text-xs text-muted-foreground">
                      ouvindo no seu ritmo
                    </small>
                  </span>
                </div>
                <p className="mt-5 rounded-2xl rounded-bl-sm bg-muted p-3 text-xs leading-5">
                  Quer registrar o que tornou hoje mais pesado?
                </p>
                <p className="mt-3 ml-7 rounded-2xl rounded-br-sm bg-primary p-3 text-xs leading-5 text-primary-foreground">
                  A mudança de planos me deixou sobrecarregado.
                </p>
                <div className="mt-5 rounded-full border border-border px-4 py-3 text-xs text-muted-foreground">
                  Escreva ou fale…
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Texto, voz e check-ins curtos. Antes de salvar, você revisa como
                o registro será guardado.
              </p>
            </SurfaceCard>

            <SurfaceCard
              label="Web"
              note="Contexto + controle"
              title="Visão longitudinal sem transformar você em um score"
            >
              <div className="grid min-h-72 grid-cols-[3.5rem_1fr] overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
                <div className="grid content-start justify-items-center gap-4 bg-surface-inverse p-3 text-primary">
                  <span className="font-bold">A.</span>
                  <i className="size-2 rounded-full bg-current" />
                  <i className="size-2 rounded-full bg-current/50" />
                  <i className="size-2 rounded-full bg-current/50" />
                </div>
                <div className="grid content-between gap-6 p-5">
                  <div className="flex justify-between">
                    <span className="h-3 w-24 rounded bg-muted" />
                    <span className="size-7 rounded-full bg-muted" />
                  </div>
                  <div className="flex h-32 items-end gap-2 rounded-xl bg-card p-4">
                    {mockChartBars.map((bar) => (
                      <i
                        className="flex-1 rounded-t bg-primary"
                        key={bar.id}
                        style={{ height: `${bar.height}%` }}
                      />
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <span className="h-2 rounded bg-muted" />
                    <span className="h-2 w-4/5 rounded bg-muted" />
                    <span className="h-2 w-3/5 rounded bg-muted" />
                  </div>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Tendências de autorrelato, timeline, rede, permissões e
                proveniência — com dados e inferências claramente separados.
              </p>
            </SurfaceCard>
          </div>
        </div>
      </section>

      <section
        className="bg-accent py-24 text-accent-foreground sm:py-32"
        id="contextos"
      >
        <div
          className={`${sectionShell} grid gap-12 lg:grid-cols-[1.1fr_0.9fr]`}
        >
          <div>
            <p className={eyebrow}>Contextos, não rótulos</p>
            <h2
              className="mt-4 font-heading text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl"
              id="contextos-title"
            >
              Comece pelo que você precisa organizar hoje.
            </h2>
            <p className="mt-6 max-w-[60ch] text-base leading-7 text-current/70">
              Os agentes podem se especializar em contextos diferentes. A
              escolha não confirma condição, não produz diagnóstico e pode mudar
              a qualquer momento.
            </p>
          </div>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
            {contexts.map((context) => (
              <li
                className="flex items-center gap-3 rounded-2xl border border-current/10 bg-background/50 p-4 text-sm font-semibold"
                key={context}
              >
                <CheckCircle
                  aria-hidden="true"
                  className="shrink-0 text-success"
                  size={20}
                  weight="fill"
                />
                {context}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-24 sm:py-32" id="privacidade">
        <div className={sectionShell}>
          <div className="grid gap-6 sm:grid-cols-[4rem_1fr]">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <LockKey aria-hidden="true" size={25} weight="fill" />
            </span>
            <div>
              <p className={eyebrow}>Privacidade como produto</p>
              <h2
                className="mt-4 font-heading text-4xl font-semibold tracking-[-0.055em] sm:text-6xl"
                id="privacidade-title"
              >
                Acesso começa com autorização.
              </h2>
              <p className="mt-5 max-w-[62ch] leading-7 text-muted-foreground">
                Não basta esconder configurações em uma página. Cada uso de
                contexto precisa respeitar a permissão que você concedeu.
              </p>
            </div>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {privacyPrinciples.map((principle) => {
              const Icon = principle.icon
              return (
                <article
                  className="rounded-3xl border border-border bg-card p-6"
                  key={principle.title}
                >
                  <Icon
                    aria-hidden="true"
                    className="text-primary-hover"
                    size={22}
                    weight="fill"
                  />
                  <h3 className="mt-8 font-heading text-xl font-semibold">
                    {principle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {principle.description}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-danger py-16 text-white" id="limites">
        <div
          className={`${sectionShell} grid gap-6 lg:grid-cols-[4rem_1fr_auto] lg:items-center`}
        >
          <div className="grid size-14 place-items-center rounded-2xl bg-white/15">
            <HandHeart aria-hidden="true" size={34} weight="fill" />
          </div>
          <div>
            <p className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-white/70">
              Limites claros desde o começo
            </p>
            <h2
              className="mt-2 font-heading text-3xl font-semibold tracking-[-0.045em] sm:text-4xl"
              id="limites-title"
            >
              Presença digital não é cuidado clínico.
            </h2>
            <p className="mt-4 max-w-[65ch] text-sm leading-6 text-white/75">
              O Amarelo não diagnostica, prescreve, substitui terapia ou prevê
              crises. Em risco imediato, procure o serviço de emergência da sua
              região ou alguém de confiança agora.
            </p>
          </div>
          <div className="grid gap-2 text-xs font-semibold">
            <Limit
              icon={<WarningCircle size={19} weight="fill" />}
              text="Não é serviço de emergência"
            />
            <Limit
              icon={<ShieldCheck size={19} weight="fill" />}
              text="Não toma decisões por você"
            />
            <Limit
              icon={<UsersThree size={19} weight="fill" />}
              text="Não substitui sua rede"
            />
          </div>
        </div>
      </section>
    </>
  )
}

function SectionHeading(props: SectionHeadingProps) {
  const { description, eyebrow: headingEyebrow, id, title } = props

  return (
    <div className="max-w-4xl">
      <p className={eyebrow}>{headingEyebrow}</p>
      <h2
        className="mt-4 font-heading text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl"
        id={id}
      >
        {title}
      </h2>
      <p className="mt-6 max-w-[62ch] text-base leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function FlowNode(props: FlowNodeProps) {
  const { icon, label, note } = props

  return (
    <div className="grid justify-items-center gap-2 text-center">
      <span className="text-primary">{icon}</span>
      <strong className="text-sm">{label}</strong>
      <small className="text-xs text-current/55">{note}</small>
    </div>
  )
}

function SurfaceCard(props: SurfaceCardProps) {
  const { children, label, note, title } = props

  return (
    <article className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-8">
      <div className="mb-7 flex items-center justify-between">
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
          {label}
        </span>
        <small className="text-xs font-semibold text-muted-foreground">
          {note}
        </small>
      </div>
      {children}
      <h3 className="mt-7 font-heading text-2xl font-semibold tracking-[-0.04em]">
        {title}
      </h3>
    </article>
  )
}

function Limit(props: LimitProps) {
  const { icon, text } = props

  return (
    <span className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-2">
      {icon}
      {text}
    </span>
  )
}
