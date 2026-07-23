#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, 'tools/orbit360-gate-contract-registry-v20260717.json');
const REGISTRY_EXTENSION_RELS = ['tools/orbit360-gate-contract-registry-extension-v20260720.json'];
const OVERLAY_RELS = [
  'tools/orbit360-gate-contract-overlay-v20260718.json',
  'tools/orbit360-gate-contract-overlay-importers-v20260720.json'
];
const FREEZE_REL = 'tools/orbit360-incident-freeze-v20260721.json';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const requestedGateId = process.argv[2] || 'block1-client360-insurers-lab-v20260717';
const ALLOWED_PHASES = new Set(['STATIC_PREFLIGHT', 'LAB_RUNTIME_GATE', 'LAB_HOSTING_DELIVERY', 'LAB_DATA_CONTRACT_REPAIR_DRYRUN', 'LAB_DATA_CONTRACT_REPAIR_APPLY']);

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function json(rel) { return JSON.parse(read(rel)); }
function unique(values) { return [...new Set([].concat(values || []).filter(Boolean))]; }
function executableText(text, rel) {
  let out = String(text || '');
  if (/\.(?:js|mjs|cjs)$/i.test(rel)) out = out.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (/\.html?$/i.test(rel)) out = out.replace(/<!--[\s\S]*?-->/g, '');
  if (/\.ya?ml$/i.test(rel)) out = out.replace(/^\s*#.*$/gm, '');
  return out;
}
function mergeObjects(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
  const out = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) out[key] = mergeObjects(out[key], value);
    else out[key] = value;
  }
  return out;
}
function mergeExtensions(registry, extension) {
  const gates = new Map((registry.gates || []).map(item => [item.gateId, item]));
  for (const gate of extension.gates || []) gates.set(gate.gateId, gate);
  registry.gates = [...gates.values()];
  if (!registry.canonicalOwners) registry.canonicalOwners = [];
  const owners = new Map(registry.canonicalOwners.map(item => [item.id, item]));
  for (const owner of extension.canonicalOwners || []) owners.set(owner.id, owner);
  registry.canonicalOwners = [...owners.values()];
  return registry;
}
function mergeContracts(base, patch) {
  const map = new Map([].concat(base || []).map(item => [item.path, { ...item, requiredTokens: unique(item.requiredTokens) }]));
  for (const item of patch || []) {
    const current = map.get(item.path);
    const requiredTokens = item.replaceRequiredTokens === true
      ? unique(item.requiredTokens)
      : unique([...(current && current.requiredTokens || []), ...unique(item.requiredTokens)]);
    map.set(item.path, { ...(current || {}), ...item, requiredTokens });
  }
  return [...map.values()];
}
function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
function finish(status, checks, exitCode, gate, overlay, metadata = {}) {
  const failed = checks.filter(item => !item.ok);
  const payload = {
    schemaVersion: 'orbit360-gate-contract-preflight-v12-overlay-scope',
    gateId: requestedGateId,
    contractVersion: gate && gate.contractVersion || '',
    diagnosticRevision: gate && gate.diagnosticRevision || '',
    executionPhase: metadata.executionPhase || '',
    overlayRevision: overlay && overlay.contractRevision || '',
    overlayPath: metadata.overlayPath || '',
    registryExtensions: metadata.registryExtensions || [],
    canonicalOwnerScope: metadata.canonicalOwnerScope || '',
    runtimeContractScope: metadata.runtimeContractScope || '',
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
    checks,
    sourceTransformed: false,
    dataAccess: false,
    secretAccess: false,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false
  };
  writeEvidence(payload);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(exitCode);
}

const bootstrap = [];
const boot = (id, ok, detail = '') => bootstrap.push({ id, ok: Boolean(ok), detail });
if (!fs.existsSync(REGISTRY_PATH)) finish('VALIDATOR_STALE', [{ id:'REGISTRY_EXISTS', ok:false, detail:REGISTRY_PATH }], 41, null, null);
let registry;
try { registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); }
catch (error) { finish('VALIDATOR_STALE', [{ id:'REGISTRY_VALID_JSON', ok:false, detail:error.message }], 41, null, null); }

const loadedExtensions = [];
for (const rel of REGISTRY_EXTENSION_RELS) {
  if (!exists(rel)) continue;
  let extension;
  try { extension = json(rel); }
  catch (error) { finish('VALIDATOR_STALE', [{ id:`REGISTRY_EXTENSION_VALID_JSON:${rel}`, ok:false, detail:error.message }], 41, null, null); }
  boot(`REGISTRY_EXTENSION_SCHEMA:${rel}`, extension.schemaVersion === 'orbit360-gate-contract-registry-extension-v1', extension.schemaVersion || 'missing');
  registry = mergeExtensions(registry, extension);
  loadedExtensions.push(rel);
}

const overlays = [];
for (const rel of OVERLAY_RELS) {
  if (!exists(rel)) continue;
  let overlay;
  try { overlay = json(rel); }
  catch (error) { finish('VALIDATOR_STALE', [{ id:`OVERLAY_VALID_JSON:${rel}`, ok:false, detail:error.message }], 41, null, null); }
  boot(`OVERLAY_SCHEMA_VERSION:${rel}`, overlay.schemaVersion === 'orbit360-gate-contract-overlay-v1', overlay.schemaVersion || 'missing');
  overlays.push({ rel, overlay });
}
const selected = overlays.find(item => item.overlay && item.overlay.gateId === requestedGateId);
if (!selected) finish('VALIDATOR_STALE', bootstrap.concat([{ id:'OVERLAY_FOR_GATE_PRESENT', ok:false, detail:requestedGateId }]), 41, null, null, { registryExtensions:loadedExtensions });
const overlay = selected.overlay;
let gate = (registry.gates || []).find(item => item.gateId === requestedGateId);
if (!gate) finish('VALIDATOR_STALE', bootstrap.concat([{ id:'GATE_REGISTERED', ok:false, detail:requestedGateId }]), 41, null, overlay, { overlayPath:selected.rel, registryExtensions:loadedExtensions });
if (overlay.gatePatch) gate = mergeObjects(gate, overlay.gatePatch);

const replaceOwners = overlay.replaceCanonicalOwners === true;
const owners = replaceOwners
  ? [].concat(overlay.canonicalOwners || [])
  : (() => {
      const map = new Map((registry.canonicalOwners || []).map(item => [item.id, item]));
      for (const owner of overlay.canonicalOwners || []) map.set(owner.id, owner);
      return [...map.values()];
    })();
const replaceRequiredFiles = overlay.replaceRequiredFiles === true;
const requiredFiles = replaceRequiredFiles
  ? unique(overlay.requiredFiles)
  : unique([...(gate.requiredFiles || []), ...(overlay.requiredFiles || [])]);
const replaceRuntimeContracts = overlay.replaceRuntimeVersionContracts === true;
const runtimeContracts = replaceRuntimeContracts
  ? [].concat(overlay.runtimeVersionContracts || [])
  : mergeContracts(gate.runtimeVersionContracts || [], overlay.runtimeVersionContracts || []);
const validators = unique(gate.validators || []);
const executionProfile = gate.executionProfile && typeof gate.executionProfile === 'object' ? gate.executionProfile : null;
const executionPhase = String(executionProfile && executionProfile.phase || '');
const capabilities = executionProfile && executionProfile.capabilities || {};
const workflowLocks = executionProfile && executionProfile.workflowLocks || {};
const checks = [...bootstrap];
const check = (id, ok, detail = '') => checks.push({ id, ok:Boolean(ok), detail });

check('SCHEMA_VERSION', registry.schemaVersion === 'orbit360-gate-contract-registry-v1', registry.schemaVersion || 'missing');
check('OVERLAY_PRESENT', Boolean(overlay), selected.rel);
check('OVERLAY_GATE_MATCH', overlay.gateId === requestedGateId, overlay.gateId || 'missing');
check('OVERLAY_CONTRACT_MATCH', String(overlay.contractRevision || '').startsWith(String(gate.contractVersion || '')), `${overlay.contractRevision || 'missing'} vs ${gate.contractVersion || 'missing'}`);
check('OVERLAY_REPLACES_CANONICAL_OWNERS', replaceOwners, String(overlay.replaceCanonicalOwners));
check('OVERLAY_REPLACES_RUNTIME_CONTRACTS', replaceRuntimeContracts, String(overlay.replaceRuntimeVersionContracts));
check('ACTIVE_BLOCK', Number(gate.block) === Number(registry.plan && registry.plan.activeBlock), `gate=${gate.block};plan=${registry.plan && registry.plan.activeBlock}`);
check('RUNTIME_VERSION_FORMAT', /^\d{8}-\d+$/.test(String(gate.runtimeVersion || '')), gate.runtimeVersion || 'missing');
check('EXECUTION_PROFILE_DECLARED', Boolean(executionProfile), executionPhase || 'missing');
check('EXECUTION_PHASE_ALLOWED', ALLOWED_PHASES.has(executionPhase), executionPhase || 'missing');
check('EXECUTION_BRANCH_LOCK_DECLARED', workflowLocks.branch === true, JSON.stringify(workflowLocks));

if (executionPhase === 'STATIC_PREFLIGHT') {
  for (const key of ['secrets','firestoreRead','writes','runtime','browser','deploy','functionsDeploy','rulesDeploy','production']) {
    check(`STATIC_CAPABILITY_DISABLED:${key}`, capabilities[key] === false, `${key}=${String(capabilities[key])}`);
  }
  check('STATIC_PROJECT_LOCK_DISABLED', workflowLocks.firebaseProject === false, JSON.stringify(workflowLocks));
  check('STATIC_CHANNEL_LOCK_DISABLED', workflowLocks.hostingChannel === false, JSON.stringify(workflowLocks));
}

for (const rel of requiredFiles) check(`REQUIRED_FILE:${rel}`, exists(rel), rel);
for (const rel of validators) check(`VALIDATOR_EXISTS:${rel}`, exists(rel), rel);
for (const owner of owners) {
  const present = exists(owner.path);
  check(`OWNER_EXISTS:${owner.id}`, present, owner.path);
  if (!present) continue;
  const source = executableText(read(owner.path), owner.path);
  for (const token of unique(owner.requiredTokens)) check(`OWNER_TOKEN:${owner.id}:${token}`, source.includes(token), `${owner.path} → ${token}`);
}

check('WORKFLOW_EXISTS', exists(gate.workflow), gate.workflow || 'missing');
if (exists(gate.workflow)) {
  const workflow = executableText(read(gate.workflow), gate.workflow);
  check('WORKFLOW_VALIDATION_ONLY', workflow.includes('VALIDATION_ONLY') && !workflow.includes('git commit') && !workflow.includes('git push'), gate.workflow);
  check('WORKFLOW_CALLS_PREFLIGHT', workflow.includes('orbit360-validar-gate-contracts-v20260717.mjs') && workflow.includes(requestedGateId), gate.workflow);
  check('WORKFLOW_PUBLISHES_CANONICAL_EVIDENCE', workflow.includes(EVIDENCE_REL), EVIDENCE_REL);
  check('WORKFLOW_BRANCH_LOCK', workflow.includes(gate.environment.branch), gate.environment.branch);
  check('WORKFLOW_PHASE_LOCK', workflow.includes(`ORBIT360_GATE_PHASE: ${executionPhase.toLowerCase()}`), executionPhase);
  check('WORKFLOW_PROJECT_LOCK_NOT_APPLICABLE', workflowLocks.firebaseProject !== true && !workflow.includes(gate.environment.firebaseProjectId), `phase=${executionPhase}`);
  check('WORKFLOW_CHANNEL_LOCK_NOT_APPLICABLE', workflowLocks.hostingChannel !== true && !workflow.includes(gate.environment.hostingChannel), `phase=${executionPhase}`);
  check('WORKFLOW_NO_SOURCE_TRANSFORMER', !/orbit360-(?:reparar|aplicar-correccion|alinear-fase)-directorio-operativo/.test(workflow), gate.workflow);
}

check('RUNTIME_VERSION_CONTRACTS_DECLARED', runtimeContracts.length >= 5, `contracts=${runtimeContracts.length}`);
for (const contract of runtimeContracts) {
  const rel = String(contract && contract.path || '');
  const tokens = unique(contract && contract.requiredTokens || []);
  const present = Boolean(rel && exists(rel));
  check(`RUNTIME_VERSION_FILE_EXISTS:${rel || 'missing'}`, present, rel || 'missing');
  check(`RUNTIME_VERSION_TOKENS_DECLARED:${rel || 'missing'}`, tokens.length > 0, `tokens=${tokens.length}`);
  if (!present) continue;
  const source = executableText(read(rel), rel);
  for (const token of tokens) check(`RUNTIME_VERSION_TOKEN:${rel}:${token}`, source.includes(token), `${rel} → ${token}`);
}

if (exists(FREEZE_REL)) {
  let freeze;
  try { freeze = json(FREEZE_REL); }
  catch (error) { check('FREEZE_VALID_JSON', false, error.message); }
  if (freeze) {
    check('FREEZE_M1_OPEN', freeze.stateClarification && freeze.stateClarification.m1Closed === false && freeze.stateClarification.m2Authorized === false, freeze.status || 'missing');
    check('FREEZE_DATA_BLOCKED', freeze.stateClarification && freeze.stateClarification.operationalDirectoryDryRun === 'NOT_AUTHORIZED' && freeze.stateClarification.operationalDirectoryApply === 'NOT_AUTHORIZED', freeze.status || 'missing');
  }
}
for (const rel of ['orbit360-platform/data/store.js','orbit360-platform/data/store-firestore-lab.local.js','orbit360-platform/core/auth.js','orbit360-platform/core/importa.js','firestore.rules']) {
  check(`PROTECTED_PATH_PRESENT:${rel}`, exists(rel), rel);
}
const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '';
if (branch) check('RUNTIME_BRANCH', branch === gate.environment.branch, `actual=${branch};expected=${gate.environment.branch}`);

const metadata = {
  overlayPath:selected.rel,
  registryExtensions:loadedExtensions,
  executionPhase,
  canonicalOwnerScope:replaceOwners ? 'overlay_replace' : 'registry_merge',
  runtimeContractScope:replaceRuntimeContracts ? 'overlay_replace' : 'gate_merge'
};
const failed = checks.filter(item => !item.ok);
finish(failed.length ? 'VALIDATOR_STALE' : 'GO_GATE_CONTRACT', checks, failed.length ? 41 : 0, gate, overlay, metadata);
