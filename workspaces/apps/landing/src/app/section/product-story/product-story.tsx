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
import Image from 'next/image'
import type { ReactNode } from 'react'

import { AgentOrb } from '@repo/react/ui/agent-orb'
import { agentOrbPresets } from '@repo/react/ui/agent-orb'
import { ShimmerSweep, SmoothButton } from '@repo/react/vendors/smoothui'

import { AppStateShowcase } from './app-state-showcase'
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

interface SectionHeadingProps {
  description: string
  eyebrow: string
  id: string
  title: ReactNode
}

const themes = [
  'Ansiedade e pânico',
  'Humor e depressão',
  'Sobrecarga',
  'TDAH e rotina',
  'Relações e intensidade emocional',
  'Autocuidado cotidiano'
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
      <section className="py-20 sm:py-28" id="como-funciona">
        <div className={sectionShell}>
          <SectionHeading
            description="Uma conversa por voz pode virar uma memória longitudinal revisável — nunca um diagnóstico, nem um registro automático de tudo."
            eyebrow="Da fala à memória"
            id="como-funciona-title"
            title={
              <>
                Você conta. O Elo guarda na memória.{' '}
                <ShimmerSweep className="text-primary-hover">
                  Você decide.
                </ShimmerSweep>
              </>
            }
          />
          <ProductSteps />
        </div>
      </section>

      <section
        aria-labelledby="memoria-title"
        className="bg-surface-inverse py-24 text-surface-inverse-foreground sm:py-32"
        id="memoria"
      >
        <div
          className={`${sectionShell} grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center`}
        >
          <div>
            <p className={eyebrow}>Memória longitudinal</p>
            <h2
              className="mt-4 font-heading text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl"
              id="memoria-title"
            >
              O que é memória longitudinal — e qual é o papel de cada pessoa?
            </h2>
            <p className="mt-6 max-w-[58ch] text-base leading-7 text-current/65">
              É uma história construída ao longo do tempo, com autoria, origem,
              revisão e permissão. Ela aproxima o que foi vivido entre encontros
              sem transformar uma inferência da IA em verdade clínica.
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

          <figure className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-8">
            <figcaption className="sr-only">
              Papéis de você, do Elo, da rede de apoio e dos profissionais na
              construção da memória longitudinal
            </figcaption>
            <div className="grid justify-items-center gap-3 border-white/10 border-b pb-7 text-center">
              <AgentOrb
                preset={agentOrbPresets.ana}
                size={82}
                speed={0.5}
                state="speaking"
              />
              <strong className="text-sm">Elo</strong>
              <small className="max-w-[38ch] text-xs leading-5 text-current/55">
                guarda em memória o que você contou para enriquecer o
                acompanhamento — sem diagnosticar ou decidir o tratamento
              </small>
            </div>
            <div className="mt-7 grid gap-6 sm:grid-cols-3">
              <FlowNode
                icon={<UserCircle size={34} weight="fill" />}
                label="Você"
                note="conta, revisa e escolhe"
              />
              <FlowNode
                icon={<UsersThree size={34} weight="fill" />}
                label="Amigos e família"
                note="contribuem em conversas próprias"
              />
              <FlowNode
                icon={<ShieldCheck size={34} weight="fill" />}
                label="Profissionais"
                note="interpretam só o autorizado"
              />
            </div>
            <p className="mt-7 rounded-2xl bg-white/5 px-4 py-3 text-center text-xs leading-5 text-current/55">
              Cada contribuição conserva sua autoria. Relação ou convite nunca
              concede acesso automático à conversa de outra pessoa.
            </p>
          </figure>
        </div>
      </section>

      <section className="py-24 sm:py-32" id="app">
        <div
          className={`${sectionShell} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center`}
        >
          <div>
            <p className={eyebrow}>Conversa por voz, em contas separadas</p>
            <h2 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl">
              Cada participante da rede tem seu Elo. Pode ser Ana, Nico ou Isa.
            </h2>
            <p className="mt-6 max-w-[60ch] text-base leading-7 text-muted-foreground">
              Você, seus amigos e sua família escolhem um Elo e usam o app em
              suas próprias contas privadas. Cada conversa por voz continua
              separada, e cada relato mantém autor e origem. Só uma contribuição
              explicitamente autorizada pode compor a memória longitudinal da
              pessoa a quem ela se refere — sem abrir a conversa de origem.
            </p>

            <div className="mt-8 flex items-center gap-5">
              <div
                aria-hidden="true"
                className="relative isolate grid size-32 shrink-0 place-items-center rounded-full before:absolute before:inset-[8%] before:-z-1 before:animate-elo-listening-pulse before:rounded-full before:border before:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] before:content-[''] after:absolute after:inset-[8%] after:-z-1 after:animate-elo-listening-pulse after:rounded-full after:border after:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] after:content-[''] after:[animation-delay:1.9s] motion-reduce:before:animate-none motion-reduce:after:animate-none min-[48.0625rem]:size-38"
              >
                <AgentOrb
                  preset={agentOrbPresets.ana}
                  size="8.25rem"
                  state="listening"
                />
              </div>
              <p className="m-0 max-w-[28ch] text-sm leading-6 text-muted-foreground">
                O Elo muda de presença para indicar quando Ana está ouvindo,
                falando ou silenciada.
              </p>
            </div>

            <ul className="mt-8 grid list-none gap-3 p-0">
              <PrivacyPoint text="Cada pessoa escolhe seu próprio Elo em sua própria conta." />
              <PrivacyPoint text="A IA sugere contribuições; a pessoa revisa antes de aceitar na própria memória." />
              <PrivacyPoint text="Nada é compartilhado automaticamente com amigos, família ou profissionais." />
            </ul>
          </div>

          <AppStateShowcase />
        </div>
      </section>

      <section className="bg-muted/40 py-24 sm:py-32" id="painel">
        <div className={sectionShell}>
          <SectionHeading
            description="Nesta direção de produto, o painel reúne linha do tempo, padrões de autorrelato, origem das informações e permissões. Você revisa o que foi memorizado e escolhe o que seu terapeuta ou psiquiatra pode consultar para chegar às sessões com uma visão longitudinal mais clara."
            eyebrow="Painel de memória"
            id="painel-title"
            title="Você controla a memória. Profissionais autorizados acompanham com mais continuidade."
          />

          <figure className="mt-12">
            <div className="block min-[48.0625rem]:grid min-[48.0625rem]:grid-cols-[minmax(0,3.45fr)_minmax(10rem,1fr)] min-[48.0625rem]:items-end min-[48.0625rem]:gap-[clamp(1rem,2.4vw,2rem)]">
              <div className="hidden min-w-0 min-[48.0625rem]:block">
                <Image
                  alt="Painel Amarelo aberto em um MacBook Air, com navegação completa, visão da semana, Elo principal e controles de memória"
                  className="block h-auto w-full"
                  height={1176}
                  sizes="(max-width: 48rem) 1px, (max-width: 80rem) 72vw, 54rem"
                  src="/product/console-dashboard-macbook-air.png"
                  width={2048}
                />
              </div>
              <div className="mx-auto w-[min(100%,31rem)] min-w-0 max-w-none min-[48.0625rem]:mx-0 min-[48.0625rem]:w-full min-[48.0625rem]:max-w-68 min-[48.0625rem]:justify-self-end">
                <Image
                  alt="Painel Amarelo em sua visualização compacta dentro de um iPad"
                  className="block h-auto w-full"
                  height={1670}
                  sizes="(max-width: 48rem) 90vw, (max-width: 80rem) 22vw, 16rem"
                  src="/product/console-dashboard-ipad-air.png"
                  width={1204}
                />
              </div>
            </div>
            <figcaption className="mt-4 max-w-[70ch] text-left text-xs leading-5 text-muted-foreground min-[48.0625rem]:mx-auto min-[48.0625rem]:mt-6 min-[48.0625rem]:text-center">
              Dados fictícios em versões ampla e compacta. O acesso profissional
              depende de autorização explícita, com escopo e duração definidos
              por você.
            </figcaption>
          </figure>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <DashboardPoint
              description="Revise, corrija e acompanhe o que foi memorizado, com origem e diferenças entre relato e inferência."
              title="Uma central sob seu controle"
            />
            <DashboardPoint
              description="Terapeuta e psiquiatra consultam somente a memória que você autorizou, com mais continuidade entre uma sessão e outra."
              title="Continuidade para o cuidado"
            />
            <DashboardPoint
              description="Defina profissional, conteúdo, finalidade e duração. Depois, interrompa o acesso quando quiser."
              title="Autorizações com limites"
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="temas-title"
        className="bg-accent py-24 text-accent-foreground sm:py-32"
        id="temas"
      >
        <div
          className={`${sectionShell} grid gap-12 lg:grid-cols-[1.1fr_0.9fr]`}
        >
          <div>
            <p className={eyebrow}>Temas, não rótulos</p>
            <h2
              className="mt-4 font-heading text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl"
              id="temas-title"
            >
              Diga o que está sentindo hoje. Desabafe no seu ritmo.
            </h2>
            <p className="mt-6 max-w-[60ch] text-base leading-7 text-current/70">
              Os Elos podem acolher assuntos diferentes para ajudar você a
              começar. A escolha não confirma uma condição, não produz
              diagnóstico e pode mudar a qualquer momento.
            </p>
          </div>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
            {themes.map((theme) => (
              <li
                className="flex items-center gap-3 rounded-2xl border border-current/10 bg-background/50 p-4 text-sm font-semibold"
                key={theme}
              >
                <CheckCircle
                  aria-hidden="true"
                  className="shrink-0 text-success"
                  size={20}
                  weight="fill"
                />
                {theme}
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
                Não basta esconder configurações em uma página. Cada uso de uma
                informação memorizada precisa respeitar a permissão que você
                concedeu.
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
            <p className="text-[0.7rem] font-bold tracking-[0.16em] text-white/70 uppercase">
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
      <small className="text-xs leading-5 text-current/55">{note}</small>
    </div>
  )
}

function PrivacyPoint(props: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-foreground/80">
      <CheckCircle
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-success"
        size={19}
        weight="fill"
      />
      {props.text}
    </li>
  )
}

function DashboardPoint(props: { description: string; title: string }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-6">
      <h3 className="font-heading text-xl font-semibold tracking-[-0.035em]">
        {props.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {props.description}
      </p>
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
