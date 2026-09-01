export class InvalidKnowledgeRetrievalQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidKnowledgeRetrievalQueryError'
  }
}

export class KnowledgeRepositoryScopeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KnowledgeRepositoryScopeError'
  }
}
