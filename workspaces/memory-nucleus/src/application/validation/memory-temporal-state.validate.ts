import { InvalidAuthorizedMemoryQueryError } from '@application/contracts'
import type { RepositoryMemoryRecord } from '@application/ports'

const INEXACT_TEMPORAL_PRECISIONS = new Set([
  'approximate',
  'day',
  'life-period',
  'month',
  'year'
])
const UTC_ISO_8601_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u

function parseRequiredTimestamp(value: string, fieldName: string): number {
  const parsed = parseStoredTimestamp(value)
  if (parsed === null) {
    throw new InvalidAuthorizedMemoryQueryError(
      `${fieldName} must be a valid UTC ISO-8601 timestamp`
    )
  }
  return parsed
}

export function parseOptionalTimestamp(
  value: string | null,
  fieldName: string
): number | null {
  return value === null ? null : parseRequiredTimestamp(value, fieldName)
}

export function parseStoredTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || !UTC_ISO_8601_TIMESTAMP.test(value)) {
    return null
  }

  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return null

  const iso = new Date(parsed).toISOString()
  const fractionalMatch = value.match(/\.(\d{1,3})Z$/u)
  const normalized =
    fractionalMatch === null
      ? iso.replace('.000Z', 'Z')
      : iso.replace(/\.(\d{3})Z$/u, (_, milliseconds: string) => {
          return `.${milliseconds.slice(0, fractionalMatch[1]?.length ?? 0)}Z`
        })

  return normalized === value ? parsed : null
}

export function isWithinMemoryTimeWindow(
  instantEpoch: number,
  fromInclusiveEpoch: number | null,
  toExclusiveEpoch: number | null
): boolean {
  return (
    (fromInclusiveEpoch === null || instantEpoch >= fromInclusiveEpoch) &&
    (toExclusiveEpoch === null || instantEpoch < toExclusiveEpoch)
  )
}

function hasOwn(record: object, property: string): boolean {
  return Object.hasOwn(record, property)
}

export function hasValidMemoryTemporalSemantics(
  record: RepositoryMemoryRecord
): boolean {
  if (record.kind === 'semantic') {
    if (
      !hasOwn(record, 'validFrom') ||
      !hasOwn(record, 'validUntil') ||
      hasOwn(record, 'occurredAt') ||
      hasOwn(record, 'temporalPrecision') ||
      hasOwn(record, 'temporalReference')
    ) {
      return false
    }

    const validFromEpoch =
      record.validFrom === null ? null : parseStoredTimestamp(record.validFrom)
    const validUntilEpoch =
      record.validUntil === null
        ? null
        : parseStoredTimestamp(record.validUntil)

    return (
      (record.validFrom === null || validFromEpoch !== null) &&
      (record.validUntil === null || validUntilEpoch !== null) &&
      (validFromEpoch === null ||
        validUntilEpoch === null ||
        validFromEpoch < validUntilEpoch)
    )
  }

  if (
    hasOwn(record, 'validFrom') ||
    hasOwn(record, 'validUntil') ||
    (record.semanticKey !== undefined && record.semanticKey !== null)
  ) {
    return false
  }

  const exact =
    record.temporalPrecision === 'exact' &&
    parseStoredTimestamp(record.occurredAt) !== null &&
    record.temporalReference === null
  const inexact =
    record.occurredAt === null &&
    typeof record.temporalReference === 'string' &&
    record.temporalReference.trim().length > 0 &&
    record.temporalReference.length <= 160 &&
    INEXACT_TEMPORAL_PRECISIONS.has(record.temporalPrecision)

  return exact || inexact
}

export function isMemoryEligibleForTimeWindow(
  record: RepositoryMemoryRecord,
  fromInclusiveEpoch: number | null,
  toExclusiveEpoch: number | null
): boolean {
  if (!hasValidMemoryTemporalSemantics(record)) return false

  if (record.kind === 'episodic') {
    if (record.occurredAt === null) {
      return fromInclusiveEpoch === null && toExclusiveEpoch === null
    }

    const occurredAtEpoch = parseStoredTimestamp(record.occurredAt)
    return (
      occurredAtEpoch !== null &&
      isWithinMemoryTimeWindow(
        occurredAtEpoch,
        fromInclusiveEpoch,
        toExclusiveEpoch
      )
    )
  }

  const validFromEpoch =
    record.validFrom === null ? null : parseStoredTimestamp(record.validFrom)
  const validUntilEpoch =
    record.validUntil === null ? null : parseStoredTimestamp(record.validUntil)

  return (
    (toExclusiveEpoch === null ||
      validFromEpoch === null ||
      validFromEpoch < toExclusiveEpoch) &&
    (fromInclusiveEpoch === null ||
      validUntilEpoch === null ||
      validUntilEpoch > fromInclusiveEpoch)
  )
}

export function resolveMemoryTemporalSortEpoch(
  record: RepositoryMemoryRecord
): number | null {
  if (record.kind === 'semantic') {
    return record.validFrom === null
      ? null
      : parseStoredTimestamp(record.validFrom)
  }

  return record.occurredAt === null
    ? null
    : parseStoredTimestamp(record.occurredAt)
}
