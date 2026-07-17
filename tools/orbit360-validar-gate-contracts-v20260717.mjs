#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, 'tools/orbit360-gate-contract-registry-v20260717.json');
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const requestedGateId = process.argv[2] || 'block1-client360-insurers-lab-v20260717';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function executableText(text, rel) {
  let out = String(text || '');
  if (/\.(?:js|mjs|cjs)$/i.test(rel)) {
    out = out.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  }
  if (/\.html?$/i.test(rel)) {
    out = out.replace(/<!--[\s\S]*?-->/g, '');
  }
  if (/\.ya?ml$/i.test(rel)) {
    out = out.replace(/^\s*#.*$/gm, '');
  }
  return out;
}
function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}
function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
function resultAndExit(status, checks, exitCode) {
  const failed = checks.filter(item => !item.ok);
  const payload = {
    schemaVersion: 'orbit360-gate-contract-preflight-v3-sanitized-evidence',
    gateId: requestedGateId,
    generatedAt: new Date().toISOString(),
    containsPII: false,
    containsSecrets: false,
    status,
    classification: status === 'GO_GATE_CONTRACT' ? null : 'VALIDATOR_STALE',
    evidencePath: EVIDENCE_REL,
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(item => item.id),
    checks
  };
  writeEvidence(payload);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(exitCode);
}

if (!fs.existsSync(REGISTRY_PATH)) {
  resultAndExit('VALIDATOR_STALE', [{ id: 'REGISTRY_EXISTS', ok: false, detail: REGISTRY_PATH }], 41);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (error) {
  resultAndExit('VALIDATOR_STALE', [{ id: 'REGISTRY_VALID_JSON', ok: false, detail: error.message }], 41);
}

const gate = (registry.gates || []).find(item => item.gateId === requestedGateId);
if (!gate) {
  resultAndExit('VALIDATOR_STALE', [{ id: 'GATE_REGISTERED', ok: false, detail: requestedGateId }], 41);
}

const checks = [];
const check = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });

check('SCHEMA_VERSION', registry.schemaVersion === 'orbit360-gate-contract-registry-v1', registry.schemaVersion || 'missing');
check('ACTIVE_BLOCK', Number(gate.block) === Number(registry.plan && registry.plan.activeBlock), `gate=${gate.block}; plan=${registry.plan && registry.plan.activeBlock}`);
check('WORKFLOW_EXISTS', exists(gate.workflow), gate.workflow);
check('PREFLIGHT_MATCH', gate.preflight === 'tools/orbit360-validar-gate-contracts-v20260717.mjs', gate.preflight || 'missing');
check('PREFLIGHT_EVIDENCE_MATCH', gate.preflightEvidence === EVIDENCE_REL, gate.preflightEvidence || 'missing');

for (const rel of gate.requiredFiles || []) {
  check(`REQUIRED_FILE:${rel}`, exists(rel), rel);
}
for (const rel of gate.validators || []) {
  check(`VALIDATOR_EXISTS:${rel}`, exists(rel), rel);
}
for (const owner of registry.canonicalOwners || []) {
  const ownerExists = exists(owner.path);
  check(`OWNER_EXISTS:${owner.id}`, ownerExists, owner.path);
  if (!ownerExists) continue;
  const source = executableText(read(owner.path), owner.path);
  for (const token of owner.requiredTokens || []) {
    check(`OWNER_TOKEN:${owner.id}:${token}`, source.includes(token), `${owner.path} → ${token}`);
  }
}

const forbiddenTokens = unique(gate.forbiddenRuntimeReferences || []);
const retiredFiles = forbiddenTokens.filter(token => /\.js$/i.test(token) || /^install/.test(token));

if (exists(gate.workflow)) {
  const workflow = executableText(read(gate.workflow), gate.workflow);
  for (const token of retiredFiles) {
    check(`WORKFLOW_NO_RETIRED_REF:${token}`, !workflow.includes(token), `${gate.workflow} → ${token}`);
  }
  check('WORKFLOW_CALLS_PREFLIGHT', workflow.includes('orbit360-validar-gate-contracts-v20260717.mjs') && workflow.includes(requestedGateId), gate.workflow);
  check('WORKFLOW_PUBLISHES_PREFLIGHT_EVIDENCE', workflow.includes(EVIDENCE_REL), `${gate.workflow} → ${EVIDENCE_REL}`);
  check('WORKFLOW_BRANCH_LOCK', workflow.includes(gate.environment.branch), gate.environment.branch);
  check('WORKFLOW_PROJECT_LOCK', workflow.includes(gate.environment.firebaseProjectId), gate.environment.firebaseProjectId);
  check('WORKFLOW_CHANNEL_LOCK', workflow.includes(gate.environment.hostingChannel), gate.environment.hostingChannel);
}

/*
 * Fail-closed runtime graph validation.
 * A retired bridge can be reintroduced transitively by a loader even when the
 * workflow and the final runtime validator no longer mention it. The registry
 * therefore declares every active bootstrap/owner file that can participate in
 * the slice, and this preflight scans executable content before secrets,
 * Firebase, Hosting or Playwright are used.
 */
const fallbackRuntimeGraph = [
  ...(gate.requiredFiles || []),
  'orbit360-platform/index.html',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-auth-guard.js'
];
const runtimeGraphFiles = unique((gate.runtimeGraphFiles && gate.runtimeGraphFiles.length)
  ? gate.runtimeGraphFiles
  : fallbackRuntimeGraph);

check('RUNTIME_GRAPH_DECLARED', runtimeGraphFiles.length > 0, `files=${runtimeGraphFiles.length}`);
for (const rel of runtimeGraphFiles) {
  const present = exists(rel);
  check(`RUNTIME_GRAPH_FILE_EXISTS:${rel}`, present, rel);
  if (!present) continue;
  const source = executableText(read(rel), rel);
  for (const token of forbiddenTokens) {
    check(`RUNTIME_GRAPH_NO_RETIRED_REF:${rel}:${token}`, !source.includes(token), `${rel} → ${token}`);
  }
}

const currentBranch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '';
if (currentBranch) {
  check('RUNTIME_BRANCH', currentBranch === gate.environment.branch, `actual=${currentBranch}; expected=${gate.environment.branch}`);
}

const protectedPaths = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/auth.js',
  'orbit360-platform/core/importa.js',
  'firestore.rules'
];
for (const rel of protectedPaths) {
  check(`PROTECTED_PATH_PRESENT:${rel}`, exists(rel), rel);
}

const failed = checks.filter(item => !item.ok);
if (failed.length) resultAndExit('VALIDATOR_STALE', checks, 41);
resultAndExit('GO_GATE_CONTRACT', checks, 0);
