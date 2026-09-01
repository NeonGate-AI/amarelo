import {
  MemoryAuthorizationDecisionResolver,
  type MemoryAuthorizationDecision
} from '#application/ports/memory-authorization.port'

/** Offline/reference resolver. Production uses a deterministic policy store. */
export class InMemoryMemoryAuthorizationResolver
  extends MemoryAuthorizationDecisionResolver
{
  readonly #decisions: ReadonlyMap<string, MemoryAuthorizationDecision>
  #resolveCalls = 0

  constructor(decisions: readonly MemoryAuthorizationDecision[]) {
    super()
    this.#decisions = new Map(
      decisions.map((decision) => [
        decision.id,
        Object.freeze({
          ...decision,
          kinds: Object.freeze([...decision.kinds]),
          categories: Object.freeze([...decision.categories]),
          timeWindow: Object.freeze({ ...decision.timeWindow })
        })
      ])
    )
  }

  get diagnostics(): Readonly<{ resolveCalls: number }> {
    return { resolveCalls: this.#resolveCalls }
  }

  async resolve(
    authorizationDecisionId: string
  ): Promise<MemoryAuthorizationDecision | null> {
    this.#resolveCalls += 1
    return this.#decisions.get(authorizationDecisionId) ?? null
  }
}
