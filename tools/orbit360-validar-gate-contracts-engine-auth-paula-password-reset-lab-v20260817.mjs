#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || '';
const EXPECTED_GATE = 'block-auth-paula-password-reset-lab-v20260817';
const CONTRACT = '14.0.0';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-paula-password-reset-lab-v20260817.json';
const EXPECTED_REQUEST_VERSION = process.env.ORBIT360_EXPECTED_REQUEST_VERSION || '';
const EVIDENCE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const TARGET_EMAIL_HASH = '9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const TARGET_ADVISOR = 'ase-paula-osorio';

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
}
function write(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE), { recursive:true });
  fs.writeFileSync(EVIDENCE, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(payload, null, 2));
}
function fail(check, error) {
  const out = {
    schemaVersion:'orbit360-auth-paula-password-reset-preflight-v1',
    gateId:EXPECTED_GATE, contractVersion:CONTRACT, status:'STOP_RETRY',
    classification:'PIPELINE_MECHANISM_FAILURE', failed:1, failedCheckIds:[check],
    error:String(error && error.message || error).slice(0,700),
    executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,
    writeAuthorized:false,authWriteAuthorized:false,passwordResetRequestAuthorized:false,
    runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,
    functionsDeployAuthorized:false,hostingDeployAuthorized:false,rulesDeployAuthorized:false,
    productionAuthorized:false,containsPII:false,containsSecrets:false,ok:false
  };
  write(out); process.exit(41);
}

try {
  if (GATE_ID !== EXPECTED_GATE) throw new Error('GATE_ID_MISMATCH');
  if (EXPECTED_REQUEST_VERSION !== 'AUTH_PAULA_PASSWORD_RESET_V1') throw new Error('REQUEST_VERSION_ENV_MISMATCH');
  const request = readJson(REQUEST);
  const requiredScope = {
    existingIdentityRead:true,
    membershipRead:true,
    sendOnePasswordResetEmail:true,
    directPasswordSet:false,
    authUserCreate:false,
    authUserDelete:false,
    firestoreWrites:false,
    functionsDeploy:false,
    hostingDeploy:false,
    rulesDeploy:false,
    browser:false,
    reimport:false,
    crmWrites:false,
    production:false,
    main:false,
    merge:false
  };
  if (
    request.schemaVersion !== 'orbit360-auth-paula-password-reset-request-v1' ||
    request.requestVersion !== 'AUTH_PAULA_PASSWORD_RESET_V1' ||
    request.gateId !== EXPECTED_GATE ||
    request.rcId !== 'RC-AYS-LAB-CANONICA-01' ||
    request.status !== 'AUTHORIZED_ONCE' || request.approved !== true ||
    request.allowedExecutions !== 1 || request.consumed !== false ||
    request.authorizationFrozen !== false || request.replayAllowed !== false ||
    request.branch !== 'ays/backend-tenant-lab-v99-20260703' ||
    request.pullRequest !== 5 || request.projectId !== 'ays-orbit-360-lab' ||
    request.tenantId !== 'alianzas-soluciones' ||
    request.target?.advisorId !== TARGET_ADVISOR ||
    request.target?.emailHash !== TARGET_EMAIL_HASH ||
    JSON.stringify(request.scope) !== JSON.stringify(requiredScope)
  ) throw new Error('REQUEST_CONTRACT_MISMATCH');

  const parent = execFileSync('git', ['rev-parse','HEAD^'], { cwd:ROOT, encoding:'utf8' }).trim();
  if (request.parentHead !== parent) throw new Error('REQUEST_PARENT_HEAD_MISMATCH');
  const changed = execFileSync('git', ['diff-tree','--no-commit-id','--name-only','-r','HEAD'], { cwd:ROOT, encoding:'utf8' })
    .trim().split(/\r?\n/).filter(Boolean);
  if (changed.length !== 1 || changed[0] !== REQUEST) throw new Error('REQUEST_COMMIT_NOT_EXCLUSIVE');

  const out = {
    schemaVersion:'orbit360-auth-paula-password-reset-preflight-v1',
    gateId:EXPECTED_GATE,contractVersion:CONTRACT,status:'GO_GATE_CONTRACT',
    classification:'GO_NARROW_EXISTING_IDENTITY_PASSWORD_RESET',
    total:22,passed:22,failed:0,failedCheckIds:[],
    executionAuthorized:true,secretAccessAuthorized:true,firestoreReadAuthorized:true,
    writeAuthorized:false,authWriteAuthorized:false,passwordResetRequestAuthorized:true,
    runtimeAuthorized:true,browserAuthorized:false,deployAuthorized:false,
    functionsDeployAuthorized:false,hostingDeployAuthorized:false,rulesDeployAuthorized:false,
    productionAuthorized:false,targetCount:1,maxPasswordResetRequests:1,
    targetAdvisorId:TARGET_ADVISOR,targetEmailHash:TARGET_EMAIL_HASH,
    containsPII:false,containsSecrets:false,ok:true
  };
  write(out);
  process.exit(0);
} catch (error) {
  fail('AUTH_PAULA_PASSWORD_RESET_PREFLIGHT', error);
}
