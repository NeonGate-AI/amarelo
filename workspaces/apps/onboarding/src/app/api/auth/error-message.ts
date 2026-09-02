import {
  AuthenticationException,
  BadRequestException,
  ConflictException,
  UnauthorizedException
} from '@workos-inc/node'

import { AuthConfigurationError } from '@lib/auth/configuration'

export type AuthErrorContext = 'sign-in' | 'sign-up' | 'verify'

export function getAuthErrorMessage(
  error: unknown,
  context: AuthErrorContext
): string {
  if (error instanceof AuthConfigurationError) {
    return error.message
  }

  if (error instanceof ConflictException) {
    return 'Já existe uma conta com este e-mail. Entre para continuar.'
  }

  if (error instanceof UnauthorizedException) {
    return 'E-mail ou senha incorretos.'
  }

  if (error instanceof AuthenticationException) {
    if (error.code === 'email_verification_required') {
      return 'Confirme o código enviado ao seu e-mail para continuar.'
    }

    return 'Sua conta exige uma etapa adicional de segurança. Tente novamente ou recupere o acesso.'
  }

  if (error instanceof BadRequestException) {
    if (context === 'sign-in') {
      return 'E-mail ou senha incorretos.'
    }

    if (context === 'verify') {
      return 'O código não é válido ou expirou. Solicite um novo código.'
    }

    return 'Revise os dados da conta. A senha precisa atender à política configurada no WorkOS.'
  }

  return 'Não foi possível concluir agora. Tente novamente em alguns instantes.'
}
