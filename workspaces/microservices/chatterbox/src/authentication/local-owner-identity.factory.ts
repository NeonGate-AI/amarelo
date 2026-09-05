/** Stable server-owned account for the explicitly enabled, single-owner local MVP. */
export function createLocalOwnerIdentity(ownerId: string): {
  readonly actorId: string
  readonly subjectId: string
  readonly tenantId: string
} {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(ownerId))
    throw new Error('Invalid local owner identifier')
  const identifier = `local:${ownerId}`
  return Object.freeze({
    actorId: identifier,
    subjectId: identifier,
    tenantId: identifier
  })
}
