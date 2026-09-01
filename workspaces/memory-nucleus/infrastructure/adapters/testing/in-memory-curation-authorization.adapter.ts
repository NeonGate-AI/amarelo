import type {
  MemoryCurationAuthorizationDecision,
  MemoryCurationAuthorizationDecisionResolver
} from '#application/contracts/memory-curation-authorization.contract'

/** Offline/reference resolver. Production uses a deterministic policy store. */
export class InMemoryMemoryCurationAuthorizationResolver
  implements MemoryCurationAuthorizationDecisionResolver
{
  readonly #decisions: ReadonlyMap<string, MemoryCurationAuthorizationDecision>
  #resolveCalls = 0

  constructor(decisions: readonly MemoryCurationAuthorizationDecision[]) {
    this.#decisions = new Map(
      decisions.map((decision) => [decision.id, Object.freeze({ ...decision })])
    )
  }

  get diagnostics(): Readonly<{ resolveCalls: number }> {
    return { resolveCalls: this.#resolveCalls }
  }

  async resolve(
    authorizationDecisionId: string
  ): Promise<MemoryCurationAuthorizationDecision | null> {
    this.#resolveCalls += 1
    return this.#decisions.get(authorizationDecisionId) ?? null
  }
}
