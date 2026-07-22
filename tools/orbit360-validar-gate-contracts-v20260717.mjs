#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || 'block1-client360-insurers-lab-v20260717';
const BASE_OVERLAY = 'tools/orbit360-gate-contract-overlay-v20260718.json';
const LIFECYCLE_CONTRACT = 'tools/orbit360-validator-lifecycle-contract-v20260722.json';
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-v20260717.mjs';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const CANONICAL_LIFECYCLE_COMPOSITION = 'phase-aware-static-authorization-v2';

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
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
function mergeContracts(baseContracts, patchContracts) {
  const map = new Map((baseContracts || []).map(item => [item.path, {
    ...item,
    requiredTokens: unique(item.requiredTokens || [])
  }]));
  for (const patch of patchContracts || []) {
    const current = map.get(patch.path);
    if (!current) {
      map.set(patch.path, { ...patch, requiredTokens: unique(patch.requiredTokens || []) });
      continue;
    }
    const requiredTokens = patch.replaceRequiredTokens === true
      ? unique(patch.requiredTokens || [])
      : unique([...(current.requiredTokens || []), ...(patch.requiredTokens || [])]);
    map.set(patch.path, { ...current, ...patch, requiredTokens });
  }
  return [...map.values()];
}
function compose(base, lifecycle) {
  const patch = lifecycle && lifecycle.canonicalOverlayPatch;
  if (!patch || patch.schemaVersion !== 'orbit360-gate-contract-overlay-v1') throw new Error('CANONICAL_OVERLAY_PATCH_MISSING');
  if (base.gateId !== GATE_ID || patch.gateId !== GATE_ID || lifecycle.gateId !== GATE_ID) throw new Error('CANONICAL_GATE_MISMATCH');
  if (lifecycle.validatorLifecycleRevision !== CANONICAL_LIFECYCLE_COMPOSITION) throw new Error('CANONICAL_LIFECYCLE_REVISION_MISMATCH');
  const owners = new Map((base.canonicalOwners || []).map(item => [item.id, item]));
  for (const owner of patch.canonicalOwners || []) owners.set(owner.id, owner);
  const merged = mergeObjects(base, patch);
  return {
    ...merged,
    schemaVersion: 'orbit360-gate-contract-overlay-v1',
    gateId: GATE_ID,
    canonicalOwners: [...owners.values()],
    requiredFiles: unique([...(base.requiredFiles || []), ...(patch.requiredFiles || [])]),
    runtimeGraphFiles: unique([...(base.runtimeGraphFiles || []), ...(patch.runtimeGraphFiles || [])]),
    runtimeVersionContracts: mergeContracts(base.runtimeVersionContracts || [], patch.runtimeVersionContracts || [])
  };
}
function link(source, target) {
  const stat = fs.lstatSync(source);
  fs.symlinkSync(source, target, stat.isDirectory() ? 'dir' : 'file');
}
function createMirror(tempRoot, composedOverlay) {
  for (const name of fs.readdirSync(ROOT)) {
    const source = path.join(ROOT, name);
    const target = path.join(tempRoot, name);
    if (name !== 'tools') {
      link(source, target);
      continue;
    }
    fs.mkdirSync(target, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      const childSource = path.join(source, child);
      const childTarget = path.join(target, child);
      if (child === path.basename(BASE_OVERLAY)) {
        fs.writeFileSync(childTarget, `${JSON.stringify(composedOverlay, null, 2)}\n`, 'utf8');
      } else {
        link(childSource, childTarget);
      }
    }
  }
}
function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

let output;
let exitCode = 41;
let tempRoot = '';
try {
  const base = readJson(BASE_OVERLAY);
  const lifecycle = readJson(LIFECYCLE_CONTRACT);
  const composed = compose(base, lifecycle);
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-preflight-canonical-'));
  createMirror(tempRoot, composed);
  const run = spawnSync(process.execPath, [ENGINE, GATE_ID], {
    cwd: tempRoot,
    env: { ...process.env, ORBIT360_BRANCH: 'ays/backend-tenant-lab-v99-20260703' },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  exitCode = Number.isInteger(run.status) ? run.status : 41;
  if (run.error) throw run.error;
  const stdout = String(run.stdout || '').trim();
  const parsed = stdout ? JSON.parse(stdout) : {
    status: 'VALIDATOR_STALE',
    failed: 1,
    failedCheckIds: ['CANONICAL_ENGINE_NO_OUTPUT']
  };
  output = {
    ...parsed,
    canonicalEntrypoint: 'tools/orbit360-validar-gate-contracts-v20260717.mjs',
    canonicalEngine: ENGINE,
    canonicalLifecycleContract: LIFECYCLE_CONTRACT,
    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,
    parallelWrapperRetired: true,
    parallelOverlayRetired: true,
    operationalWrites: 0,
    evidenceWrites: 1,
    secretsRead: false,
    firestoreRead: false,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    containsPII: false,
    containsSecrets: false
  };
  if (run.stderr) output.stderrSanitized = String(run.stderr).trim().slice(0, 2000);
} catch (error) {
  output = {
    schemaVersion: 'orbit360-gate-contract-preflight-v9-canonical-lifecycle',
    gateId: GATE_ID,
    contractVersion: '1.0.37',
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    failed: 1,
    failedCheckIds: ['CANONICAL_PREFLIGHT_ENTRYPOINT'],
    error: String(error && error.message || error),
    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,
    operationalWrites: 0,
    evidenceWrites: 1,
    secretsRead: false,
    firestoreRead: false,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    containsPII: false,
    containsSecrets: false
  };
  exitCode = 41;
} finally {
  if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
}
writeEvidence(output);
console.log(JSON.stringify(output, null, 2));
process.exit(exitCode);
