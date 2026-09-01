import { z } from 'zod'

import {
  MemoryIdentifierSchema,
  MemoryTimestampSchema
} from './memory-record.contract.js'

export const MemoryPurgeStatusSchema = z.enum([
  'completed',
  'not-required',
  'pending'
])
export type MemoryPurgeStatus = z.infer<typeof MemoryPurgeStatusSchema>

const MemoryDeletionReceiptBaseShape = {
  memoryId: MemoryIdentifierSchema,
  receiptId: MemoryIdentifierSchema,
  requestedAt: MemoryTimestampSchema,
  tombstonedAt: MemoryTimestampSchema
}

const CompletedMemoryDeletionReceiptSchema = z
  .object({
    ...MemoryDeletionReceiptBaseShape,
    purgeBy: MemoryTimestampSchema.nullable(),
    purgeStatus: z.literal('completed')
  })
  .strict()

const NotRequiredMemoryDeletionReceiptSchema = z
  .object({
    ...MemoryDeletionReceiptBaseShape,
    purgeBy: z.null(),
    purgeStatus: z.literal('not-required')
  })
  .strict()

const PendingMemoryDeletionReceiptSchema = z
  .object({
    ...MemoryDeletionReceiptBaseShape,
    purgeBy: MemoryTimestampSchema,
    purgeStatus: z.literal('pending')
  })
  .strict()

export const MemoryDeletionReceiptSchema = z
  .discriminatedUnion('purgeStatus', [
    CompletedMemoryDeletionReceiptSchema,
    NotRequiredMemoryDeletionReceiptSchema,
    PendingMemoryDeletionReceiptSchema
  ])
  .superRefine((receipt, context) => {
    if (Date.parse(receipt.requestedAt) > Date.parse(receipt.tombstonedAt)) {
      context.addIssue({
        code: 'custom',
        message: 'tombstonedAt must not precede requestedAt',
        path: ['tombstonedAt']
      })
    }

    if (
      receipt.purgeBy !== null &&
      Date.parse(receipt.tombstonedAt) > Date.parse(receipt.purgeBy)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'purgeBy must not precede tombstonedAt',
        path: ['purgeBy']
      })
    }
  })
export type MemoryDeletionReceipt = z.output<typeof MemoryDeletionReceiptSchema>
