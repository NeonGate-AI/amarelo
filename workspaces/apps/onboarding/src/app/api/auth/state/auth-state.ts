export interface AuthFieldErrors {
  code?: string
  email?: string
  password?: string
  passwordConfirmation?: string
  plan?: string
  terms?: string
}

export interface AuthActionState {
  error?: string
  fieldErrors?: AuthFieldErrors
}

export interface OnboardingActionState {
  error?: string
}

export const INITIAL_AUTH_STATE: AuthActionState = {}
export const INITIAL_ONBOARDING_STATE: OnboardingActionState = {}
