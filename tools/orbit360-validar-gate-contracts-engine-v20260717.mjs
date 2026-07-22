#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, 'tools/orbit360-gate-contract-registry-v20260717.json');
const REGISTRY_EXTENSION_RELS = [
  'tools/orbit360-gate-contract-registry-extension-v20260720.json'
];
const OVERLAY_RELS = [
  'tools/orbit360-gate-contract-overlay-v20260718.json',
  'tools/orbit360-gate-contract-overlay-importers-v20260720.json'
];
const INCIDENT_FREEZE_RELS = [
  'tools/orbit360-incident-freeze-v20260721.json'
];
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
  if (/\.html?$/i.test(rel)) out = out.replace(/<!--[\s\S]*?-->/g, '');
  if (/\.ya?ml$/i.test(rel)) out = out.replace(/^\s*#.*$/gm, '');
  return out;
}
function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
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
function mergeRegistryExtension(registry, extension) {
  const owners = new Map((registry.canonicalOwners || []).map(item => [item.id, item]));
  for (const owner of extension.canonicalOwners || []) owners.set(owner.id, owner);
  registry.canonicalOwners = [...owners.values()];

  const gates = new Map((registry.gates || []).map(item => [item.gateId, item]));
  for (const gate of extension.gates || []) gates.set(gate.gateId, gate);
  registry.gates = [...gates.values()];
  return registry;
}
function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
function resultAndExit(status, checks, exitCode, gate = null, overlay = null, metadata = {}) {
  const failed = checks.filter(item => !item.ok);
  const classification = status === 'GO_GATE_CONTRACT'
    ? null
    : status === 'INCIDENT_FROZEN'
      ? 'METHODOLOGY_ENFORCEMENT_FAILURE'
      : 'VALIDATOR_STALE';
  const payload = {
    schemaVersion: 'orbit360-gate-contract-preflight-v8-incident-freeze',
    gateId: requestedGateId,
    contractVersion: gate && gate.contractVersion || '',
    diagnosticRevision: gate && gate.diagnosticRevision || '',
    overlayRevision: overlay && overlay.contractRevision || '',
    overlayPath: metadata.overlayPath || '',
    incidentFreezePath: metadata.incidentFreezePath || '',
    incidentId: metadata.incidentId || '',
    registryExtensions: metadata.registryExtensions || [],
    generatedAt: new Date().toISOString(),
    containsPII: false,
    containsSecrets: false,
    status,
    classification,
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

for (const rel of INCIDENT_FREEZE_RELS) {
  if (!exists(rel)) continue;
  let freeze;
  try {
    freeze = JSON.parse(read(rel));
  } catch (error) {
    resultAndExit(
      'INCIDENT_FROZEN',
      [{ id: `INCIDENT_FREEZE_VALID_JSON:${rel}`, ok: false, detail: error.message }],
      42,
      null,
      null,
      { incidentFreezePath: rel }
    );
  }
  const status = String(freeze && freeze.status || '');
  const blockedGateIds = Array.isArray(freeze && freeze.blockedGateIds) ? freeze.blockedGateIds : [];
  const blocksRequestedGate = status.startsWith('STOP_THE_LINE') && blockedGateIds.includes(requestedGateId);
  if (blocksRequestedGate) {
    resultAndExit(
      'INCIDENT_FROZEN',
      [{
        id: 'ACTIVE_INCIDENT_FREEZE',
        ok: false,
        detail: `${freeze.incidentId || 'incident'}:${status}:${requestedGateId}`
      }],
      42,
      null,
      null,
      {
        incidentFreezePath: rel,
        incidentId: freeze.incidentId || ''
      }
    );
  }
}

const bootstrapChecks = [];
const bootstrapCheck = (id, ok, detail = '') => bootstrapChecks.push({ id, ok: Boolean(ok), detail });

if (!fs.existsSync(REGISTRY_PATH)) {
  resultAndExit('VALIDATOR_STALE', [{ id: 'REGISTRY_EXISTS', ok: false, detail: REGISTRY_PATH }], 41);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (error) {
  resultAndExit('VALIDATOR_STALE', [{ id: 'REGISTRY_VALID_JSON', ok: false, detail: error.message }], 41);
}

const loadedExtensions = [];
for (const rel of REGISTRY_EXTENSION_RELS) {
  if (!exists(rel)) continue;
  let extension;
  try {
    extension = JSON.parse(read(rel));
  } catch (error) {
    resultAndExit('VALIDATOR_STALE', [{ id: `REGISTRY_EXTENSION_VALID_JSON:${rel}`, ok: false, detail: error.message }], 41);
  }
  bootstrapCheck(`REGISTRY_EXTENSION_SCHEMA:${rel}`, extension.schemaVersion === 'orbit360-gate-contract-registry-extension-v1', extension.schemaVersion || 'missing');
  registry = mergeRegistryExtension(registry, extension);
  loadedExtensions.push(rel);
}

const overlays = [];
for (const rel of OVERLAY_RELS) {
  if (!exists(rel)) continue;
  let overlay;
  try {
    overlay = JSON.parse(read(rel));
  } catch (error) {
    resultAndExit('VALIDATOR_STALE', [{ id: `OVERLAY_VALID_JSON:${rel}`, ok: false, detail: error.message }], 41);
  }
  bootstrapCheck(`OVERLAY_SCHEMA_VERSION:${rel}`, overlay.schemaVersion === 'orbit360-gate-contract-overlay-v1', overlay.schemaVersion || 'missing');
  overlays.push({ rel, overlay });
}

const selected = overlays.find(item => item.overlay && item.overlay.gateId === requestedGateId) || null;
if (!selected) {
  resultAndExit(
    'VALIDATOR_STALE',
    bootstrapChecks.concat([{ id: 'OVERLAY_FOR_GATE_PRESENT', ok: false, detail: `${requestedGateId} in ${OVERLAY_RELS.join(', ')}` }]),
    41,
    null,
    null,
    { registryExtensions: loadedExtensions }
  );
}
const overlay = selected.overlay;

let gate = (registry.gates || []).find(item => item.gateId === requestedGateId);
if (!gate) {
  resultAndExit(
    'VALIDATOR_STALE',
    bootstrapChecks.concat([{ id: 'GATE_REGISTERED', ok: false, detail: requestedGateId }]),
    41,
    null,
    overlay,
    { overlayPath: selected.rel, registryExtensions: loadedExtensions }
  );
}

if (overlay.gatePatch) gate = mergeObjects(gate, overlay.gatePatch);

const owners = new Map((registry.canonicalOwners || []).map(item => [item.id, item]));
for (const owner of overlay.canonicalOwners || []) owners.set(owner.id, owner);
registry.canonicalOwners = [...owners.values()];

gate.requiredFiles = unique([...(gate.requiredFiles || []), ...(overlay.requiredFiles || [])]);
gate.runtimeGraphFiles = unique([...(gate.runtimeGraphFiles || []), ...(overlay.runtimeGraphFiles || [])]);

const contracts = new Map((gate.runtimeVersionContracts || []).map(item => [item.path, {
  ...item,
  requiredTokens: unique(item.requiredTokens || [])
}]));
for (const contract of overlay.runtimeVersionContracts || []) {
  const current = contracts.get(contract.path);
  if (current) {
    current.requiredTokens = contract.replaceRequiredTokens === true
      ? unique(contract.requiredTokens || [])
      : unique([...(current.requiredTokens || []), ...(contract.requiredTokens || [])]);
    contracts.set(contract.path, { ...current, ...contract, requiredTokens: current.requiredTokens });
  } else {
    contracts.set(contract.path, { ...contract, requiredTokens: unique(contract.requiredTokens || []) });
  }
}
gate.runtimeVersionContracts = [...contracts.values()];

const checks = [...bootstrapChecks];
const check = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });

check('SCHEMA_VERSION', registry.schemaVersion === 'orbit360-gate-contract-registry-v1', registry.schemaVersion || 'missing');
check('OVERLAY_PRESENT', Boolean(overlay), selected.rel);
check('OVERLAY_SCHEMA_VERSION', overlay.schemaVersion === 'orbit360-gate-contract-overlay-v1', overlay.schemaVersion || 'missing');
check('OVERLAY_GATE_MATCH', overlay.gateId === requestedGateId, overlay.gateId || 'missing');
check(
  'OVERLAY_CONTRACT_MATCH',
  overlay.contractRevision && String(overlay.contractRevision).startsWith(String(gate.contractVersion)),
  `${overlay.contractRevision || 'missing'} vs ${gate.contractVersion || 'missing'}`
);
check('ACTIVE_BLOCK', Number(gate.block) === Number(registry.plan && registry.plan.activeBlock), `gate=${gate.block}; plan=${registry.plan && registry.plan.activeBlock}`);
check('WORKFLOW_EXISTS', exists(gate.workflow), gate.workflow);
check('PREFLIGHT_MATCH', gate.preflight === 'tools/orbit360-validar-gate-contracts-v20260717.mjs', gate.preflight || 'missing');
check('PREFLIGHT_EVIDENCE_MATCH', gate.preflightEvidence === EVIDENCE_REL, gate.preflightEvidence || 'missing');
check('RUNTIME_VERSION_FORMAT', /^\d{8}-\d+$/.test(String(gate.runtimeVersion || '')), gate.runtimeVersion || 'missing');

for (const rel of gate.requiredFiles || []) check(`REQUIRED_FILE:${rel}`, exists(rel), rel);
for (const rel of gate.validators || []) check(`VALIDATOR_EXISTS:${rel}`, exists(rel), rel);

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

const fallbackRuntimeGraph = [
  ...(gate.requiredFiles || []),
  'orbit360-platform/index.html',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-auth-guard.js'
];
const runtimeGraphFiles = unique((gate.runtimeGraphFiles && gate.runtimeGraphFiles.length) ? gate.runtimeGraphFiles : fallbackRuntimeGraph);

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

const runtimeVersionContracts = Array.isArray(gate.runtimeVersionContracts) ? gate.runtimeVersionContracts : [];
check('RUNTIME_VERSION_CONTRACTS_DECLARED', runtimeVersionContracts.length >= 5, `contracts=${runtimeVersionContracts.length}`);
for (const contract of runtimeVersionContracts) {
  const rel = String(contract && contract.path || '');
  const tokens = unique(contract && contract.requiredTokens || []);
  const present = Boolean(rel && exists(rel));
  check(`RUNTIME_VERSION_FILE_EXISTS:${rel || 'missing'}`, present, rel || 'missing');
  check(`RUNTIME_VERSION_TOKENS_DECLARED:${rel || 'missing'}`, tokens.length > 0, `tokens=${tokens.length}`);
  if (!present) continue;
  const source = executableText(read(rel), rel);
  for (const token of tokens) {
    check(`RUNTIME_VERSION_TOKEN:${rel}:${token}`, source.includes(token), `${rel} → ${token}`);
  }
}

const currentBranch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '';
if (currentBranch) check('RUNTIME_BRANCH', currentBranch === gate.environment.branch, `actual=${currentBranch}; expected=${gate.environment.branch}`);

const protectedPaths = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/auth.js',
  'orbit360-platform/core/importa.js',
  'firestore.rules'
];
for (const rel of protectedPaths) check(`PROTECTED_PATH_PRESENT:${rel}`, exists(rel), rel);

const failed = checks.filter(item => !item.ok);
const metadata = { overlayPath: selected.rel, registryExtensions: loadedExtensions };
if (failed.length) resultAndExit('VALIDATOR_STALE', checks, 41, gate, overlay, metadata);
resultAndExit('GO_GATE_CONTRACT', checks, 0, gate, overlay, metadata);
