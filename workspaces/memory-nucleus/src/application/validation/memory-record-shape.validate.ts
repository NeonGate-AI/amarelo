import type {
  MemoryAuthorType,
  MemoryProvenance
} from '@application/contracts/memory-retrieval.contract'
import { MEMORY_AUTHOR_TYPES } from '@application/contracts/memory-retrieval.contract'
import { parseStoredTimestamp } from '@application/validation/memory-temporal-state.validate'

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
