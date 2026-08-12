'use client'

import { type FormEvent, useState } from 'react'
import { CheckCircle, LockKey, NotePencil } from '@phosphor-icons/react'

import { Button } from '@repo/react-web/vendors/shadcn/button'
import { Dialog } from '@repo/react-web/vendors/shadcn/dialog'

interface NewEntryDialogProps {
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function NewEntryDialog(props: NewEntryDialogProps) {
  const { onOpenChange, open } = props
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setError('')
      setSaved(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const content = String(formData.get('content') ?? '').trim()

    if (content.length < 8) {
      setError('Escreva pelo menos uma frase curta para salvar o registro.')
      return
    }

    setError('')
    setSaved(true)
  }

  return (
    <Dialog
      description="Registre um check-in, uma nota ou um evento. Nada será compartilhado automaticamente."
      onOpenChange={handleOpenChange}
      open={open}
      title="Novo registro"
    >
      {saved ? (
        <output className="flex min-h-64 flex-col items-center justify-center text-center">
          <CheckCircle className="text-success" size={44} weight="fill" />
          <h3 className="mt-4 text-xl font-bold">
            Registro salvo na demonstração
          </h3>
          <Button
            className="mt-5"
            onClick={() => handleOpenChange(false)}
            variant="gold"
          >
            Concluir
          </Button>
        </output>
      ) : (
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="entry-type"
          >
            Tipo de registro
            <select
              className="h-12 rounded-xl border border-input bg-background px-4 font-normal text-foreground focus:border-ring"
              defaultValue="check-in"
              id="entry-type"
              name="type"
            >
              <option value="check-in">Check-in</option>
              <option value="note">Nota livre</option>
              <option value="event">Evento importante</option>
            </select>
          </label>

          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="entry-content"
          >
            O que vale registrar agora?
            <textarea
              aria-describedby={error ? 'entry-error' : 'entry-help'}
              aria-invalid={error ? true : undefined}
              className="min-h-32 resize-y rounded-xl border border-input bg-background p-4 font-normal leading-6 text-foreground placeholder:text-muted-foreground focus:border-ring"
              id="entry-content"
              name="content"
              placeholder="Escreva no seu ritmo. Você poderá revisar antes de qualquer compartilhamento."
            />
            {error ? (
              <span
                className="text-sm text-danger"
                id="entry-error"
                role="alert"
              >
                {error}
              </span>
            ) : (
              <span
                className="font-normal text-xs text-muted-foreground"
                id="entry-help"
              >
                Evite inserir informações de terceiros sem necessidade.
              </span>
            )}
          </label>

          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="entry-agent"
          >
            Contexto da conversa
            <select
              className="h-12 rounded-xl border border-input bg-background px-4 font-normal text-foreground focus:border-ring"
              defaultValue="none"
              id="entry-agent"
              name="agent"
            >
              <option value="none">Sem agente associado</option>
              <option value="ana">Ana · relações</option>
              <option value="nico">Nico · rotina</option>
              <option value="isa">Isa · ansiedade</option>
            </select>
          </label>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-accent p-4 text-sm leading-6 text-accent-foreground">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LockKey aria-hidden="true" size={17} weight="fill" />
            </span>
            <span>
              <strong className="block">Privado por padrão</strong>
              Compartilhar exige outra ação, com pessoa, conteúdo e prazo
              definidos por você.
            </span>
          </div>

          <Button className="w-full" type="submit" variant="gold">
            <NotePencil aria-hidden="true" size={20} />
            Salvar registro privado
          </Button>
        </form>
      )}
    </Dialog>
  )
}
