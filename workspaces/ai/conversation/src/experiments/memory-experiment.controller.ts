import { createHmac } from 'node:crypto'
import {
  MemorySearchInputSchema,
  MemorySearchResultSchema
} from '@repo/memory-sdk'
import type { ConversationAgentInvocation } from '../ports'
import {
  MemoryPairVersionsSchema,
  createMemoryReplacementPlan,
  type MemoryGateDecision,
  type MemoryReplacementPlan
} from '../shadow'
import {
  MemoryExperimentEvidenceSchema,
  MemoryExperimentPolicySchema,
  type MemoryExperimentPolicy,
  type MemoryExperimentRequest,
  type MemoryExperimentTurnReport
} from './memory-experiment.contract'
import { evaluateMemoryExperimentMetrics } from './memory-experiment.policy'

const canarySubjects = new Map<string, Set<string>>()
let activeRetrievals = 0
let activeReportSinks = 0
export interface MemoryExperimentControllerOptions {
  /** Read on every turn and again immediately before returning a treatment plan. */
  readonly readPolicy?: () => unknown
  readonly readEvidence?: () => unknown
  readonly verifyEvidence?: (evidence: unknown) => boolean
  readonly record?: (report: MemoryExperimentTurnReport) => Promise<void> | void
  readonly now?: () => Date
}
export interface MemoryExperimentSelection {
  readonly assignment: 'control' | 'treatment'
  readonly decision: MemoryGateDecision
  readonly policy: MemoryExperimentPolicy | null
  readonly subjectHash: string | null
  readonly plan: MemoryReplacementPlan | null
}
interface EligibleExperiment {
  readonly policy: MemoryExperimentPolicy
  readonly subjectHash: string
}

/** Server-owned admission and immediate rollback; no client can choose an assignment. */
export class MemoryExperimentController {
  private rollbackLatched = false
  private holdLatched = false
  constructor(
    private readonly options: MemoryExperimentControllerOptions = {}
  ) {}

  rollback(): void {
    this.rollbackLatched = true
  }

  private eligible(
    request: MemoryExperimentRequest
  ): EligibleExperiment | null {
    if (
      this.rollbackLatched ||
      this.holdLatched ||
      request.audience === 'external'
    )
      return null
    try {
      const policy = MemoryExperimentPolicySchema.parse(
        this.options.readPolicy?.()
      )
      if (
        !policy.enabled ||
        policy.killSwitch ||
        !policy.allowlist.includes(request.subjectKey)
      )
        return null
      if (request.audience !== 'synthetic' && request.audience !== 'internal')
        return null
      const versions = MemoryPairVersionsSchema.parse(request.versions)
      const evidence = MemoryExperimentEvidenceSchema.parse(
        this.options.readEvidence?.()
      )
      const required =
        policy.phase === 'ab'
          ? [evidence.shadow, evidence.integrity, evidence.canary]
          : [evidence.shadow, evidence.integrity]
      const now = (this.options.now?.() ?? new Date()).getTime()
      if (
        !Number.isFinite(now) ||
        evidence.shadow.specId !== 'SPEC-011' ||
        evidence.integrity.specId !== 'SPEC-043' ||
        evidence.integrity.hiddenIntegrityPassed !== true ||
        (policy.phase === 'ab' && evidence.canary?.specId !== 'SPEC-017')
      )
        return null
      for (const gate of required) {
        if (
          gate === null ||
          this.options.verifyEvidence?.(gate) !== true ||
          JSON.stringify(gate.versions) !== JSON.stringify(versions) ||
          Date.parse(gate.measuredAt) > now ||
          Date.parse(gate.expiresAt) <= now
        )
          return null
        if (gate.status === 'rollback') {
          this.rollbackLatched = true
          return null
        }
        if (gate.status !== 'pass' || gate.sampleSize < policy.minimumSamples)
          return null
      }
      const subjectHash = createHmac('sha256', policy.assignmentSalt)
        .update(
          JSON.stringify([
            policy.experimentId,
            policy.version,
            request.query.purpose,
            request.subjectKey
          ])
        )
        .digest('hex')
      return { policy, subjectHash }
    } catch {
      return null
    }
  }

  async select(
    invocation: ConversationAgentInvocation,
    request: MemoryExperimentRequest
  ): Promise<MemoryExperimentSelection> {
    const control = (
      reason: string,
      eligible: EligibleExperiment | null = null
    ): MemoryExperimentSelection => ({
      assignment: 'control',
      decision: {
        status: this.rollbackLatched ? 'rollback' : 'hold',
        reasons: [reason]
      },
      policy: eligible?.policy ?? null,
      subjectHash: eligible?.subjectHash ?? null,
      plan: null
    })
    const admitted = this.eligible(request)
    if (admitted === null)
      return control('disabled-killed-or-evidence-unavailable')
    if (invocation.memory.length !== 0)
      return control('baseline-already-contains-memory', admitted)
    if (
      Number.parseInt(admitted.subjectHash.slice(0, 8), 16) % 1_000 >=
      admitted.policy.treatmentPermille
    )
      return control('sticky-control-assignment', admitted)
    const key = `${admitted.policy.experimentId}:${admitted.policy.version}`
    let subjects = canarySubjects.get(key)
    if (subjects === undefined) {
      if (canarySubjects.size >= 128)
        return control('experiment-capacity', admitted)
      subjects = new Set<string>()
      canarySubjects.set(key, subjects)
    }
    if (
      admitted.policy.phase === 'canary' &&
      !subjects.has(admitted.subjectHash) &&
      subjects.size >= admitted.policy.maximumCanarySubjects
    )
      return control('canary-ceiling', admitted)
    if (activeRetrievals >= 4) return control('memory-capacity', admitted)
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const query = MemorySearchInputSchema.parse(request.query)
      if (invocation.messages.at(-1)?.content !== query.query)
        return control('current-turn-mismatch', admitted)
      activeRetrievals += 1
      const retrieval = Promise.resolve()
        .then(() => request.memory.search(query))
        .finally(() => {
          activeRetrievals -= 1
        })
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('Memory experiment deadline')),
          admitted.policy.memoryDeadlineMs
        )
      })
      const memory = MemorySearchResultSchema.parse(
        await Promise.race([retrieval, deadline])
      )
      if (
        memory.governance.purpose !== query.purpose ||
        memory.governance.viewId !== request.expectedViewId ||
        memory.tokenBudget.requestedTokens !== query.tokenBudget
      )
        return control('memory-governance-mismatch', admitted)
      const plan = createMemoryReplacementPlan(
        invocation,
        memory,
        admitted.policy.recentBufferTokens
      )
      const current = this.eligible(request)
      if (
        current === null ||
        JSON.stringify(current.policy) !== JSON.stringify(admitted.policy) ||
        current.subjectHash !== admitted.subjectHash
      )
        return control('live-policy-or-evidence-changed', admitted)
      if (current.policy.phase === 'canary') {
        if (
          !subjects.has(current.subjectHash) &&
          subjects.size >= current.policy.maximumCanarySubjects
        )
          return control('canary-ceiling', current)
        subjects.add(current.subjectHash)
      }
      return {
        assignment: 'treatment',
        decision: {
          status: 'hold',
          reasons: ['internal-treatment-awaits-measured-advancement']
        },
        policy: current.policy,
        subjectHash: current.subjectHash,
        plan
      }
    } catch {
      return control('memory-unavailable-or-invalid', admitted)
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  observeMetrics(
    raw: unknown,
    request: MemoryExperimentRequest
  ): MemoryGateDecision {
    const admitted = this.eligible(request)
    if (admitted === null)
      return {
        status: this.rollbackLatched ? 'rollback' : 'hold',
        reasons: ['experiment-not-admitted']
      }
    const result = evaluateMemoryExperimentMetrics(
      raw,
      request.versions,
      admitted.policy,
      this.options.verifyEvidence ?? (() => false),
      this.options.now?.() ?? new Date()
    )
    if (result.status === 'rollback') this.rollbackLatched = true
    if (result.status === 'hold') this.holdLatched = true
    return result
  }

  record(report: MemoryExperimentTurnReport): void {
    if (this.options.record === undefined || activeReportSinks >= 4) return
    activeReportSinks += 1
    const sink = this.options.record
    queueMicrotask(() => {
      void Promise.resolve()
        .then(() => sink(Object.freeze(report)))
        .catch(() => undefined)
        .finally(() => {
          activeReportSinks -= 1
        })
    })
  }
}
