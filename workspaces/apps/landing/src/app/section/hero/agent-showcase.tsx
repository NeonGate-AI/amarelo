'use client'

import { Check, LockKey } from '@phosphor-icons/react'
import { AgentOrb } from '@repo/react/ui/agent-orb'
import type { MouseEvent } from 'react'
import { useState } from 'react'

import { Chroma } from '@repo/react/vendors/smoothui'

import { type AgentId, agentOptions } from './agents'

export function AgentShowcase() {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('ana')

  const selectedAgent =
    agentOptions.find((agent) => agent.id === selectedAgentId) ??
    agentOptions[0]

  function handleAgentSelect(event: MouseEvent<HTMLButtonElement>) {
    const agentId = event.currentTarget.dataset.agentId as AgentId | undefined

    if (agentId) {
      setSelectedAgentId(agentId)
    }
  }

  return (
    <section
      className="relative w-[min(100%,44rem)] self-center overflow-hidden rounded-[1.35rem] border border-[color-mix(in_srgb,var(--border)_82%,transparent)] bg-[color-mix(in_srgb,var(--card)_86%,transparent)] p-[clamp(1rem,2.4vw,1.5rem)] shadow-[0_2rem_5rem_var(--elo-color-shadow)] backdrop-blur-[1.5rem] before:pointer-events-none before:absolute before:top-[-7rem] before:right-[-6rem] before:size-72 before:rounded-full before:bg-[radial-gradient(circle,rgb(250_215_21_/_16%),transparent_68%)] before:content-[''] min-[34.0625rem]:rounded-[1.75rem] min-[64.0625rem]:col-start-2 min-[64.0625rem]:row-span-2 min-[64.0625rem]:row-start-1 min-[64.0625rem]:w-full"
      aria-label="Escolha um Elo para conversar"
    >
      <div className="relative z-2 flex items-start justify-between gap-4">
        <div>
          <p className="mb-[.35rem] text-[.67rem] font-[720] tracking-[.12em] text-muted-foreground uppercase">
            Escolha um Elo
          </p>
          <h2 className="m-0 text-[1.2rem] font-[680] tracking-[-.035em] min-[34.0625rem]:text-[clamp(1.25rem,2vw,1.55rem)]">
            Com quem você quer começar?
          </h2>
        </div>
      </div>

      <Chroma
        className="mt-5 min-h-96 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--border)_72%,transparent)] bg-[color-mix(in_srgb,var(--background)_72%,transparent)] min-[34.0625rem]:min-h-[15.5rem]"
        transitionKey={selectedAgentId}
      >
        <div
          className="grid min-h-96 grid-cols-1 items-center gap-4 p-[.85rem] text-center min-[34.0625rem]:min-h-[15.5rem] min-[34.0625rem]:grid-cols-[minmax(8.5rem,11rem)_minmax(0,1fr)] min-[34.0625rem]:p-5 min-[34.0625rem]:text-left min-[48.0625rem]:grid-cols-[12.5rem_minmax(0,1fr)]"
          aria-live="polite"
        >
          <div className="grid min-h-[10.5rem] scale-[.82] place-items-center motion-reduce:scale-100 min-[34.0625rem]:min-h-48 min-[48.0625rem]:scale-100">
            <AgentOrb
              preset={selectedAgent.preset}
              size={192}
              state="listening"
            />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center justify-center gap-[.4rem] text-[.68rem] font-bold tracking-[.04em] text-[var(--elo-color-success-fg)] uppercase min-[34.0625rem]:justify-start">
              <LockKey aria-hidden="true" size={16} weight="fill" />
              Privado por padrão
            </span>
            <p className="mt-[.55rem] text-[clamp(2.1rem,4vw,3.25rem)] font-[760] leading-[.95] tracking-[-.06em]">
              {selectedAgent.name}
            </p>
            <p className="mt-[.65rem] text-[.92rem] font-[620] leading-[1.35]">
              {selectedAgent.focus}
            </p>
            <p className="mx-auto mt-[.6rem] max-w-[35ch] text-[.78rem] leading-[1.55] text-muted-foreground min-[34.0625rem]:mx-0 min-[34.0625rem]:max-w-none">
              {selectedAgent.description}
            </p>
          </div>
        </div>
      </Chroma>

      <fieldset className="mt-3 grid grid-cols-3 gap-[.55rem] border-0 p-0">
        <legend className="sr-only">Elos disponíveis</legend>
        {agentOptions.map((agent) => {
          const isSelected = agent.id === selectedAgentId

          return (
            <button
              aria-label={`${agent.name}: ${agent.focus}`}
              aria-pressed={isSelected}
              className="relative grid min-h-[4.65rem] min-w-0 cursor-pointer grid-cols-1 items-center justify-items-center gap-[.28rem] rounded-2xl border border-border bg-[color-mix(in_srgb,var(--card)_78%,transparent)] px-[.35rem] py-[.55rem] text-center text-foreground [transition:border-color_160ms_ease,background-color_160ms_ease,transform_160ms_ease] hover:border-ring hover:-translate-y-[.1rem] aria-pressed:border-[var(--elo-color-selection-border)] aria-pressed:bg-[var(--elo-color-selection-bg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 min-[34.0625rem]:min-h-17 min-[34.0625rem]:grid-cols-[2.625rem_minmax(0,1fr)] min-[34.0625rem]:justify-items-stretch min-[34.0625rem]:gap-[.55rem] min-[34.0625rem]:p-[.65rem] min-[34.0625rem]:text-left"
              data-agent-id={agent.id}
              key={agent.id}
              type="button"
              onClick={handleAgentSelect}
            >
              <AgentOrb preset={agent.preset} size={42} state="idle" />
              <span className="min-w-0">
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[.82rem] font-[680]">
                  {agent.name}
                </span>
                <small className="mt-[.12rem] hidden overflow-hidden text-ellipsis whitespace-nowrap text-[.64rem] text-muted-foreground min-[34.0625rem]:block">
                  {agent.shortFocus}
                </small>
              </span>
              {isSelected ? (
                <Check
                  aria-hidden="true"
                  className="absolute top-[.35rem] right-[.35rem] text-[var(--elo-color-fg-brand)] min-[34.0625rem]:top-[.45rem] min-[34.0625rem]:right-[.45rem]"
                  size={16}
                  weight="bold"
                />
              ) : null}
            </button>
          )
        })}
      </fieldset>

      <p className="mt-[.9rem] mr-[.2rem] mb-[.05rem] ml-[.2rem] text-center text-[.68rem] leading-[1.5] text-muted-foreground">
        Os Elos ajudam você a começar por um tema. Eles não definem você nem
        realizam diagnóstico.
      </p>
    </section>
  )
}
