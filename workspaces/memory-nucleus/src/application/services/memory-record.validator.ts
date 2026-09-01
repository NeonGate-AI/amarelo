import type {
  MemoryAuthorType,
  MemoryProvenance
} from '#application/contracts/memory-retrieval.contract'
import { MEMORY_AUTHOR_TYPES } from '#application/contracts/memory-retrieval.contract'
import { InvalidAuthorizedMemoryQueryError } from '#application/contracts/memory-retrieval.error'
import type { RepositoryMemoryRecord } from '#application/ports/memory-repository.port'

export const MAX_IDENTIFIER_CHARACTERS = 200
export const MAX_CATEGORIES = 32
/**
 * Storage-facing ceiling chosen to stay well below the 600-token assembled
 * budget after metadata/provenance overhead. Adapters must apply it before
 * materializing private text.
 */
export const MAX_RECORD_CHARACTERS = 1_200
export const MAX_SERIALIZED_RECORD_CHARACTERS = 2_400

const MAX_SOURCE_ARTIFACT_IDS = 32
const INEXACT_TEMPORAL_PRECISIONS = new Set([
  'approximate',
  'day',
  'life-period',
  'month',
  'year'
])
const UTC_ISO_8601_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u
const CANONICAL_MEMORY_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isCanonicalMemoryIdentifier(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_MEMORY_IDENTIFIER.test(value)
}

export function isBoundedNonEmptyString(value: unknown): value is string {
  return isCanonicalMemoryIdentifier(value)
}

export function isMemoryAuthorType(value: unknown): value is MemoryAuthorType {
  return (
    typeof value === 'string' &&
    (MEMORY_AUTHOR_TYPES as readonly string[]).includes(value)
  )
}

export function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function hasBoundedSerializedSize(
  value: unknown,
  maximumCharacters = MAX_SERIALIZED_RECORD_CHARACTERS
): boolean {
  try {
    const serialized = JSON.stringify(value)
    return (
      typeof serialized === 'string' &&
      Array.from(serialized).length <= maximumCharacters
    )
  } catch {
    return false
  }
}

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

  if (!Number.isFinite(parsed)) {
    return null
  }

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

export function hasValidMemoryProvenance(
  provenance: MemoryProvenance | null | undefined
): provenance is MemoryProvenance {
  if (
    provenance === null ||
    provenance === undefined ||
    !isBoundedNonEmptyString(provenance.authorId) ||
    !isMemoryAuthorType(provenance.authorType) ||
    parseStoredTimestamp(provenance.createdAt) === null ||
    (provenance.transformationId !== undefined &&
      provenance.transformationId !== null &&
      !isBoundedNonEmptyString(provenance.transformationId)) ||
    !Array.isArray(provenance.sourceArtifactIds) ||
    provenance.sourceArtifactIds.length === 0 ||
    provenance.sourceArtifactIds.length > MAX_SOURCE_ARTIFACT_IDS
  ) {
    return false
  }

  return provenance.sourceArtifactIds.every(isBoundedNonEmptyString)
}

export function cloneMemoryProvenance(
  provenance: MemoryProvenance
): MemoryProvenance {
  return Object.freeze({
    ...provenance,
    sourceArtifactIds: Object.freeze([...provenance.sourceArtifactIds])
  })
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

/** Validates kind-discriminated temporal payload before materialization. */
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

/** Applies [fromInclusive, toExclusive) to occurrence/application time. */
export function isMemoryEligibleForTimeWindow(
  record: RepositoryMemoryRecord,
  fromInclusiveEpoch: number | null,
  toExclusiveEpoch: number | null
): boolean {
  if (!hasValidMemoryTemporalSemantics(record)) {
    return false
  }

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

/** Sort anchor uses domain time, never observation/ingestion time. */
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
