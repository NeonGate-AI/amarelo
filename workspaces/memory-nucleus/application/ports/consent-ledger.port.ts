export interface AppendConsentEntryInput {
  readonly capability: 'persist' | 'retrieve' | 'project' | 'share' | 'delete'
  readonly effectiveAt: string
  readonly evidenceRef?: string
  readonly expectedVersion: number
  readonly policyVersion: string
  readonly purpose: string
  readonly resourceScope: Readonly<Record<string, unknown>>
  readonly source: 'user-ui' | 'user-voice' | 'contract' | 'admin' | 'system-policy'
  readonly status: 'granted' | 'revoked'
  readonly subjectId: string
  readonly tenantId: string
}

/** Application-owned append-only consent boundary. */
export abstract class ConsentLedgerPort {
  abstract append(input: AppendConsentEntryInput): Promise<number>
}
