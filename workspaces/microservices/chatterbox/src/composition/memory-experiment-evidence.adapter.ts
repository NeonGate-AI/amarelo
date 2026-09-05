import { createHash } from 'node:crypto'
import {
  closeSync,
  constants,
  fstatSync,
  openSync,
  readFileSync
} from 'node:fs'
import { isAbsolute, join } from 'node:path'

import { MemoryExperimentPolicySchema } from '@ai/conversation'

import type { ChatterboxEnvironment } from '../configuration'

/** Server-mounted artifacts and live policy; request payloads never select files or gates. */
export class MemoryExperimentEvidenceAdapter {
  constructor(private readonly configuration: ChatterboxEnvironment) {}

  readPolicy(): unknown {
    try {
      const policy = MemoryExperimentPolicySchema.parse(
        this.readJson(
          this.configuration.CHATTERBOX_MEMORY_EXPERIMENT_POLICY_FILE
        )
      )
      const subjects = new Set(
        this.configuration.CHATTERBOX_MEMORY_INTERNAL_SUBJECT_IDS
      )
      return {
        ...policy,
        enabled:
          this.configuration.CHATTERBOX_MEMORY_EXPERIMENT_ENABLED &&
          policy.enabled,
        allowlist: policy.allowlist.filter((subject) => subjects.has(subject)),
        // The reviewed recent-buffer size is part of the paired provider configuration.
        killSwitch:
          policy.killSwitch ||
          policy.recentBufferTokens !==
            this.configuration.CHATTERBOX_MEMORY_RECENT_BUFFER_TOKENS
      }
    } catch {
      return undefined
    }
  }

  readEvidence(): unknown {
    return this.readJson(
      this.configuration.CHATTERBOX_MEMORY_EXPERIMENT_EVIDENCE_FILE
    )
  }
  readMetrics(): unknown {
    return this.readJson(
      this.configuration.CHATTERBOX_MEMORY_EXPERIMENT_METRICS_FILE
    )
  }

  verifyEvidence(value: unknown): boolean {
    try {
      if (
        typeof value !== 'object' ||
        value === null ||
        !('artifactId' in value) ||
        !('digest' in value)
      )
        return false
      const { artifactId, digest } = value
      if (
        typeof artifactId !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(artifactId) ||
        typeof digest !== 'string' ||
        !/^[a-f0-9]{64}$/.test(digest)
      )
        return false
      const directory = this.configuration.CHATTERBOX_MEMORY_EVIDENCE_DIRECTORY
      if (directory === undefined || !isAbsolute(directory)) return false
      const contents = this.readFile(join(directory, `${artifactId}.json`))
      if (
        contents === null ||
        createHash('sha256').update(contents).digest('hex') !== digest
      )
        return false
      const artifact: unknown = JSON.parse(contents)
      if (
        typeof artifact !== 'object' ||
        artifact === null ||
        Array.isArray(artifact) ||
        'digest' in artifact
      )
        return false
      // The immutable artifact omits its own digest, avoiding a circular self-hash.
      return canonical({ ...artifact, digest }) === canonical(value)
    } catch {
      return false
    }
  }

  private readJson(path: string | undefined): unknown {
    try {
      const contents = this.readFile(path)
      return contents === null ? undefined : JSON.parse(contents)
    } catch {
      return undefined
    }
  }

  private readFile(path: string | undefined): string | null {
    if (path === undefined || !isAbsolute(path)) return null
    let descriptor: number | undefined
    try {
      descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
      const metadata = fstatSync(descriptor)
      if (!metadata.isFile() || metadata.size > 131_072) return null
      const contents = readFileSync(descriptor, 'utf8')
      return Buffer.byteLength(contents) <= 131_072 ? contents : null
    } catch {
      return null
    } finally {
      if (descriptor !== undefined) closeSync(descriptor)
    }
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (typeof value === 'object' && value !== null)
    return `{${Object.entries(value)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
