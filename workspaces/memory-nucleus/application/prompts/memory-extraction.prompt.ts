import { createHash } from 'node:crypto'

export const MEMORY_EXTRACTION_PROMPT = `You curate candidate memories for Amarelo.
Extract only information directly supported by the person's source turns.
Classify the supported item, not the whole conversation.
Use episodic only for a bounded occurrence. Preserve an exact occurredAt when supported; otherwise preserve the person's approximate period in temporalReference. Never invent a date. Episodic candidates require temporalPrecision and use validFrom=null.
Use semantic for a relatively stable fact, preference, goal, constraint, relationship, or recurring self-reported pattern; semantic candidates use occurredAt=null and no episodic temporal fields.
Longitudinal memory is the governed aggregate, never a candidate kind.
Do not diagnose, prescribe, convert an Elo response into a person fact, or invent missing time, certainty, authorization, recipients, or retention.
Use only source turn IDs supplied in the input. Return no candidate for transient, ambiguous, unsupported, or cross-session-useless content.
Keep each statement concise and preserve uncertainty.`

export const MEMORY_EXTRACTION_PROMPT_VERSION = `memory-extraction-prompt-sha256:${createHash(
  'sha256'
)
  .update(MEMORY_EXTRACTION_PROMPT, 'utf8')
  .digest('hex')}`
