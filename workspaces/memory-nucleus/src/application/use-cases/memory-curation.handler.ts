import {
  type MemoryCurationRequest,
  MemoryCurationRequestSchema,
  type MemoryCurationResult,
  MemoryCurationResultSchema
} from '@application/contracts/memory-curation.contract'
import {
  createMemoryCurationGraph,
  invokeMemoryCurationGraph,
  type MemoryCurationGraphDependencies
} from '@application/use-cases/curate-memory.use-case'

export interface MemoryCurationHandler {
  invoke(request: MemoryCurationRequest): Promise<MemoryCurationResult>
}

export const createMemoryCurationHandler = (
  dependencies: MemoryCurationGraphDependencies
): MemoryCurationHandler => {
  const graph = createMemoryCurationGraph(dependencies)
  return {
    async invoke(rawRequest) {
      const request = MemoryCurationRequestSchema.parse(rawRequest)
      const state = await invokeMemoryCurationGraph(graph, request)
      return MemoryCurationResultSchema.parse(state.result)
    }
  }
}
