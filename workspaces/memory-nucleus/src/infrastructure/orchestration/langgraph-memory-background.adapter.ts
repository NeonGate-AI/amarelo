import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type {
  MemoryBackgroundOrchestrationPort,
  MemoryBackgroundProcessResult,
  MemoryBackgroundStages
} from '@application/background'

const BackgroundState = Annotation.Root({
  route: Annotation<'claim' | 'curate' | 'complete' | 'release' | 'terminal'>(),
  outcome: Annotation<MemoryBackgroundProcessResult | null>()
})

/** Neo4j owns durability; the graph contains only transient, bounded outcomes. */
export class LangGraphMemoryBackgroundAdapter implements MemoryBackgroundOrchestrationPort {
  async run(stages: MemoryBackgroundStages): Promise<MemoryBackgroundProcessResult> {
    const errors: unknown[] = []
    let released = false
    const release = async () => {
      if (released) return
      released = true
      await stages.release()
    }

    // Compile per delivery so each invocation owns its protected execution
    // in closures. No graph checkpoint or transcript store is added.
    const graph = new StateGraph(BackgroundState)
      .addNode('claim_and_admit', async () => {
        try {
          const outcome = await stages.claimAndAdmit()
          return { route: outcome === null ? 'curate' as const : 'terminal' as const, outcome }
        } catch (error) {
          errors.push(error)
          return { route: 'release' as const }
        }
      })
      .addNode('curate_memory', async () => {
        try {
          await stages.curate()
          return { route: 'complete' as const }
        } catch (error) {
          errors.push(error)
          return { route: 'release' as const }
        }
      })
      .addNode('complete_claim', async () => {
        try {
          const outcome = await stages.complete()
          return { route: 'terminal' as const, outcome }
        } catch (error) {
          errors.push(error)
          return { route: 'release' as const }
        }
      })
      .addNode('release_claim', async () => {
        await release()
        return { route: 'terminal' as const }
      })
      .addEdge(START, 'claim_and_admit')
      .addConditionalEdges('claim_and_admit', (state) => state.route, {
        curate: 'curate_memory',
        terminal: END,
        release: 'release_claim'
      })
      .addConditionalEdges('curate_memory', (state) => state.route, {
        complete: 'complete_claim',
        release: 'release_claim'
      })
      .addConditionalEdges('complete_claim', (state) => state.route, {
        terminal: END,
        release: 'release_claim'
      })
      .addEdge('release_claim', END)
      .compile()

    try {
      const output = await graph.invoke(
        { route: 'claim', outcome: null },
        { recursionLimit: 8, callbacks: [], runName: 'memory-background-v1' }
      )
      if (errors.length > 0) throw errors[0]
      if (output.outcome === null) throw new Error('Background graph produced no outcome')
      return output.outcome
    } catch (error) {
      await release()
      throw error
    }
  }
}
