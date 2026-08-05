#!/usr/bin/env node
'use strict';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildOnboardingCallFailure, callableFailureEvidence } from './orbit360-auth-callable-error-contract-v6-20260805.mjs';

const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-auth-v6-'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const run = (script, env = {}) => spawnSync(process.execPath, [path.join(ROOT, script)], {
  cwd: ROOT,
  env: { ...process.env, ...env },
  encoding: 'utf8'
});

try {
  const goodPrivate = path.join(tmp, 'actor-good-private.json');
  const goodEvidence = path.join(tmp, 'actor-good-evidence.json');
  write(goodPrivate, {
    actor: {
      uid: 'contract-fixture-uid',
      email: 'contract-fixture@example.invalid',
      activeRole: 'SuperAdmin',
      member: {
        tenantId: 'alianzas-soluciones',
        status: 'active',
        roles: ['SuperAdmin'],
        defaultRole: 'SuperAdmin',
        activeRole: 'SuperAdmin',
        permissions: []
      }
    }
  });
  const goodRun = run('tools/orbit360-auth-access-actor-parity-precheck-v6-20260805.mjs', {
    ORBIT360_AUTH_PRIVATE_STATE: goodPrivate,
    ORBIT360_ACTOR_PARITY_EVIDENCE: goodEvidence
  });
  assert.equal(goodRun.status, 0, goodRun.stderr || goodRun.stdout);
  const goodActor = read(goodEvidence);
  assert.equal(goodActor.ok, true);
  assert.deepEqual(goodActor.checks, {
    tenantMatch: true,
    statusActive: true,
    activeRoleAssigned: true,
    roleOrPermissionAuthorized: true,
    actorIdentityPresent: true
  });

  const badPrivate = path.join(tmp, 'actor-bad-private.json');
  const badEvidence = path.join(tmp, 'actor-bad-evidence.json');
  write(badPrivate, {
    actor: {
      uid: 'contract-fixture-uid',
      email: 'contract-fixture@example.invalid',
      activeRole: 'Asesor',
      member: {
        tenantId: 'alianzas-soluciones',
        status: 'active',
        roles: ['SuperAdmin'],
        defaultRole: 'SuperAdmin',
        activeRole: 'Asesor',
        permissions: []
      }
    }
  });
  const badRun = run('tools/orbit360-auth-access-actor-parity-precheck-v6-20260805.mjs', {
    ORBIT360_AUTH_PRIVATE_STATE: badPrivate,
    ORBIT360_ACTOR_PARITY_EVIDENCE: badEvidence
  });
  assert.equal(badRun.status, 41);
  const badActor = read(badEvidence);
  assert.equal(badActor.stage, 'STOP_RETRY_ACTOR_AUTHORIZATION_PARITY');
  assert.equal(badActor.classification, 'DATA_CONTRACT_FAILURE');
  assert.equal(badActor.checks.activeRoleAssigned, false);

  const callableError = buildOnboardingCallFailure(403, { error: { status: 'PERMISSION_DENIED' } });
  const callableEvidence = callableFailureEvidence(callableError);
  assert.deepEqual(callableEvidence, {
    httpStatus: 403,
    callableStatus: 'PERMISSION_DENIED',
    errorCode: 'ONBOARDING_CALL_FAILED_PERMISSION_DENIED'
  });

  const runPersister = ({ name, config, actor, auth, scope, rollback }) => {
    const dir = path.join(tmp, name);
    fs.mkdirSync(dir, { recursive: true });
    const files = {
      config: path.join(dir, 'config.json'),
      actor: path.join(dir, 'actor.json'),
      auth: path.join(dir, 'auth.json'),
      scope: path.join(dir, 'scope.json'),
      rollback: path.join(dir, 'rollback.json'),
      final: path.join(dir, 'final.json'),
      lifecycle: path.join(dir, 'lifecycle.json'),
      closure: path.join(dir, 'closure.md')
    };
    if (config) write(files.config, config);
    if (actor) write(files.actor, actor);
    if (auth) write(files.auth, auth);
    if (scope) write(files.scope, scope);
    if (rollback) write(files.rollback, rollback);
    write(files.lifecycle, {
      status: 'AUTH_ACCESS_RECOVERY_V6_AUTHORIZED_ONCE',
      authorization: { activeRequest: true, allowedExecutions: 1, consumed: false, replayAllowed: false }
    });
    const result = run('tools/orbit360-auth-access-evidence-safe-persist-v6-20260805.mjs', {
      ORBIT360_CONFIG_EVIDENCE: files.config,
      ORBIT360_ACTOR_PARITY_EVIDENCE: files.actor,
      ORBIT360_AUTH_EVIDENCE: files.auth,
      ORBIT360_SCOPE_EVIDENCE: files.scope,
      ORBIT360_ROLLBACK_EVIDENCE: files.rollback,
      ORBIT360_FINAL_EVIDENCE: files.final,
      ORBIT360_LIFECYCLE: files.lifecycle,
      ORBIT360_CLOSURE: files.closure
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return { final: read(files.final), lifecycle: read(files.lifecycle), closure: fs.readFileSync(files.closure, 'utf8') };
  };

  const incomplete = runPersister({
    name: 'incomplete',
    config: { stage: 'AUTH_ACCESS_CONFIG_REPAIR_APPLY_PASS', documentsWritten: 2, ok: true },
    actor: { stage: 'AUTH_ACCESS_ACTOR_PARITY_PASS', ok: true },
    auth: {
      stage: 'STOP_RETRY_AUTH_ACCESS_RECOVERY',
      classification: 'FUNCTIONAL_DEFECT',
      errorCode: 'ONBOARDING_CALL_FAILED_PERMISSION_DENIED',
      httpStatus: 403,
      callableStatus: 'PERMISSION_DENIED',
      rollbackAttempted: true,
      ok: false
    }
  });
  assert.equal(incomplete.final.stage, 'STOP_RETRY_AUTH_ACCESS_RECOVERY');
  assert.equal(incomplete.final.errorCode, 'ONBOARDING_CALL_FAILED_PERMISSION_DENIED');
  assert.equal(incomplete.final.protectedCrmIntegrity, 'NOT_POSTVERIFIED');
  assert.equal(incomplete.final.optionalEvidencePresent.scope, false);
  assert.equal(incomplete.final.optionalEvidencePresent.rollback, false);
  assert.equal(incomplete.lifecycle.authorization.consumed, true);
  assert.equal(incomplete.lifecycle.authorization.allowedExecutions, 0);

  const changed = runPersister({
    name: 'changed',
    config: { stage: 'AUTH_ACCESS_CONFIG_REPAIR_APPLY_PASS', documentsWritten: 1, ok: true },
    actor: { stage: 'AUTH_ACCESS_ACTOR_PARITY_PASS', ok: true },
    auth: {
      stage: 'STOP_RETRY_AUTH_ACCESS_RECOVERY',
      classification: 'SECURITY_FAILURE',
      errorCode: 'PROTECTED_CRM_DATA_CHANGED',
      protectedCrmDataUnchanged: false,
      ok: false
    }
  });
  assert.equal(changed.final.protectedCrmIntegrity, 'VERIFIED_CHANGED');

  const success = runPersister({
    name: 'success',
    config: { stage: 'AUTH_ACCESS_CONFIG_REPAIR_APPLY_PASS', documentsWritten: 0, ok: true },
    actor: { stage: 'AUTH_ACCESS_ACTOR_PARITY_PASS', ok: true },
    auth: {
      stage: 'AUTH_ACCESS_RECOVERY_PASS',
      authUsersCreated: 1,
      membershipsCreated: 1,
      passwordEstablishmentEmailsSent: 3,
      protectedCrmDataUnchanged: true,
      ok: true
    },
    scope: { stage: 'AUTH_ACCESS_SCOPE_POSTVERIFY_PASS', ok: true }
  });
  assert.equal(success.final.stage, 'AUTH_ACCESS_RECOVERY_V6_PASS');
  assert.equal(success.final.protectedCrmIntegrity, 'VERIFIED_UNCHANGED');
  assert.equal(success.final.ok, true);

  console.log(JSON.stringify({
    ok: true,
    actorParityCases: 2,
    callableErrorPropagationCases: 1,
    evidencePersistenceCases: 3,
    integrityStatesVerified: ['VERIFIED_UNCHANGED', 'VERIFIED_CHANGED', 'NOT_POSTVERIFIED'],
    operationalCapabilitiesUsed: 0
  }));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
