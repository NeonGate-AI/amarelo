import type { RepositoryMemoryRecord } from '@application/ports'

/** Input must already satisfy authorization, provenance and temporal eligibility. */
export function excludeUnresolvedMemoryConflicts<
  T extends RepositoryMemoryRecord
>(eligible: readonly T[]): readonly T[] {
  const excluded = new Set<string>()
  for (let index = 0; index < eligible.length; index += 1) {
    const left = eligible[index]
    if (!left || left.kind !== 'semantic' || !left.semanticKey) continue
    for (const right of eligible.slice(index + 1)) {
      if (
        right.kind !== 'semantic' ||
        !right.semanticKey ||
        left.id === right.id ||
        left.tenantId !== right.tenantId ||
        left.subjectId !== right.subjectId ||
        left.semanticKey.normalize('NFKC').toLowerCase() !==
          right.semanticKey.normalize('NFKC').toLowerCase()
      )
        continue
      const overlaps =
        (left.validUntil === null ||
          right.validFrom === null ||
          Date.parse(left.validUntil) > Date.parse(right.validFrom)) &&
        (right.validUntil === null ||
          left.validFrom === null ||
          Date.parse(right.validUntil) > Date.parse(left.validFrom))
      if (
        overlaps &&
        left.text.normalize('NFKC').trim() !==
          right.text.normalize('NFKC').trim()
      ) {
        excluded.add(left.id)
        excluded.add(right.id)
      }
    }
  }
  return eligible.filter((record) => !excluded.has(record.id))
}
