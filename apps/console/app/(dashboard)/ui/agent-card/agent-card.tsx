'use client'

import { useState } from 'react'
import { ArrowRight, LockKey } from '@phosphor-icons/react'
import { AgentOrb, type AgentOrbColors } from '@repo/react-web/ui/agent-orb'

interface AgentProfile {
  colors: AgentOrbColors
  context: string
  description: string
  id: string
  name: string
}

interface AgentCardProps {
  agents: readonly AgentProfile[]
}

export function AgentCard(props: AgentCardProps) {
  const { agents } = props
  const [selectedId, setSelectedId] = useState(agents[0]?.id ?? '')
  const selectedAgent =
    agents.find((agent) => agent.id === selectedId) ?? agents[0]

  if (!selectedAgent) {
    return null
  }

  return (
    <section
      aria-label="Agente principal"
      className="relative isolate flex min-h-72 w-full flex-col overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_78%_12%,rgb(250_215_21_/_0.13),transparent_31%),radial-gradient(circle_at_18%_86%,rgb(114_197_150_/_0.08),transparent_30%),linear-gradient(135deg,#121211_0%,#22211e_58%,#2c2b28_100%)] p-6 text-white shadow-[0_1.25rem_2.75rem_rgb(0_0_0_/_0.2)] before:absolute before:-right-[18%] before:-bottom-[29%] before:-z-10 before:h-[57%] before:w-[132%] before:-rotate-4 before:rounded-[50%] before:border-[rgb(250_215_21_/_0.62)] before:border-t before:content-[''] after:absolute after:inset-0 after:-z-20 after:bg-[linear-gradient(120deg,transparent_52%,rgb(255_255_255_/_0.04))] after:content-[''] sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--elo-yellow-500)]">
            Agente principal
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{selectedAgent.name}</h2>
          <p className="mt-1 text-sm text-[var(--elo-neutral-400)]">
            {selectedAgent.context}
          </p>
        </div>
        <AgentOrb colors={selectedAgent.colors} size={92} state="idle" />
      </div>

      <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--elo-neutral-300)]">
        {selectedAgent.description}
      </p>

      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
        <fieldset className="m-0 flex gap-2 border-0 p-0">
          <legend className="sr-only">Escolher agente</legend>
          {agents.map((agent) => {
            const isSelected = agent.id === selectedAgent.id

            return (
              <button
                aria-label={`Escolher ${agent.name}: ${agent.context}`}
                aria-pressed={isSelected}
                className={`relative grid size-11 place-items-center rounded-full border transition-transform active:scale-95 ${
                  isSelected
                    ? 'border-[var(--elo-yellow-500)] bg-white/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
                key={agent.id}
                onClick={() => setSelectedId(agent.id)}
                type="button"
              >
                <AgentOrb colors={agent.colors} size={28} state="idle" />
                <span className="sr-only">{agent.name}</span>
              </button>
            )
          })}
        </fieldset>

        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          type="button"
        >
          Conversar
          <ArrowRight aria-hidden="true" size={17} />
        </button>
      </div>

      <p className="mt-4 flex items-center gap-2 border-white/10 border-t pt-3 text-[.68rem] text-[var(--elo-neutral-400)]">
        <LockKey aria-hidden="true" size={14} weight="fill" />
        Conversas privadas por padrão. A escolha não confirma diagnóstico.
      </p>
    </section>
  )
}
