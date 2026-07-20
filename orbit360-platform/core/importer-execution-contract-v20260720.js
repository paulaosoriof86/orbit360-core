/* Orbit 360 · contrato canónico de ejecución de importadores · 2026-07-20
   Une parser, dry-run, identidad, target, backend, store, auditoría y rollback.
   No transporta ni persiste valores protegidos; solo define el contrato y evidencia sanitizada. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Orbit = root.Orbit || {};
  root.Orbit.importerExecutionContractV20260720 = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var VERSION = '20260720.1';
  var SCHEMA = 'orbit360-importer-execution-contract-v1';
  var STAGES = Object.freeze([
    'created',
    'source_parsed',
    'mapping_resolved',
    'dry_run_produced',
    'confirmation_accepted',
    'identity_resolved',
    'target_resolved',
    'provider_invoked',
    'remote_confirmed',
    'store_observed',
    'read_after_write',
    'audit_observed',
    'rollback_completed',
    'completed',
    'failed'
  ]);
  var ALLOWED = Object.freeze({
    created: ['source_parsed', 'failed'],
    source_parsed: ['mapping_resolved', 'failed'],
    mapping_resolved: ['dry_run_produced', 'failed'],
    dry_run_produced: ['confirmation_accepted', 'failed'],
    confirmation_accepted: ['identity_resolved', 'failed'],
    identity_resolved: ['target_resolved', 'failed'],
    target_resolved: ['provider_invoked', 'failed'],
    provider_invoked: ['remote_confirmed', 'failed'],
    remote_confirmed: ['store_observed', 'failed'],
    store_observed: ['read_after_write', 'failed'],
    read_after_write: ['audit_observed', 'failed'],
    audit_observed: ['rollback_completed', 'completed', 'failed'],
    rollback_completed: ['completed', 'failed'],
    completed: [],
    failed: []
  });
  var ERROR_CODES = Object.freeze([
    'SOURCE_PARSE_FAILED',
    'MAPPING_UNRESOLVED',
    'DRY_RUN_BLOCKED',
    'CONFIRMATION_REJECTED',
    'AUTH_NOT_READY',
    'ACTIVE_ROLE_UNRESOLVED',
    'TENANT_MISMATCH',
    'TARGET_ID_UNRESOLVED',
    'PROVIDER_NOT_REGISTERED',
    'PROVIDER_NOT_INVOKED',
    'REMOTE_CONFIRMATION_INCOMPLETE',
    'STORE_WRITE_NOT_OBSERVED',
    'READ_AFTER_WRITE_FAILED',
    'AUDIT_SUCCESS_NOT_OBSERVED',
    'AUDIT_FAILURE_NOT_OBSERVED',
    'PLAINTEXT_SECRET_DETECTED',
    'ROLLBACK_FAILED',
    'PIPELINE_MECHANISM_FAILURE'
  ]);

  function clean(value, max) {
    return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max || 240);
  }
  function bool(value) { return value === true; }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return {}; }
  }
  function hashLike(value) { return /^[a-f0-9]{16,128}$/i.test(clean(value, 128)); }
  function targetValid(target) {
    target = target || {};
    return Boolean(clean(target.collection, 80) && clean(target.recordId, 180) &&
      (!target.resourceRequired || clean(target.resourceId, 180)));
  }
  function canonicalActor(actor) {
    actor = actor || {};
    return {
      uid: clean(actor.uid, 180),
      emailHash: hashLike(actor.emailHash) ? clean(actor.emailHash, 128) : '',
      activeRole: clean(actor.activeRole, 80),
      advisorId: clean(actor.advisorId, 180)
    };
  }
  function canonicalTarget(target) {
    target = target || {};
    return {
      collection: clean(target.collection, 80),
      recordId: clean(target.recordId, 180),
      resourceType: clean(target.resourceType, 80),
      resourceId: clean(target.resourceId, 180),
      resourceRequired: target.resourceRequired === true,
      country: clean(target.country, 8),
      sourceTraceHash: hashLike(target.sourceTraceHash) ? clean(target.sourceTraceHash, 128) : ''
    };
  }
  function create(input) {
    input = input || {};
    var createdAt = new Date().toISOString();
    return {
      schemaVersion: SCHEMA,
      contractVersion: VERSION,
      executionId: clean(input.executionId, 180),
      tenantId: clean(input.tenantId, 120),
      sourceType: clean(input.sourceType, 120),
      sourceFileHash: hashLike(input.sourceFileHash) ? clean(input.sourceFileHash, 128) : '',
      synthetic: input.synthetic === true,
      actor: canonicalActor(input.actor),
      targets: [].concat(input.targets || []).map(canonicalTarget),
      stage: 'created',
      stageHistory: [{ stage: 'created', at: createdAt }],
      predicates: {
        browserAuthReady: false,
        activeRoleResolved: false,
        sourceParsed: false,
        dryRunProduced: false,
        targetIdsResolved: false,
        providerInvoked: false,
        remoteConfirmation: false,
        storeWriteObserved: false,
        opaqueReferenceObserved: false,
        readAfterWriteOk: false,
        auditSuccessObserved: false,
        auditFailureObserved: false,
        plaintextSecretsInOperationalStore: false,
        rollbackOk: false
      },
      failure: null,
      containsPII: false,
      containsSecrets: false,
      createdAt: createdAt,
      updatedAt: createdAt
    };
  }
  function transition(execution, stage, detail) {
    var out = clone(execution);
    var next = clean(stage, 80);
    if (!STAGES.includes(next)) throw new Error('IMPORTER_STAGE_UNKNOWN');
    var current = clean(out.stage, 80);
    if (!(ALLOWED[current] || []).includes(next)) throw new Error('IMPORTER_STAGE_TRANSITION_INVALID');
    out.stage = next;
    out.updatedAt = new Date().toISOString();
    out.stageHistory = [].concat(out.stageHistory || [], [{
      stage: next,
      at: out.updatedAt,
      code: clean(detail && detail.code, 100),
      count: Number.isFinite(Number(detail && detail.count)) ? Number(detail.count) : 0
    }]);
    return out;
  }
  function setPredicate(execution, key, value) {
    var out = clone(execution);
    if (!Object.prototype.hasOwnProperty.call(out.predicates || {}, key)) throw new Error('IMPORTER_PREDICATE_UNKNOWN');
    out.predicates[key] = value === true;
    out.updatedAt = new Date().toISOString();
    return out;
  }
  function fail(execution, code, stage) {
    var out = clone(execution);
    var safeCode = ERROR_CODES.includes(clean(code, 100)) ? clean(code, 100) : 'PIPELINE_MECHANISM_FAILURE';
    if (out.stage !== 'failed' && (ALLOWED[out.stage] || []).includes('failed')) out = transition(out, 'failed', { code: safeCode });
    out.failure = { code: safeCode, stage: clean(stage || execution.stage, 80) };
    out.updatedAt = new Date().toISOString();
    return out;
  }
  function validate(execution) {
    var errors = [];
    if (!execution || execution.schemaVersion !== SCHEMA) errors.push('SCHEMA_MISMATCH');
    if (!clean(execution && execution.executionId, 180)) errors.push('EXECUTION_ID_REQUIRED');
    if (!clean(execution && execution.tenantId, 120)) errors.push('TENANT_REQUIRED');
    if (!clean(execution && execution.sourceType, 120)) errors.push('SOURCE_TYPE_REQUIRED');
    if (!execution || !STAGES.includes(execution.stage)) errors.push('STAGE_INVALID');
    var targets = [].concat(execution && execution.targets || []);
    if (!targets.length) errors.push('TARGET_REQUIRED');
    targets.forEach(function (target, index) {
      if (!targetValid(target)) errors.push('TARGET_INVALID_' + index);
    });
    return { ok: errors.length === 0, errors: errors };
  }
  function readyForProvider(execution) {
    var p = execution && execution.predicates || {};
    return validate(execution).ok &&
      bool(p.browserAuthReady) &&
      bool(p.activeRoleResolved) &&
      bool(p.sourceParsed) &&
      bool(p.dryRunProduced) &&
      bool(p.targetIdsResolved) &&
      clean(execution.actor && execution.actor.uid, 180) &&
      clean(execution.actor && execution.actor.activeRole, 80);
  }
  function remoteAccepted(execution, remote) {
    remote = remote || {};
    var mappings = [].concat(remote.mappings || []);
    var imported = Number(remote.imported || 0);
    var expected = [].concat(execution && execution.targets || []).length;
    return remote.ok === true && imported > 0 && mappings.length === imported && imported <= expected &&
      mappings.every(function (item) {
        return clean(item.insurerId, 180) && clean(item.portalId, 180) && /^cred_[a-f0-9]{32}$/.test(clean(item.credentialRef, 80));
      });
  }
  function successReady(execution) {
    var p = execution && execution.predicates || {};
    return validate(execution).ok &&
      execution.stage === 'completed' &&
      bool(p.browserAuthReady) &&
      bool(p.activeRoleResolved) &&
      bool(p.sourceParsed) &&
      bool(p.dryRunProduced) &&
      bool(p.targetIdsResolved) &&
      bool(p.providerInvoked) &&
      bool(p.remoteConfirmation) &&
      (bool(p.storeWriteObserved) || bool(p.opaqueReferenceObserved)) &&
      bool(p.readAfterWriteOk) &&
      bool(p.auditSuccessObserved) &&
      bool(p.auditFailureObserved) &&
      p.plaintextSecretsInOperationalStore === false &&
      (!execution.synthetic || bool(p.rollbackOk));
  }
  function sanitizeEvidence(execution) {
    execution = execution || {};
    var p = execution.predicates || {};
    return {
      schemaVersion: 'orbit360-importers-e2e-evidence-v1',
      contractVersion: VERSION,
      executionId: clean(execution.executionId, 180),
      tenantId: clean(execution.tenantId, 120),
      sourceType: clean(execution.sourceType, 120),
      synthetic: execution.synthetic === true,
      stage: clean(execution.stage, 80),
      targetCount: [].concat(execution.targets || []).length,
      predicates: {
        browserAuthReady: bool(p.browserAuthReady),
        activeRoleResolved: bool(p.activeRoleResolved),
        sourceParsed: bool(p.sourceParsed),
        dryRunProduced: bool(p.dryRunProduced),
        targetIdsResolved: bool(p.targetIdsResolved),
        providerInvoked: bool(p.providerInvoked),
        remoteConfirmation: bool(p.remoteConfirmation),
        storeWriteObserved: bool(p.storeWriteObserved),
        opaqueReferenceObserved: bool(p.opaqueReferenceObserved),
        readAfterWriteOk: bool(p.readAfterWriteOk),
        auditSuccessObserved: bool(p.auditSuccessObserved),
        auditFailureObserved: bool(p.auditFailureObserved),
        plaintextSecretsInOperationalStore: bool(p.plaintextSecretsInOperationalStore),
        rollbackOk: bool(p.rollbackOk)
      },
      failure: execution.failure ? {
        code: clean(execution.failure.code, 100),
        stage: clean(execution.failure.stage, 80)
      } : null,
      stageHistory: [].concat(execution.stageHistory || []).map(function (item) {
        return { stage: clean(item.stage, 80), code: clean(item.code, 100), count: Number(item.count || 0) };
      }),
      ok: successReady(execution),
      containsPII: false,
      containsSecrets: false
    };
  }

  return Object.freeze({
    version: VERSION,
    schemaVersion: SCHEMA,
    stages: STAGES,
    errorCodes: ERROR_CODES,
    singleTargetOwner: true,
    requiresReadAfterWrite: true,
    requiresAuditSuccessAndFailure: true,
    requiresRollbackForSynthetic: true,
    forbidsSuccessWithZero: true,
    writesStore: false,
    create: create,
    transition: transition,
    setPredicate: setPredicate,
    fail: fail,
    validate: validate,
    readyForProvider: readyForProvider,
    remoteAccepted: remoteAccepted,
    successReady: successReady,
    sanitizeEvidence: sanitizeEvidence
  });
});
