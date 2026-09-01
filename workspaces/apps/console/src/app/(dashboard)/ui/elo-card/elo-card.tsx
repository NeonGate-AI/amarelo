'use client'

import { useState } from 'react'
import { ArrowRight, LockKey } from '@phosphor-icons/react'
import { AgentOrb, type AgentOrbPreset } from '@repo/react/ui/agent-orb'

interface EloProfile {
  description: string
  focus: string
  id: string
  name: string
  preset: AgentOrbPreset
}

interface EloCardProps {
  elos: readonly EloProfile[]
}

export function EloCard(props: EloCardProps) {
  const { elos } = props
  const [selectedEloId, setSelectedEloId] = useState(elos[0]?.id ?? '')
  const selectedElo = elos.find((elo) => elo.id === selectedEloId) ?? elos[0]

  if (!selectedElo) {
    return null
  }

  return (
    <section
      aria-label="Seu Elo"
      className="relative isolate flex min-h-72 w-full flex-col overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_78%_12%,rgb(250_215_21_/_0.13),transparent_31%),radial-gradient(circle_at_18%_86%,rgb(114_197_150_/_0.08),transparent_30%),linear-gradient(135deg,#121211_0%,#22211e_58%,#2c2b28_100%)] p-6 text-white shadow-[0_1.25rem_2.75rem_rgb(0_0_0_/_0.2)] before:absolute before:-right-[18%] before:-bottom-[29%] before:-z-10 before:h-[57%] before:w-[132%] before:-rotate-4 before:rounded-[50%] before:border-[rgb(250_215_21_/_0.62)] before:border-t before:content-[''] after:absolute after:inset-0 after:-z-20 after:bg-[linear-gradient(120deg,transparent_52%,rgb(255_255_255_/_0.04))] after:content-[''] sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--elo-yellow-500)]">
            Seu Elo
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{selectedElo.name}</h2>
          <p className="mt-1 text-sm text-[var(--elo-neutral-400)]">
            {selectedElo.focus}
          </p>
        </div>
        <AgentOrb preset={selectedElo.preset} size={92} state="idle" />
      </div>

      <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--elo-neutral-300)]">
        {selectedElo.description}
      </p>

      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
        <fieldset className="m-0 flex gap-2 border-0 p-0">
          <legend className="sr-only">Escolha seu Elo</legend>
          {elos.map((elo) => {
            const isSelected = elo.id === selectedElo.id

            return (
              <button
                aria-label={`Escolher o Elo ${elo.name}: ${elo.focus}`}
                aria-pressed={isSelected}
                className={`relative grid size-11 place-items-center rounded-full border transition-transform active:scale-95 ${
                  isSelected
                    ? 'border-[var(--elo-yellow-500)] bg-white/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
                key={elo.id}
                onClick={() => setSelectedEloId(elo.id)}
                type="button"
              >
                <AgentOrb preset={elo.preset} size={28} state="idle" />
                <span className="sr-only">{elo.name}</span>
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
        Cada participante tem seu Elo. Conversas, memória e permissões não se
        misturam.
      </p>
    </section>
  )
}
