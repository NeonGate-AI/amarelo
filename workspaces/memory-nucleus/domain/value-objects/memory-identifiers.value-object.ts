import { z } from 'zod'

export const MemoryIdentifierSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u)

export const PurposeCodeSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._:-]{0,79}$/)

export type PurposeCode = z.infer<typeof PurposeCodeSchema>
