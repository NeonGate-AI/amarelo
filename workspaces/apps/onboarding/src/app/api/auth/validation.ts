import { isPlanId, type PlanId } from '@data'
import type { AuthFieldErrors } from '@lib/auth/auth-state'

export interface SignInInput {
  email: string
  password: string
  remember: boolean
}

export interface SignUpInput extends SignInInput {
  passwordConfirmation: string
  plan: PlanId
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MINIMUM_PASSWORD_LENGTH = 8

export function parseSignInInput(formData: FormData): {
  fieldErrors: AuthFieldErrors
  input: SignInInput
} {
  const input = {
    email: readString(formData, 'email').trim().toLowerCase(),
    password: readString(formData, 'password'),
    remember: formData.get('remember') === 'on'
  }
  const fieldErrors: AuthFieldErrors = {}

  if (!EMAIL_PATTERN.test(input.email)) {
    fieldErrors.email = 'Digite um endereço de e-mail válido.'
  }

  if (input.password.length < MINIMUM_PASSWORD_LENGTH) {
    fieldErrors.password = 'A senha deve ter pelo menos 8 caracteres.'
  }

  return { fieldErrors, input }
}

export function parseSignUpInput(formData: FormData): {
  fieldErrors: AuthFieldErrors
  input: SignUpInput
} {
  const { fieldErrors, input: signInInput } = parseSignInInput(formData)
  const planValue = readString(formData, 'plan')
  const passwordConfirmation = readString(formData, 'passwordConfirmation')
  const termsAccepted = formData.get('terms') === 'on'
  const plan = isPlanId(planValue) ? planValue : 'essencial'

  if (!isPlanId(planValue)) {
    fieldErrors.plan = 'Escolha um plano para continuar.'
  }

  if (!termsAccepted) {
    fieldErrors.terms = 'Confirme que leu os termos essenciais.'
  }

  if (!passwordConfirmation) {
    fieldErrors.passwordConfirmation = 'Confirme sua senha.'
  } else if (passwordConfirmation !== signInInput.password) {
    fieldErrors.passwordConfirmation = 'As senhas não coincidem.'
  }

  return {
    fieldErrors,
    input: {
      ...signInInput,
      passwordConfirmation,
      plan
    }
  }
}

function readString(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName)
  return typeof value === 'string' ? value : ''
}
