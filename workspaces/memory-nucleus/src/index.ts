// Public composition API; internal directory barrels retain their own module boundaries.
export {
  CanonicalMemoryKindSchema,
  CanonicalMemoryStateSchema,
  CanonicalMemorySensitivitySchema,
  CanonicalMemorySchema,
  MemoryEntity,
  MemoryKindSchema,
  MEMORY_CANDIDATE_SCHEMA_VERSION,
  MemoryConfidenceSchema,
  MemoryTemporalPrecisionSchema,
  ExtractedMemoryCandidateSchema,
  MemoryCandidateProvenanceSchema,
  MemoryCandidateSchema,
  MemoryCandidateEntity,
  MemoryEvidenceSourceSchema,
  MemoryEvidenceSchema,
  MemoryCapabilitySchema,
  MemoryConsentStatusSchema,
  MemoryConsentLedgerEntrySchema
} from './domain/entities'
export type {
  CanonicalMemoryKind,
  CanonicalMemoryState,
  CanonicalMemorySensitivity,
  CanonicalMemory,
  MemoryKind,
  MemoryConfidence,
  MemoryTemporalPrecision,
  ExtractedMemoryCandidate,
  MemoryCandidateProvenance,
  MemoryCandidate,
  MemoryEvidence,
  MemoryConsentLedgerEntry
} from './domain/entities'
export { MemoryJudgment } from './domain/value-objects'
export type { MemoryJudgmentDecision } from './domain/value-objects'
export { MemoryAcceptancePolicy } from './domain/policies'
export type { MemoryAcceptanceCandidate } from './domain/policies'
export { calculateMemoryEconomics } from './domain/services'
export type {
  MemoryEconomicsInput,
  MemoryEconomicsMetrics
} from './domain/services'
export {
  MemoryIdentifierSchema,
  PurposeCodeSchema
} from './domain/schemas'
export type { PurposeCode } from './domain/schemas'
export {
  MemoryFormationSignalSchema,
  MemoryCurationIdentifierSchema,
  MemoryAuthorizationSchema,
  ConversationSpeakerSchema,
  ConversationTurnSchema,
  MemoryCurationRequestSchema,
  PreparedConversationTurnSchema,
  PreparedMemorySourceSchema,
  MemoryCurationSkipReasonSchema,
  MemoryCurationGateDecisionSchema,
  MemoryCurationUsageSchema,
  MemoryCurationStatusSchema,
  MemoryCurationResultSchema,
  MemoryCurationAuthorizationDecisionStatusSchema,
  MemoryCurationAuthorizationDecisionSchema,
  MEMORY_AUTHOR_TYPES,
  DEFAULT_MEMORY_RETRIEVAL_BUDGETS,
  InvalidAuthorizedMemoryQueryError,
  MemoryRepositoryScopeError,
  MemoryRetrievalObservationError,
  MemoryAuthorizationDecisionError
} from './application/contracts'
export type {
  MemoryFormationSignal,
  MemoryAuthorization,
  ConversationSpeaker,
  ConversationTurn,
  MemoryCurationRequest,
  PreparedConversationTurn,
  PreparedMemorySource,
  MemoryCurationSkipReason,
  MemoryCurationGateDecision,
  MemoryCurationUsage,
  MemoryCurationStatus,
  MemoryCurationResult,
  MemoryCurationAuthorizationDecisionStatus,
  MemoryCurationAuthorizationDecision,
  MemoryCurationAuthorizationDecisionResolver,
  ResolvedMemoryCurationAuthorization,
  MemoryAuthorType,
  MemoryLifecycle,
  MemoryProvenance,
  MemoryTimeWindow,
  MemoryRetrievalBudgets,
  AuthorizedMemoryQuery,
  MemoryMatchType,
  RetrievedSemanticMemoryContext,
  RetrievedExactEpisodicMemoryContext,
  RetrievedInexactEpisodicMemoryContext,
  RetrievedEpisodicMemoryContext,
  RetrievedMemoryContext,
  RetrievedSemanticMemoryData,
  RetrievedExactEpisodicMemoryData,
  RetrievedInexactEpisodicMemoryData,
  RetrievedEpisodicMemoryData,
  RetrievedMemoryData,
  EffectiveMemoryRetrievalBudgets,
  AuthorizedMemoryRetrievalDiagnostics,
  AuthorizedMemoryRetrievalResult,
  MemoryRetrievalObservationFailure,
  MemoryAuthorizationDecisionFailure
} from './application/contracts'
export {
  MemoryAuthorizationDecisionResolver,
  SourceClaimRequestSchema,
  SourceClaimStatusSchema,
  SourceClaimResultSchema,
  SaveCurationRunRequestSchema,
  SaveCurationRunResultSchema,
  MemoryPersistenceClient,
  MemoryExtractionSchema,
  MemoryModelUsageSchema,
  MemoryExtractionDeadlineMillisecondsSchema,
  MemoryExtractionDeadlineError,
  MemoryExtractor,
  ScopedMemoryRepository,
  MEMORY_RETRIEVAL_POLICY_VERSION,
  MemoryRetrievalObserver,
  CanonicalMemoryPort,
  CandidateResolutionPort,
  ConsentLedgerPort,
  MemoryObservabilityPort,
  ModelPricingPort
} from './application/ports'
export type {
  MemoryAuthorizationDecisionStatus,
  MemorySensitivity,
  MemoryAuthorizationDecision,
  AuthorizedMemoryRetrievalDependencies,
  ResolvedMemoryAuthorization,
  SourceClaimRequest,
  SourceClaimStatus,
  SourceClaimResult,
  SaveCurationRunRequest,
  SaveCurationRunResult,
  MemoryExtraction,
  MemoryExtractionInput,
  MemoryModelUsage,
  MemoryExtractionResult,
  MemoryExtractionExecutionContext,
  RepositorySemanticMemoryRecord,
  RepositoryExactEpisodicMemoryRecord,
  RepositoryInexactEpisodicMemoryRecord,
  RepositoryEpisodicMemoryRecord,
  RepositoryMemoryRecord,
  AuthorizedRepositorySearch,
  RepositorySearchDiagnostics,
  RepositorySearchResult,
  MemoryRetrievalCandidateDecision,
  MemoryRetrievalCandidateTrace,
  MemoryRetrievalTrace,
  MemoryRetrievalObservationContext,
  AcceptCandidateInput,
  AcceptCandidateResult,
  TombstoneMemoryInput,
  NoncanonicalCandidateDecision,
  ResolveNoncanonicalCandidateInput,
  AppendConsentEntryInput,
  MemoryMetric,
  ModelInputPrice
} from './application/ports'
export {
  CurateMemoryUseCase,
  createMemoryCurationGraph,
  invokeMemoryCurationGraph,
  createMemoryCurationHandler,
  retrieveAuthorizedMemory,
  AcceptMemoryCandidateUseCase,
  ResolveMemoryCandidateUseCase,
  ForgetMemoryUseCase,
  MeasureMemoryEconomicsUseCase
} from './application/use-cases'
export type {
  MemoryCurationDependencies,
  MemoryCurationGraph,
  MemoryCurationGraphDependencies,
  MemoryCurationHandler,
  AcceptMemoryCandidateCommand,
  ResolveMemoryCandidateCommand,
  ForgetMemoryCommand,
  MeasureMemoryEconomicsInput,
  MeasuredMemoryEconomics
} from './application/use-cases'
export { LangChainMemoryExtractor } from './infrastructure/adapters/inference'
export type { LangChainMemoryExtractorOptions } from './infrastructure/adapters/inference'
export {
  PostgresScopedMemoryRepository,
  PostgresMemoryCurationAdapter,
  PostgresCanonicalMemoryRepository,
  PostgresCandidateResolutionRepository,
  PostgresConsentLedgerRepository
} from './infrastructure/adapters/persistence/postgres'
export {
  RepoMemoryObservabilityAdapter,
  RepoMemoryRetrievalObserver
} from './infrastructure/adapters/observability'
export {
  InMemoryScopedMemoryRepository,
  InMemoryMemoryAuthorizationResolver,
  InMemoryMemoryCurationAuthorizationResolver
} from './infrastructure/adapters/testing'
export type {
  PostgresQueryResult,
  PostgresExecutor,
  PostgresTransactionExecutor
} from './infrastructure/database'
export type {
  OperationalMemoryRuntime,
  MemoryRequestScope,
  OperationalMemoryReadiness
} from './application/contracts'
export { createNeo4jMemoryRuntime } from './infrastructure/database/neo4j'
export type { Neo4jMemoryOptions } from './infrastructure/database/neo4j'
export {
  MemoryUsageEventSchema,
  MemoryUsageLedgerEntrySchema,
  MemoryPricingSnapshotSchema
} from './application/contracts'
export type {
  MemoryUsageEvent,
  MemoryUsageLedgerEntry,
  MemoryPricingSnapshot,
  MemoryUsageLedgerScope
} from './application/contracts'
export { createTextMemoryUsageEvent } from './application/services'
export { MemoryUsageLedger } from './application/ports'
export type { MemoryUsageObservationSink } from './application/ports'
export type {
  TrustedMemorySource,
  MemoryCandidateStageResult,
  MemorySubjectTextSource,
  MemorySourceEvent,
  EligibleMemorySource,
  MemoryCandidateDeliveryClient
} from './application/contracts'
