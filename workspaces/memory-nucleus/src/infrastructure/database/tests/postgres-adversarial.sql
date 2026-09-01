\set ON_ERROR_STOP on

-- MVP database adversarial checks. These tests deliberately cover only
-- invariants that remain part of the single-process/pre-release Memory Nucleus.
BEGIN;

DO $$
DECLARE
  v_tenant uuid := gen_random_uuid();
  v_subject uuid := gen_random_uuid();
  v_run uuid;
  v_evidence uuid;
  v_candidate uuid;
  v_memory uuid;
  v_version uuid;
  v_matches integer;
BEGIN
  INSERT INTO memory_nucleus.memory_curation_runs(
    tenant_id, subject_id, idempotency_key, source_fingerprint, outcome, usage
  ) VALUES (
    v_tenant, v_subject, repeat('1', 64), repeat('2', 64), 'completed',
    '{"inputTokens":120,"outputTokens":20}'::jsonb
  ) RETURNING run_id INTO v_run;

  INSERT INTO memory_nucleus.memory_evidence(
    tenant_id, subject_id, source_type, source_artifact_id, content_hash, observed_at
  ) VALUES (
    v_tenant, v_subject, 'conversation', 'turn-1', repeat('3', 64), clock_timestamp()
  ) RETURNING evidence_id INTO v_evidence;

  INSERT INTO memory_nucleus.memory_candidates(
    curation_run_id, tenant_id, subject_id, kind, category, statement,
    semantic_key, confidence, confidence_level, purpose_ids, purpose,
    sensitivity, observed_at, actor_id, authorization_decision_id,
    candidate_fingerprint
  ) VALUES (
    v_run, v_tenant, v_subject, 'semantic', 'preference',
    'Prefers concise responses', 'response.style', 0.95, 'high',
    ARRAY['conversation_personalization'], 'conversation_personalization',
    'normal', clock_timestamp(), 'subject', gen_random_uuid(), repeat('4', 64)
  ) RETURNING candidate_id INTO v_candidate;

  INSERT INTO memory_nucleus.memory_candidate_evidence(candidate_id, evidence_id)
  VALUES (v_candidate, v_evidence);

  INSERT INTO memory_nucleus.memories(tenant_id, subject_id, kind, canonical_key)
  VALUES (v_tenant, v_subject, 'semantic', 'response.style')
  RETURNING memory_id INTO v_memory;

  INSERT INTO memory_nucleus.memory_versions(
    memory_id, version, tenant_id, subject_id, category, statement, semantic_key,
    confidence, purpose_ids, view_ids, sensitivity, observed_at, provenance
  ) VALUES (
    v_memory, 1, v_tenant, v_subject, 'preference', 'Prefers concise responses',
    'response.style', 0.95, ARRAY['conversation_personalization'],
    ARRAY['conversation'], 'normal', clock_timestamp(),
    jsonb_build_object(
      'sourceArtifactIds', jsonb_build_array('turn-1'),
      'authorId', 'subject',
      'authorType', 'subject',
      'createdAt', clock_timestamp()
    )
  ) RETURNING version_id INTO v_version;

  INSERT INTO memory_nucleus.memory_version_evidence(version_id, evidence_id)
  VALUES (v_version, v_evidence);

  INSERT INTO memory_nucleus.memory_lifecycle_heads(memory_id, active_version_id, state)
  VALUES (v_memory, v_version, 'active');

  INSERT INTO memory_nucleus.memory_search_projections(
    memory_id, version_id, tenant_id, subject_id, kind, category, semantic_key,
    searchable_text, purpose_ids, view_ids, sensitivity, lifecycle, observed_at,
    provenance
  ) VALUES (
    v_memory, v_version, v_tenant, v_subject, 'semantic', 'preference',
    'response.style', 'Prefers concise responses',
    ARRAY['conversation_personalization'], ARRAY['conversation'], 'normal',
    'accepted', clock_timestamp(),
    jsonb_build_object(
      'sourceArtifactIds', jsonb_build_array('turn-1'),
      'authorId', 'subject',
      'authorType', 'subject',
      'createdAt', clock_timestamp()
    )
  );

  SELECT count(*) INTO v_matches
  FROM memory_nucleus.memory_search_projections
  WHERE tenant_id = v_tenant
    AND subject_id = v_subject
    AND lifecycle = 'accepted'
    AND search_vector @@ websearch_to_tsquery('simple', 'concise');

  IF v_matches <> 1 THEN
    RAISE EXCEPTION 'FTS projection did not return the expected scoped memory';
  END IF;

  -- Lifecycle state must remove the memory from the normal accepted read set.
  UPDATE memory_nucleus.memory_lifecycle_heads
     SET state = 'tombstoned', tombstoned_at = clock_timestamp(), updated_at = clock_timestamp()
   WHERE memory_id = v_memory;
  UPDATE memory_nucleus.memory_search_projections
     SET lifecycle = 'tombstoned', updated_at = clock_timestamp()
   WHERE memory_id = v_memory;

  SELECT count(*) INTO v_matches
  FROM memory_nucleus.memory_search_projections
  WHERE tenant_id = v_tenant
    AND subject_id = v_subject
    AND lifecycle = 'accepted';

  IF v_matches <> 0 THEN
    RAISE EXCEPTION 'tombstoned memory remained retrieval-eligible';
  END IF;

  -- Canonical identity is unique inside a tenant/subject/kind boundary.
  BEGIN
    INSERT INTO memory_nucleus.memories(tenant_id, subject_id, kind, canonical_key)
    VALUES (v_tenant, v_subject, 'semantic', 'response.style');
    RAISE EXCEPTION 'duplicate canonical identity unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Candidate fingerprints are idempotent inside the user boundary.
  BEGIN
    INSERT INTO memory_nucleus.memory_candidates(
      curation_run_id, tenant_id, subject_id, kind, category, statement,
      semantic_key, confidence, confidence_level, purpose_ids, purpose,
      sensitivity, observed_at, actor_id, authorization_decision_id,
      candidate_fingerprint
    ) VALUES (
      v_run, v_tenant, v_subject, 'semantic', 'preference', 'Duplicate',
      'response.style', 0.8, 'medium', ARRAY['conversation_personalization'],
      'conversation_personalization', 'normal', clock_timestamp(), 'subject',
      gen_random_uuid(), repeat('4', 64)
    );
    RAISE EXCEPTION 'duplicate candidate fingerprint unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

ROLLBACK;

SELECT 'memory nucleus MVP postgres adversarial evidence PASS' AS result;
