import { z } from 'zod'

const IdentityIdentifierSchema = z.string().min(1).max(200)

export const AuthenticatedIdentitySchema = z
  .object({
    actorId: IdentityIdentifierSchema,
    authenticationSessionId: IdentityIdentifierSchema,
    expiresAtMs: z.number().int().positive(),
    subjectId: IdentityIdentifierSchema,
    tenantId: IdentityIdentifierSchema
  })
  .strict()

export type AuthenticatedIdentity = z.infer<typeof AuthenticatedIdentitySchema>

export type ConversationAuthenticator = (
  cookieHeader: string | undefined
) => Promise<AuthenticatedIdentity | null>
