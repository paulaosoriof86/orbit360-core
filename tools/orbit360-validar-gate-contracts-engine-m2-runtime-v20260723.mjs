#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || 'block2-product-readonly-runtime-v20260723';
const EXTENSION = 'tools/orbit360-gate-contract-registry-extension-m2-runtime-v20260723.json';
const OVERLAY = 'tools/orbit360-gate-contract-overlay-m2-runtime-v20260723.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-m2-runtime-v20260723.json';
const PACKAGE = 'tools/orbit360-m2-product-readonly-runtime-authorization-package-v20260723.json';
const REQUEST = 'tools/orbit360-m2-product-readonly-runtime-request-v20260723.json';
const FREEZE = 'tools/orbit360-incident-freeze-v20260721.json';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const EXPECTED_CAPABILITIES = Object.freeze({
  secrets: true,
  firestoreRead: true,
  writes: true,
  runtime: true,
  browser: false,
  deploy: false,
  functionsDeploy: false,
  rulesDeploy: true,
  production: true
});

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function json(rel) { return JSON.parse(read(rel)); }
function unique(values) { return [...new Set([].concat(values || []).filter(Boolean))]; }
function executableText(source, rel) {
  let out = String(source || '');
  if (/\.(?:js|mjs|cjs)$/i.test(rel)) out = out.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (/\.html?$/i.test(rel)) out = out.replace(/<!--[\s\S]*?-->/g, '');
  if (/\.ya?ml$/i.test(rel)) out = out.replace(/^\s*#.*$/gm, '');
  return out;
}
function exactCapabilities(actual, expected) {
  const actualKeys = Object.keys(actual || {}).sort();
  const expectedKeys = Object.keys(expected || {}).sort();
  return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) && expectedKeys.every(key => actual[key] === expected[key]);
}
function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

const checks = [];
function check(id, ok, detail = '') { checks.push({ id, ok: Boolean(ok), detail: String(detail || '') }); }

let extension = null;
let overlay = null;
let lifecycle = null;
let authorization = null;
let request = null;
let freeze = null;
let gate = null;

try {
  for (const rel of [EXTENSION, OVERLAY, LIFECYCLE, PACKAGE, REQUEST, FREEZE]) check(`CONTROL_FILE:${rel}`, exists(rel), rel);
  extension = json(EXTENSION);
  overlay = json(OVERLAY);
  lifecycle = json(LIFECYCLE);
  authorization = json(PACKAGE);
  request = json(REQUEST);
  freeze = json(FREEZE);

  check('EXTENSION_SCHEMA', extension.schemaVersion === 'orbit360-gate-contract-registry-extension-v1', extension.schemaVersion);
  check('OVERLAY_SCHEMA', overlay.schemaVersion === 'orbit360-gate-contract-overlay-v1', overlay.schemaVersion);
  check('LIFECYCLE_SCHEMA', lifecycle.schemaVersion === 'orbit360-validator-lifecycle-contract-m2-runtime-v1', lifecycle.schemaVersion);
  check('AUTHORIZATION_SCHEMA', authorization.schemaVersion === 'orbit360-m2-product-readonly-runtime-authorization-package-v1', authorization.schemaVersion);
  check('REQUEST_SCHEMA', request.schemaVersion === 'orbit360-m2-product-readonly-runtime-request-v1', request.schemaVersion);

  gate = (extension.gates || []).find(item => item.gateId === GATE_ID) || null;
  check('GATE_REGISTERED', Boolean(gate), GATE_ID);
  check('ACTIVE_BLOCK', Number(extension.planPatch && extension.planPatch.activeBlock) === 2, JSON.stringify(extension.planPatch || {}));
  check('PREVIOUS_CLOSURE', extension.planPatch && extension.planPatch.previousBlockStatus === 'M1_CLOSED_M2_STATIC_CLOSED', JSON.stringify(extension.planPatch || {}));
  check('GATE_VERSION', gate && gate.contractVersion === '2.1.0', gate && gate.contractVersion);
  check('GATE_STATUS', gate && gate.status === 'ACTIVE_AUTHORIZED_ONCE', gate && gate.status);
  check('OVERLAY_GATE', overlay.gateId === GATE_ID, overlay.gateId);
  check('LIFECYCLE_GATE', lifecycle.gateId === GATE_ID, lifecycle.gateId);
  check('LIFECYCLE_VERSION', lifecycle.gateContractVersion === '2.1.0', lifecycle.gateContractVersion);
  check('LIFECYCLE_REVISION', lifecycle.validatorLifecycleRevision === 'phase-capability-contract-v1', lifecycle.validatorLifecycleRevision);

  const profile = overlay.gatePatch && overlay.gatePatch.executionProfile || gate && gate.executionProfile || {};
  check('EXECUTION_PHASE', profile.phase === 'PRODUCT_READONLY_RUNTIME', profile.phase);
  check('EXACT_CAPABILITIES', exactCapabilities(profile.capabilities || {}, EXPECTED_CAPABILITIES), JSON.stringify(profile.capabilities || {}));
  check('OPERATIONAL_WRITES_BLOCKED', profile.operationalWritesAuthorized === false, String(profile.operationalWritesAuthorized));
  check('CONTROLLED_WRITES_EXACT', JSON.stringify(profile.controlledConfigurationWrites || []) === JSON.stringify(['firebase_auth_bootstrap_user','initial_membership','bootstrap_audit_event']), JSON.stringify(profile.controlledConfigurationWrites || []));
  check('BRANCH_LOCK', profile.workflowLocks && profile.workflowLocks.branch === true, JSON.stringify(profile.workflowLocks || {}));
  check('PROJECT_SECRET_REF', profile.workflowLocks && profile.workflowLocks.firebaseProjectFromSecretReference === true, JSON.stringify(profile.workflowLocks || {}));
  check('HOSTING_LOCK', profile.workflowLocks && profile.workflowLocks.hostingChannel === false, JSON.stringify(profile.workflowLocks || {}));

  check('AUTHORIZATION_STATUS', authorization.status === 'AUTHORIZED_ONCE', authorization.status);
  check('AUTHORIZATION_EXECUTIONS', authorization.authorization && authorization.authorization.allowedExecutions === 1, JSON.stringify(authorization.authorization || {}));
  check('AUTHORIZATION_READONLY', authorization.authorization && authorization.authorization.readOnly === true && authorization.authorization.operationalWrites === false, JSON.stringify(authorization.authorization || {}));
  check('AUTHORIZATION_NO_HOSTING', authorization.authorization && authorization.authorization.hostingDeploy === false, JSON.stringify(authorization.authorization || {}));
  check('AUTHORIZATION_NO_FUNCTIONS', authorization.authorization && authorization.authorization.functionsDeploy === false, JSON.stringify(authorization.authorization || {}));
  check('AUTHORIZATION_NO_IMPORTS', authorization.authorization && authorization.authorization.imports === false && authorization.authorization.policies === false, JSON.stringify(authorization.authorization || {}));

  check('FREEZE_STATUS', freeze.status === 'M2_PRODUCT_READONLY_RUNTIME_AUTHORIZED_ONCE', freeze.status);
  check('FREEZE_GATE', freeze.activeGateId === GATE_ID, freeze.activeGateId);
  check('FREEZE_RUNTIME_AUTH', freeze.m2RuntimeAuthorization && freeze.m2RuntimeAuthorization.active === true && freeze.m2RuntimeAuthorization.consumed === false && freeze.m2RuntimeAuthorization.allowedExecutions === 1, JSON.stringify(freeze.m2RuntimeAuthorization || {}));
  check('FREEZE_M1_M2_STATIC', freeze.stateClarification && freeze.stateClarification.m1Closed === true && freeze.stateClarification.m2StaticClosed === true, JSON.stringify(freeze.stateClarification || {}));
  check('FREEZE_RUNTIME_ENABLED', freeze.stateClarification && freeze.stateClarification.productRuntimeAuthorized === true, JSON.stringify(freeze.stateClarification || {}));
  check('FREEZE_M3_POLICIES_BLOCKED', freeze.stateClarification && freeze.stateClarification.m3Authorized === false && freeze.stateClarification.policiesAuthorized === false, JSON.stringify(freeze.stateClarification || {}));

  check('REQUEST_GATE', request.gateId === GATE_ID && request.contractVersion === '2.1.0', JSON.stringify({gateId:request.gateId,contractVersion:request.contractVersion}));
  check('REQUEST_BRANCH', request.branch === 'ays/backend-tenant-lab-v99-20260703', request.branch);
  check('REQUEST_AUTHORIZED', request.explicitAuthorization === true && request.allowedExecutions === 1, JSON.stringify(request));
  check('REQUEST_SCOPE', request.readOnly === true && request.operationalWrites === false && request.hostingDeploy === false && request.functionsDeploy === false && request.imports === false && request.policies === false && request.m3 === false && request.mergeMain === false, JSON.stringify(request));
  check('REQUEST_BASE_COMMIT', /^[0-9a-f]{40}$/.test(String(request.authorizedBaseCommit || '')), request.authorizedBaseCommit);

  const owners = overlay.replaceCanonicalOwners === true && overlay.canonicalOwners.length ? overlay.canonicalOwners : extension.canonicalOwners || [];
  const required = unique([].concat(gate && gate.requiredFiles || [], overlay.requiredFiles || []));
  for (const rel of required) check(`REQUIRED_FILE:${rel}`, exists(rel), rel);
  for (const validator of unique(gate && gate.validators || [])) check(`VALIDATOR_EXISTS:${validator}`, exists(validator), validator);
  for (const owner of owners) {
    const present = exists(owner.path);
    check(`OWNER_EXISTS:${owner.id}`, present, owner.path);
    if (!present) continue;
    const source = executableText(read(owner.path), owner.path);
    for (const token of unique(owner.requiredTokens || [])) check(`OWNER_TOKEN:${owner.id}:${token}`, source.includes(token), token);
  }
  for (const contract of overlay.runtimeVersionContracts || []) {
    const present = exists(contract.path);
    check(`RUNTIME_FILE:${contract.path}`, present, contract.path);
    if (!present) continue;
    const source = executableText(read(contract.path), contract.path);
    for (const token of unique(contract.requiredTokens || [])) check(`RUNTIME_TOKEN:${contract.path}:${token}`, source.includes(token), token);
  }

  const workflow = gate && gate.workflow || '';
  check('WORKFLOW_EXISTS', workflow && exists(workflow), workflow);
  if (workflow && exists(workflow)) {
    const source = executableText(read(workflow), workflow);
    const preflightIndex = source.indexOf('Preflight canónico antes de secretos');
    const firstSecretIndex = source.indexOf('secrets.');
    check('WORKFLOW_PREFLIGHT_FIRST', preflightIndex >= 0 && firstSecretIndex > preflightIndex, `preflight=${preflightIndex},secret=${firstSecretIndex}`);
    check('WORKFLOW_GATE_ID', source.includes(GATE_ID), workflow);
    check('WORKFLOW_RULES_ONLY', source.includes('firestore:rules,storage') && !source.includes('--only hosting') && !source.includes('--only functions'), workflow);
    check('WORKFLOW_NO_HOSTING', source.includes('No Hosting') && !source.includes('hosting:channel:deploy'), workflow);
    check('WORKFLOW_NO_FUNCTIONS', source.includes('No Functions') && !source.includes('firebase deploy --only functions'), workflow);
    check('WORKFLOW_NO_IMPORTS', !/import(?:ar|acion|ación).*execute/i.test(source), workflow);
    check('WORKFLOW_STATUS', source.includes('orbit360/m2-product-readonly-runtime-v1'), workflow);
    check('WORKFLOW_EXACT_BRANCH', source.includes('ays/backend-tenant-lab-v99-20260703'), workflow);
  }

  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '';
  if (branch) check('RUNTIME_BRANCH', branch === 'ays/backend-tenant-lab-v99-20260703', `actual=${branch}`);
} catch (error) {
  check('ENGINE_EXECUTION', false, String(error && error.message || error));
}

const failed = checks.filter(item => !item.ok);
const payload = {
  schemaVersion: 'orbit360-gate-contract-preflight-m2-runtime-v1',
  gateId: GATE_ID,
  contractVersion: gate && gate.contractVersion || '2.1.0',
  executionPhase: 'PRODUCT_READONLY_RUNTIME',
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'VALIDATOR_STALE' : 'GO_GATE_CONTRACT',
  classification: failed.length ? 'VALIDATOR_STALE' : null,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks,
  sourceTransformed: false,
  dataAccess: false,
  secretAccess: false,
  firestoreRead: false,
  operationalWrites: 0,
  controlledConfigurationWritesExecuted: 0,
  runtimeExecuted: false,
  browserExecuted: false,
  rulesApplied: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false
};

writeEvidence(payload);
console.log(JSON.stringify(payload, null, 2));
process.exit(failed.length ? 41 : 0);
