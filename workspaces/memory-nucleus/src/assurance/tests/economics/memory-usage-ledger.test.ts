import { describe, expect, it } from 'vitest'

import { MemoryUsageLedgerEntrySchema } from '@application/contracts'
import { RecordMemoryUsageUseCase } from '@application/use-cases'
import { InMemoryMemoryUsageLedger } from '@infrastructure/adapters/testing'
import {
  memoryUsageLedgerFixture,
  pricedMemoryUsageLedgerFixture,
  memoryBrlConversionFixture
} from '@assurance/fixtures/economics'

describe('Memory usage ledger contract', () => {
  it('preserves unknown cost and rejects a calculated zero without usage and pricing', () => {
    const entry = memoryUsageLedgerFixture()
    expect(MemoryUsageLedgerEntrySchema.parse(entry)).toEqual(entry)
    expect(
      MemoryUsageLedgerEntrySchema.safeParse({
        ...entry,
        cost: {
          sourceAmount: 0,
          sourceCurrency: 'USD',
          brlAmount: null,
          evidence: 'calculated',
          calculationVersion: 'calculation-v1'
        }
      }).success
    ).toBe(false)
  })

  it('retains known original cost while requiring complete usage, prices and matching FX for conversion', () => {
    const entry = pricedMemoryUsageLedgerFixture()
    const original = MemoryUsageLedgerEntrySchema.parse(entry)
    expect(original.cost.sourceAmount).toBe(0.00032)
    expect(original.cost.brlAmount).toBeNull()
    expect(
      MemoryUsageLedgerEntrySchema.safeParse({
        ...entry,
        pricingSnapshot: {
          ...entry.pricingSnapshot,
          rates: { ...entry.pricingSnapshot.rates, outputAudio: null }
        }
      }).success
    ).toBe(false)
    expect(
      MemoryUsageLedgerEntrySchema.safeParse({
        ...entry,
        usageEvent: {
          ...entry.usageEvent,
          providerUsage: {
            ...entry.usageEvent.providerUsage,
            inputAudioTokens: null
          }
        }
      }).success
    ).toBe(false)
    const converted = {
      ...entry,
      brlConversionSnapshot: memoryBrlConversionFixture(),
      cost: { ...entry.cost, brlAmount: 0.0016 }
    }
    expect(MemoryUsageLedgerEntrySchema.parse(converted).cost.brlAmount).toBe(
      0.0016
    )
    expect(
      MemoryUsageLedgerEntrySchema.safeParse({
        ...converted,
        brlConversionSnapshot: null
      }).success
    ).toBe(false)
    expect(
      MemoryUsageLedgerEntrySchema.safeParse({
        ...converted,
        brlConversionSnapshot: {
          ...converted.brlConversionSnapshot,
          sourceCurrency: 'EUR'
        }
      }).success
    ).toBe(false)
  })

  it('appends versioned text usage with unknown timings and costs through the ledger boundary', async () => {
    const ledger = new InMemoryMemoryUsageLedger({
      tenantId: 'tenant-a',
      subjectId: 'subject-a'
    })
    const record = new RecordMemoryUsageUseCase(ledger)
    expect(await record.execute(memoryUsageLedgerFixture())).toBe('inserted')
    const entries = await ledger.entries()
    expect(entries).toHaveLength(1)
    expect(
      entries[0]?.usageEvent.durations.patientSpeechMilliseconds
    ).toBeNull()
    expect(entries[0]?.cost.sourceAmount).toBeNull()
    expect(JSON.stringify(entries)).not.toContain('SYNTHETIC_PRIVATE_CONTENT')
  })

  it('deduplicates transport retries and rejects rewritten event identity while retaining separate attempts', async () => {
    const ledger = new InMemoryMemoryUsageLedger({
      tenantId: 'tenant-a',
      subjectId: 'subject-a'
    })
    const record = new RecordMemoryUsageUseCase(ledger)
    const entry = memoryUsageLedgerFixture()
    await record.execute(entry)
    expect(await record.execute(entry)).toBe('duplicate')
    await expect(
      record.execute({
        ...entry,
        usageEvent: { ...entry.usageEvent, attemptId: 'rewritten-attempt' }
      })
    ).rejects.toThrow('immutable')
    await expect(
      record.execute({
        ...entry,
        ledgerEntryId: 'new-valuation',
        usageEvent: { ...entry.usageEvent, attemptId: 'rewritten-attempt' }
      })
    ).rejects.toThrow('immutable')
    await record.execute({
      ...entry,
      ledgerEntryId: 'ledger-2',
      usageEvent: {
        ...entry.usageEvent,
        eventId: 'usage-2',
        attemptId: 'attempt-2'
      }
    })
    expect(await ledger.entries()).toHaveLength(2)
  })

  it('rejects cross-tenant and cross-subject writes before reference persistence', async () => {
    const ledger = new InMemoryMemoryUsageLedger({
      tenantId: 'tenant-a',
      subjectId: 'subject-a'
    })
    const record = new RecordMemoryUsageUseCase(ledger)
    const entry = memoryUsageLedgerFixture()
    expect(
      Reflect.set(ledger, 'scope', {
        tenantId: 'tenant-b',
        subjectId: 'subject-b'
      })
    ).toBe(false)
    await expect(
      record.execute({
        ...entry,
        usageEvent: { ...entry.usageEvent, tenantId: 'tenant-b' }
      })
    ).rejects.toThrow('scope')
    await expect(
      record.execute({
        ...entry,
        usageEvent: { ...entry.usageEvent, subjectId: 'subject-b' }
      })
    ).rejects.toThrow('scope')
    await expect(
      ledger.append(
        MemoryUsageLedgerEntrySchema.parse({
          ...entry,
          usageEvent: { ...entry.usageEvent, subjectId: 'subject-b' }
        })
      )
    ).rejects.toThrow('scope')
    expect(await ledger.entries()).toHaveLength(0)
  })

  it('keeps pricing and FX snapshots immutable and appends explicit revaluations', async () => {
    const ledger = new InMemoryMemoryUsageLedger({
      tenantId: 'tenant-a',
      subjectId: 'subject-a'
    })
    const record = new RecordMemoryUsageUseCase(ledger)
    const original = pricedMemoryUsageLedgerFixture()
    const entry = {
      ...original,
      brlConversionSnapshot: memoryBrlConversionFixture(),
      cost: { ...original.cost, brlAmount: 0.0016 }
    }
    await record.execute(entry)
    await expect(
      record.execute({
        ...entry,
        ledgerEntryId: 'revaluation-1',
        pricingSnapshot: {
          ...entry.pricingSnapshot,
          sourceReference: 'rewritten-source'
        }
      })
    ).rejects.toThrow('immutable')
    await expect(
      record.execute({
        ...entry,
        ledgerEntryId: 'revaluation-1',
        brlConversionSnapshot: {
          ...entry.brlConversionSnapshot,
          sourceReference: 'rewritten-source'
        }
      })
    ).rejects.toThrow('immutable')
    await record.execute({
      ...entry,
      ledgerEntryId: 'revaluation-1',
      brlConversionSnapshot: {
        ...entry.brlConversionSnapshot,
        rateVersion: 'synthetic-fx-v2',
        brlPerSourceCurrencyUnit: 6
      },
      cost: { ...entry.cost, brlAmount: 0.00192 }
    })
    entry.pricingSnapshot.rates.inputText = 99
    const entries = await ledger.entries()
    expect(entries).toHaveLength(2)
    expect(entries[0]?.cost.brlAmount).toBe(0.0016)
    expect(entries[1]?.cost.brlAmount).toBe(0.00192)
    expect(entries[0]?.pricingSnapshot?.rates.inputText).toBe(2)
    const rates = entries[0]?.pricingSnapshot?.rates
    expect(rates).toBeDefined()
    if (rates === undefined) throw new Error('Expected pricing snapshot')
    expect(Reflect.set(rates, 'inputText', 99)).toBe(false)
  })
})
