#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || 'block2-product-readonly-bootstrap-v20260723';
const BASE_REGISTRY = 'tools/orbit360-gate-contract-registry-v20260717.json';
const EXTENSION = 'tools/orbit360-gate-contract-registry-extension-m2-v20260723.json';
const OVERLAY = 'tools/orbit360-gate-contract-overlay-m2-v20260723.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-m2-v20260723.json';
const FREEZE = 'tools/orbit360-incident-freeze-v20260721.json';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const STATIC_PREFLIGHT = 'STATIC_PREFLIGHT';
const M2_STATIC_PATCH_AUTHORIZED = 'M2_PRODUCT_READONLY_STATIC_PATCH_AUTHORIZED_ONCE';
const EXPECTED_CAPABILITIES = Object.freeze({
  secrets: false,
  firestoreRead: false,
  writes: false,
  runtime: false,
  browser: false,
  deploy: false,
  functionsDeploy: false,
  rulesDeploy: false,
  production: false
});

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function json(rel) {
  return JSON.parse(read(rel));
}

function unique(values) {
  return [...new Set([].concat(values || []).filter(Boolean))];
}

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
function check(id, ok, detail = '') {
  checks.push({ id, ok: Boolean(ok), detail: String(detail || '') });
}

let registry = null;
let extension = null;
let overlay = null;
let lifecycle = null;
let freeze = null;
let gate = null;

try {
  check('BASE_REGISTRY_EXISTS', exists(BASE_REGISTRY), BASE_REGISTRY);
  check('M2_EXTENSION_EXISTS', exists(EXTENSION), EXTENSION);
  check('M2_OVERLAY_EXISTS', exists(OVERLAY), OVERLAY);
  check('M2_LIFECYCLE_EXISTS', exists(LIFECYCLE), LIFECYCLE);
  check('FREEZE_EXISTS', exists(FREEZE), FREEZE);

  registry = json(BASE_REGISTRY);
  extension = json(EXTENSION);
  overlay = json(OVERLAY);
  lifecycle = json(LIFECYCLE);
  freeze = json(FREEZE);

  check('BASE_REGISTRY_SCHEMA', registry.schemaVersion === 'orbit360-gate-contract-registry-v1', registry.schemaVersion);
  check('M2_EXTENSION_SCHEMA', extension.schemaVersion === 'orbit360-gate-contract-registry-extension-v1', extension.schemaVersion);
  check('M2_OVERLAY_SCHEMA', overlay.schemaVersion === 'orbit360-gate-contract-overlay-v1', overlay.schemaVersion);
  check('M2_LIFECYCLE_SCHEMA', lifecycle.schemaVersion === 'orbit360-validator-lifecycle-contract-m2-v1-static', lifecycle.schemaVersion);

  const gates = new Map((registry.gates || []).map(item => [item.gateId, item]));
  for (const item of extension.gates || []) gates.set(item.gateId, item);
  gate = gates.get(GATE_ID) || null;

  const activeBlock = Number(extension.planPatch && extension.planPatch.activeBlock);
  check('M2_GATE_REGISTERED', Boolean(gate), GATE_ID);
  check('M2_ACTIVE_BLOCK', activeBlock === 2, String(activeBlock));
  check('M2_PREVIOUS_BLOCK_CLOSED', extension.planPatch && extension.planPatch.previousBlockStatus === 'M1_CLOSED_HUMAN_APPROVED', JSON.stringify(extension.planPatch || {}));
  check('M2_GATE_BLOCK', gate && Number(gate.block) === 2, gate && gate.block);
  check('M2_GATE_VERSION', gate && gate.contractVersion === '2.0.0', gate && gate.contractVersion);
  check('M2_RUNTIME_VERSION', gate && /^\d{8}-\d+$/.test(String(gate.runtimeVersion || '')), gate && gate.runtimeVersion);
  check('M2_OVERLAY_GATE', overlay.gateId === GATE_ID, overlay.gateId);
  check('M2_OVERLAY_VERSION', String(overlay.contractRevision || '').startsWith('2.0.0'), overlay.contractRevision);
  check('M2_LIFECYCLE_GATE', lifecycle.gateId === GATE_ID, lifecycle.gateId);
  check('M2_LIFECYCLE_VERSION', lifecycle.gateContractVersion === '2.0.0', lifecycle.gateContractVersion);
  check('M2_LIFECYCLE_REVISION', lifecycle.validatorLifecycleRevision === 'phase-capability-contract-v1', lifecycle.validatorLifecycleRevision);

  const profile = overlay.gatePatch && overlay.gatePatch.executionProfile || gate && gate.executionProfile || {};
  check('M2_EXECUTION_PHASE', profile.phase === STATIC_PREFLIGHT, profile.phase);
  check('M2_EXACT_CAPABILITIES', exactCapabilities(profile.capabilities || {}, EXPECTED_CAPABILITIES), JSON.stringify(profile.capabilities || {}));
  check('M2_BRANCH_LOCK', profile.workflowLocks && profile.workflowLocks.branch === true, JSON.stringify(profile.workflowLocks || {}));
  check('M2_PROJECT_LOCK_DISABLED', profile.workflowLocks && profile.workflowLocks.firebaseProject === false, JSON.stringify(profile.workflowLocks || {}));
  check('M2_CHANNEL_LOCK_DISABLED', profile.workflowLocks && profile.workflowLocks.hostingChannel === false, JSON.stringify(profile.workflowLocks || {}));
  check('M2_REQUEST_MODEL', profile.requestModel === 'immutable-request-bound-to-m2-static-patch-v1', profile.requestModel);

  check('FREEZE_STATUS', freeze.status === M2_STATIC_PATCH_AUTHORIZED, freeze.status);
  check('FREEZE_M1_CLOSED', freeze.stateClarification && freeze.stateClarification.m1Closed === true, JSON.stringify(freeze.stateClarification || {}));
  check('FREEZE_M2_AUTHORIZED', freeze.stateClarification && freeze.stateClarification.m2Authorized === true, JSON.stringify(freeze.stateClarification || {}));
  check('FREEZE_M2_PHASE', freeze.stateClarification && freeze.stateClarification.m2Phase === 'STATIC_PATCH_VALIDATION', JSON.stringify(freeze.stateClarification || {}));
  check('FREEZE_M3_BLOCKED', freeze.stateClarification && freeze.stateClarification.m3Authorized === false, JSON.stringify(freeze.stateClarification || {}));
  check('FREEZE_AUTH_ACTIVE', freeze.m2StaticPatchAuthorization && freeze.m2StaticPatchAuthorization.active === true && freeze.m2StaticPatchAuthorization.consumed === false && freeze.m2StaticPatchAuthorization.allowedExecutions === 1, JSON.stringify(freeze.m2StaticPatchAuthorization || {}));

  const owners = overlay.replaceCanonicalOwners === true ? overlay.canonicalOwners || [] : extension.canonicalOwners || [];
  check('M2_REPLACE_OWNERS', overlay.replaceCanonicalOwners === true, String(overlay.replaceCanonicalOwners));
  check('M2_REPLACE_REQUIRED_FILES', overlay.replaceRequiredFiles === true, String(overlay.replaceRequiredFiles));
  check('M2_REPLACE_RUNTIME_CONTRACTS', overlay.replaceRuntimeVersionContracts === true, String(overlay.replaceRuntimeVersionContracts));

  for (const rel of unique(overlay.requiredFiles || [])) check(`REQUIRED_FILE:${rel}`, exists(rel), rel);
  for (const validator of unique(gate && gate.validators || [])) check(`VALIDATOR_EXISTS:${validator}`, exists(validator), validator);

  for (const owner of owners) {
    const present = exists(owner.path);
    check(`OWNER_EXISTS:${owner.id}`, present, owner.path);
    if (!present) continue;
    const source = executableText(read(owner.path), owner.path);
    for (const token of unique(owner.requiredTokens || [])) {
      check(`OWNER_TOKEN:${owner.id}:${token}`, source.includes(token), `${owner.path} -> ${token}`);
    }
  }

  const runtimeContracts = overlay.runtimeVersionContracts || [];
  check('M2_RUNTIME_CONTRACT_COUNT', runtimeContracts.length >= 7, String(runtimeContracts.length));
  for (const contract of runtimeContracts) {
    const rel = String(contract.path || '');
    const tokens = unique(contract.requiredTokens || []);
    const present = rel && exists(rel);
    check(`RUNTIME_FILE:${rel || 'missing'}`, present, rel || 'missing');
    check(`RUNTIME_TOKENS:${rel || 'missing'}`, tokens.length > 0, String(tokens.length));
    if (!present) continue;
    const source = executableText(read(rel), rel);
    for (const token of tokens) check(`RUNTIME_TOKEN:${rel}:${token}`, source.includes(token), token);
  }

  const workflow = gate && gate.workflow || '';
  check('M2_WORKFLOW_EXISTS', workflow && exists(workflow), workflow);
  if (workflow && exists(workflow)) {
    const source = executableText(read(workflow), workflow);
    check('M2_WORKFLOW_CANONICAL_PREFLIGHT', source.includes('orbit360-validar-gate-contracts-v20260717.mjs') && source.includes(GATE_ID), workflow);
    check('M2_WORKFLOW_EVIDENCE', source.includes(EVIDENCE_REL), EVIDENCE_REL);
    check('M2_WORKFLOW_BRANCH', source.includes('ays/backend-tenant-lab-v99-20260703'), workflow);
    check('M2_WORKFLOW_PHASE', source.includes('ORBIT360_GATE_PHASE: static_preflight'), workflow);
    check('M2_WORKFLOW_VALIDATION_ONLY', source.includes('VALIDATION_ONLY'), workflow);
    check('M2_WORKFLOW_ROOT_CONTRACT', source.includes('orbit360-m2-product-readonly-bootstrap-contract-v20260723.cjs'), workflow);
    check('M2_WORKFLOW_NO_REPOSITORY_WRITE', !source.includes('git commit') && !source.includes('git push'), workflow);
    check('M2_WORKFLOW_NO_EXTERNAL_SECRET', !source.includes('secrets.'), workflow);
    check('M2_WORKFLOW_NO_PROJECT_LOCK', !source.includes('PRODUCT_PROJECT_NOT_AUTHORIZED'), workflow);
    check('M2_WORKFLOW_NO_CHANNEL_LOCK', !source.includes('PRODUCT_CHANNEL_NOT_AUTHORIZED'), workflow);
    check('M2_WORKFLOW_NO_DEPLOY', !source.includes('firebase deploy') && !source.includes('hosting:channel:deploy'), workflow);
  }

  const productEntry = 'orbit360-platform/product-readonly.html';
  if (exists(productEntry)) {
    const source = executableText(read(productEntry), productEntry);
    for (const forbidden of ['backend-lab-loader.js', 'store-firestore-lab.local.js', 'data/seed.js', 'Orbit.SEED', 'URLSearchParams', 'location.search']) {
      check(`PRODUCT_ENTRY_FORBIDS:${forbidden}`, !source.includes(forbidden), forbidden);
    }
  }

  for (const rel of [
    'orbit360-platform/index.html',
    'orbit360-platform/data/store.js',
    'orbit360-platform/data/store-firestore-lab.local.js',
    'orbit360-platform/core/auth.js',
    'orbit360-platform/core/importa.js',
    'firestore.rules'
  ]) check(`PROTECTED_PATH_PRESENT:${rel}`, exists(rel), rel);

  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '';
  if (branch) check('M2_RUNTIME_BRANCH', branch === 'ays/backend-tenant-lab-v99-20260703', `actual=${branch}`);
} catch (error) {
  check('M2_ENGINE_EXECUTION', false, String(error && error.message || error));
}

const failed = checks.filter(item => !item.ok);
const payload = {
  schemaVersion: 'orbit360-gate-contract-preflight-m2-static-v1',
  gateId: GATE_ID,
  contractVersion: gate && gate.contractVersion || '2.0.0',
  executionPhase: STATIC_PREFLIGHT,
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
