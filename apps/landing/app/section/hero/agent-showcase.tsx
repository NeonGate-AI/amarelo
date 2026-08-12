'use client'

import { Check, LockKey } from '@phosphor-icons/react'
import { AgentOrb } from '@repo/react-web/ui/agent-orb'
import type { MouseEvent } from 'react'
import { useState } from 'react'

import { Chroma } from '@repo/react-web/vendors/smoothui'

import { type AgentId, agentOptions } from './agents'
import styles from './hero.module.css'

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
      className={styles.agentPanel}
      aria-label="Escolha um contexto de conversa"
    >
      <div className={styles.agentPanelHeader}>
        <div>
          <p className={styles.agentPanelEyebrow}>Escolha um contexto</p>
          <h2>Com quem você quer começar?</h2>
        </div>
      </div>

      <Chroma
        className={styles.agentTransition}
        transitionKey={selectedAgentId}
      >
        <div className={styles.selectedAgent} aria-live="polite">
          <div className={styles.mainOrb}>
            <AgentOrb
              animationDuration={22}
              colors={selectedAgent.colors}
              size={192}
              state="idle"
            />
          </div>
          <div className={styles.selectedAgentCopy}>
            <span className={styles.privateStatus}>
              <LockKey aria-hidden="true" size={16} weight="fill" />
              Privado por padrão
            </span>
            <p className={styles.selectedAgentName}>{selectedAgent.name}</p>
            <p className={styles.selectedAgentContext}>
              {selectedAgent.context}
            </p>
            <p className={styles.selectedAgentDescription}>
              {selectedAgent.description}
            </p>
          </div>
        </div>
      </Chroma>

      <fieldset className={styles.agentList}>
        <legend className="sr-only">Contextos disponíveis</legend>
        {agentOptions.map((agent) => {
          const isSelected = agent.id === selectedAgentId

          return (
            <button
              aria-label={`${agent.name}: ${agent.context}`}
              aria-pressed={isSelected}
              className={styles.agentButton}
              data-agent-id={agent.id}
              key={agent.id}
              type="button"
              onClick={handleAgentSelect}
            >
              <AgentOrb colors={agent.colors} size={42} state="idle" />
              <span className={styles.agentButtonCopy}>
                <span>{agent.name}</span>
                <small>{agent.shortContext}</small>
              </span>
              {isSelected ? (
                <Check
                  aria-hidden="true"
                  className={styles.selectedCheck}
                  size={16}
                  weight="bold"
                />
              ) : null}
            </button>
          )
        })}
      </fieldset>

      <p className={styles.agentFootnote}>
        Contextos ajudam a começar. Eles não definem você e não realizam
        diagnóstico.
      </p>
    </section>
  )
}
