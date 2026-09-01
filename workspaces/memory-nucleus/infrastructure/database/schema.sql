BEGIN;

CREATE SCHEMA IF NOT EXISTS memory_nucleus;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_evidence (
  evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('conversation','explicit-user','tool-result','import','admin','derived')),
  source_artifact_id text NOT NULL CHECK (length(source_artifact_id) BETWEEN 1 AND 200),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, subject_id, source_type, source_artifact_id, content_hash)
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_curation_claims (
  claim_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  source_fingerprint text NOT NULL CHECK (source_fingerprint ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('claimed','completed')),
  expires_at timestamptz NOT NULL,
  completed_run_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, subject_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_curation_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  source_fingerprint text NOT NULL CHECK (source_fingerprint ~ '^[a-f0-9]{64}$'),
  outcome text NOT NULL CHECK (outcome IN ('completed','no-memory')),
  usage jsonb NOT NULL CHECK (jsonb_typeof(usage) = 'object' AND octet_length(usage::text) <= 4096),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, subject_id, idempotency_key)
);

ALTER TABLE memory_nucleus.memory_curation_claims
  DROP CONSTRAINT IF EXISTS memory_curation_claims_completed_run_fk;
ALTER TABLE memory_nucleus.memory_curation_claims
  ADD CONSTRAINT memory_curation_claims_completed_run_fk
  FOREIGN KEY (completed_run_id) REFERENCES memory_nucleus.memory_curation_runs(run_id);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_candidates (
  candidate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curation_run_id uuid NOT NULL REFERENCES memory_nucleus.memory_curation_runs(run_id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('semantic','episodic')),
  category text NOT NULL CHECK (length(category) BETWEEN 1 AND 120),
  statement text NOT NULL CHECK (length(statement) BETWEEN 1 AND 4000),
  semantic_key text NULL CHECK (semantic_key IS NULL OR length(semantic_key) BETWEEN 1 AND 200),
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  confidence_level text NOT NULL CHECK (confidence_level IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','accepted','discarded','quarantined','conflict','superseded')),
  purpose_ids text[] NOT NULL CHECK (cardinality(purpose_ids) BETWEEN 1 AND 16),
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 1 AND 80),
  sensitivity text NOT NULL DEFAULT 'sensitive' CHECK (sensitivity IN ('normal','sensitive','highly-sensitive')),
  observed_at timestamptz NOT NULL,
  occurred_at timestamptz NULL,
  temporal_precision text NULL CHECK (temporal_precision IS NULL OR temporal_precision IN ('approximate','day','exact','life-period','month','year')),
  temporal_reference text NULL CHECK (temporal_reference IS NULL OR length(temporal_reference) <= 160),
  valid_from timestamptz NULL,
  valid_until timestamptz NULL,
  uncertainty text NULL CHECK (uncertainty IS NULL OR length(uncertainty) <= 500),
  tags text[] NOT NULL DEFAULT '{}'::text[] CHECK (cardinality(tags) <= 5),
  actor_id text NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 200),
  authorization_decision_id uuid NOT NULL,
  candidate_fingerprint text NOT NULL CHECK (candidate_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, subject_id, candidate_fingerprint),
  CHECK ((kind = 'semantic' AND occurred_at IS NULL) OR kind = 'episodic'),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_candidate_evidence (
  candidate_id uuid NOT NULL REFERENCES memory_nucleus.memory_candidates(candidate_id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES memory_nucleus.memory_evidence(evidence_id) ON DELETE RESTRICT,
  PRIMARY KEY (candidate_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memories (
  memory_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('semantic','episodic')),
  canonical_key text NOT NULL CHECK (length(canonical_key) BETWEEN 1 AND 240),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, subject_id, kind, canonical_key)
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_versions (
  version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES memory_nucleus.memories(memory_id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  category text NOT NULL CHECK (length(category) BETWEEN 1 AND 120),
  statement text NOT NULL CHECK (length(statement) BETWEEN 1 AND 4000),
  semantic_key text NULL,
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  purpose_ids text[] NOT NULL,
  view_ids text[] NOT NULL CHECK (cardinality(view_ids) BETWEEN 1 AND 16),
  sensitivity text NOT NULL CHECK (sensitivity IN ('normal','sensitive','highly-sensitive')),
  observed_at timestamptz NOT NULL,
  occurred_at timestamptz NULL,
  temporal_precision text NULL,
  temporal_reference text NULL,
  valid_from timestamptz NULL,
  valid_until timestamptz NULL,
  uncertainty text NULL,
  provenance jsonb NOT NULL CHECK (jsonb_typeof(provenance) = 'object' AND octet_length(provenance::text) <= 8192),
  supersedes_version_id uuid NULL REFERENCES memory_nucleus.memory_versions(version_id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (memory_id, version)
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_version_evidence (
  version_id uuid NOT NULL REFERENCES memory_nucleus.memory_versions(version_id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES memory_nucleus.memory_evidence(evidence_id) ON DELETE RESTRICT,
  PRIMARY KEY (version_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_lifecycle_heads (
  memory_id uuid PRIMARY KEY REFERENCES memory_nucleus.memories(memory_id) ON DELETE CASCADE,
  active_version_id uuid NULL REFERENCES memory_nucleus.memory_versions(version_id),
  state text NOT NULL CHECK (state IN ('active','superseded','expired','quarantined','tombstoned')),
  superseded_by_memory_id uuid NULL REFERENCES memory_nucleus.memories(memory_id),
  expires_at timestamptz NULL,
  tombstoned_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_search_projections (
  memory_id uuid PRIMARY KEY REFERENCES memory_nucleus.memories(memory_id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES memory_nucleus.memory_versions(version_id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('semantic','episodic')),
  category text NOT NULL,
  semantic_key text NULL,
  searchable_text text NOT NULL CHECK (length(searchable_text) BETWEEN 1 AND 4000),
  purpose_ids text[] NOT NULL,
  view_ids text[] NOT NULL,
  sensitivity text NOT NULL,
  lifecycle text NOT NULL CHECK (lifecycle IN ('accepted','superseded','expired','tombstoned','quarantined')),
  observed_at timestamptz NOT NULL,
  occurred_at timestamptz NULL,
  temporal_precision text NULL,
  temporal_reference text NULL,
  valid_from timestamptz NULL,
  valid_until timestamptz NULL,
  provenance jsonb NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', searchable_text)) STORED,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS memory_search_scope_idx
  ON memory_nucleus.memory_search_projections(tenant_id, subject_id, lifecycle, kind);
CREATE INDEX IF NOT EXISTS memory_search_vector_idx
  ON memory_nucleus.memory_search_projections USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS memory_search_semantic_key_idx
  ON memory_nucleus.memory_search_projections(tenant_id, subject_id, semantic_key)
  WHERE semantic_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_candidate_resolutions (
  resolution_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES memory_nucleus.memory_candidates(candidate_id),
  command_id text NOT NULL UNIQUE CHECK (length(command_id) BETWEEN 1 AND 200),
  decision text NOT NULL CHECK (decision IN ('accept','merge','supersede','discard','quarantine','conflict')),
  target_memory_id uuid NULL REFERENCES memory_nucleus.memories(memory_id),
  target_version integer NULL CHECK (target_version IS NULL OR target_version > 0),
  reason_code text NULL CHECK (reason_code IS NULL OR length(reason_code) <= 120),
  conflict_type text NULL CHECK (conflict_type IS NULL OR length(conflict_type) <= 120),
  policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 120),
  requested_at timestamptz NOT NULL,
  resolved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_lifecycle_events (
  lifecycle_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES memory_nucleus.memories(memory_id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('activated','superseded','expired','tombstoned')),
  reason_code text NULL CHECK (reason_code IS NULL OR length(reason_code) <= 120),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_consent_ledger (
  consent_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 1 AND 80),
  capability text NOT NULL CHECK (capability IN ('persist','retrieve','project','share','delete')),
  status text NOT NULL CHECK (status IN ('granted','revoked')),
  resource_scope jsonb NOT NULL CHECK (jsonb_typeof(resource_scope) = 'object' AND octet_length(resource_scope::text) <= 2048),
  policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 120),
  effective_at timestamptz NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  source text NOT NULL CHECK (source IN ('user-ui','user-voice','contract','admin','system-policy')),
  evidence_ref text NULL CHECK (evidence_ref IS NULL OR length(evidence_ref) <= 240),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, subject_id, purpose, capability, version)
);

CREATE INDEX IF NOT EXISTS memory_consent_current_idx
  ON memory_nucleus.memory_consent_ledger(tenant_id, subject_id, purpose, capability, effective_at DESC, version DESC);

CREATE TABLE IF NOT EXISTS memory_nucleus.memory_authorization_decisions (
  authorization_decision_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  actor_id text NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 200),
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 1 AND 80),
  operation text NOT NULL CHECK (operation IN ('persist','retrieve','project','share','delete')),
  decision text NOT NULL CHECK (decision IN ('allow','deny','revoked')),
  scope jsonb NOT NULL CHECK (jsonb_typeof(scope) = 'object' AND octet_length(scope::text) <= 4096),
  policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 120),
  expires_at timestamptz NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

COMMIT;
