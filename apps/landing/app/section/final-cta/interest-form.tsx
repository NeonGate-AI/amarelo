'use client'

import { ArrowRight, CheckCircle, LockKey } from '@phosphor-icons/react'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  SmoothButton,
  type FormErrors
} from '@repo/react-web/vendors/smoothui'
import { type FormEvent, useState } from 'react'

const inputClassName =
  'min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary-hover focus:ring-2 focus:ring-ring/25'

export function InterestForm() {
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const interest = String(data.get('interest') ?? '')
    const consent = data.get('consent') === 'on'
    const nextErrors: FormErrors = {}

    if (name.length < 2) {
      nextErrors.name = 'Digite como você gostaria de ser chamado.'
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Digite um e-mail válido.'
    }
    if (!interest) {
      nextErrors.interest = 'Escolha uma forma de participação.'
    }
    if (!consent) {
      nextErrors.consent = 'Confirme que podemos registrar seu interesse.'
    }

    setErrors(nextErrors)
    setSubmitted(Object.keys(nextErrors).length === 0)
  }

  if (submitted) {
    return (
      <output className="mx-auto flex min-h-96 w-full max-w-124 flex-col items-center justify-center rounded-3xl border border-primary-foreground/20 bg-card p-8 text-center text-card-foreground shadow-2xl">
        <CheckCircle
          aria-hidden="true"
          className="text-success"
          size={42}
          weight="fill"
        />
        <h3 className="mt-5 font-heading text-xl font-semibold">
          Interesse registrado nesta demonstração.
        </h3>
        <p className="mt-3 max-w-[34ch] text-sm leading-6 text-muted-foreground">
          A interface está pronta para integração.
        </p>
        <button
          className="mt-6 min-h-11 rounded-full border border-border px-4 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring"
          onClick={() => setSubmitted(false)}
          type="button"
        >
          Voltar ao formulário
        </button>
      </output>
    )
  }

  return (
    <div className="mx-auto w-full max-w-124 rounded-3xl border border-primary-foreground/20 bg-card p-5 text-card-foreground shadow-2xl sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <LockKey aria-hidden="true" size={18} weight="fill" />
        </span>
        <div>
          <h3 className="font-heading text-lg font-semibold">
            Quero acompanhar o Amarelo
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Não inclua informações de saúde neste formulário.
          </p>
        </div>
      </div>

      <Form errors={errors} onFormSubmit={handleSubmit}>
        <FormField name="name">
          <FormLabel>Como podemos chamar você?</FormLabel>
          <FormControl>
            <input
              autoComplete="name"
              className={inputClassName}
              name="name"
              placeholder="Seu primeiro nome"
              type="text"
            />
          </FormControl>
          <FormMessage />
        </FormField>

        <FormField name="email">
          <FormLabel>E-mail</FormLabel>
          <FormControl>
            <input
              autoComplete="email"
              className={inputClassName}
              inputMode="email"
              name="email"
              placeholder="voce@exemplo.com"
              type="email"
            />
          </FormControl>
          <FormMessage />
        </FormField>

        <FormField name="interest">
          <FormLabel>Como gostaria de participar?</FormLabel>
          <FormControl>
            <select className={inputClassName} defaultValue="" name="interest">
              <option disabled value="">
                Selecione uma opção
              </option>
              <option value="research">Conversar com a pesquisa</option>
              <option value="prototype">Testar um protótipo</option>
              <option value="updates">Só receber novidades</option>
            </select>
          </FormControl>
          <FormDescription>
            Participar de pesquisa ou teste sempre exigirá um novo convite.
          </FormDescription>
          <FormMessage />
        </FormField>

        <FormField name="consent">
          <div className="grid grid-cols-[auto_1fr] items-start gap-3 pt-1">
            <FormControl className="rounded">
              <input
                className="mt-0.5 size-4.5 accent-primary-hover"
                name="consent"
                type="checkbox"
              />
            </FormControl>
            <FormLabel className="text-xs leading-5 text-muted-foreground">
              Concordo com o registro local do meu interesse nesta demonstração.
            </FormLabel>
          </div>
          <FormMessage />
        </FormField>

        <SmoothButton
          className="mt-1 w-full"
          color="neutral"
          shape="pill"
          size="lg"
          type="submit"
          variant="solid"
        >
          Registrar interesse
          <ArrowRight aria-hidden="true" size={18} />
        </SmoothButton>
      </Form>

      <p className="mt-3 text-center text-[0.67rem] text-muted-foreground">
        Demonstração sem transmissão ou persistência de dados.
      </p>
    </div>
  )
}
