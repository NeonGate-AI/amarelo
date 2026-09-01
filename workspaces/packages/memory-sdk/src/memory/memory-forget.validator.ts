import { MemoryDeletionReceiptSchema } from './memory-forget.contract.js'

export function createMemoryDeletionReceiptSchema(memoryId: string) {
  return MemoryDeletionReceiptSchema.superRefine((receipt, context) => {
    if (receipt.memoryId !== memoryId) {
      context.addIssue({
        code: 'custom',
        message: 'deletion receipt must identify the requested memory',
        path: ['memoryId']
      })
    }
  })
}
