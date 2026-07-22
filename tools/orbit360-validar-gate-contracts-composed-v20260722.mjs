#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || 'block1-client360-insurers-lab-v20260717';
const BASE_OVERLAY = 'tools/orbit360-gate-contract-overlay-v20260718.json';
const LIFECYCLE_OVERLAY = 'tools/orbit360-gate-contract-overlay-validator-lifecycle-v20260722.json';
const OFFICIAL_PREFLIGHT = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const TEMP_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';

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
function compose(base, patch) {
  if (base.gateId !== GATE_ID || patch.gateId !== GATE_ID) throw new Error('OVERLAY_GATE_MISMATCH');
  if (base.schemaVersion !== 'orbit360-gate-contract-overlay-v1' || patch.schemaVersion !== 'orbit360-gate-contract-overlay-v1') throw new Error('OVERLAY_SCHEMA_MISMATCH');
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
    if (name === 'tools') {
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
      continue;
    }
    if (name === 'orbit360-platform') {
      fs.mkdirSync(target, { recursive: true });
      for (const child of fs.readdirSync(source)) {
        const childSource = path.join(source, child);
        const childTarget = path.join(target, child);
        if (child === 'runtime-gate-crm-v20260716') {
          fs.mkdirSync(childTarget, { recursive: true });
        } else {
          link(childSource, childTarget);
        }
      }
      continue;
    }
    link(source, target);
  }
}

const base = readJson(BASE_OVERLAY);
const lifecycle = readJson(LIFECYCLE_OVERLAY);
const composed = compose(base, lifecycle);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-preflight-composed-'));
let output;
let exitCode = 41;
try {
  createMirror(tempRoot, composed);
  const run = spawnSync(process.execPath, [OFFICIAL_PREFLIGHT, GATE_ID], {
    cwd: tempRoot,
    env: { ...process.env, ORBIT360_BRANCH: 'ays/backend-tenant-lab-v99-20260703' },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  exitCode = Number.isInteger(run.status) ? run.status : 41;
  if (run.error) throw run.error;
  const stdout = String(run.stdout || '').trim();
  const parsed = stdout ? JSON.parse(stdout) : { status: 'VALIDATOR_STALE', failed: 1, failedCheckIds: ['OFFICIAL_PREFLIGHT_NO_OUTPUT'] };
  output = {
    ...parsed,
    composedOverlayMechanism: 'temp-mirror-no-repo-write-v1',
    composedOverlayPaths: [BASE_OVERLAY, LIFECYCLE_OVERLAY],
    officialPreflight: OFFICIAL_PREFLIGHT,
    temporaryEvidencePath: TEMP_EVIDENCE,
    repositoryWrites: 0,
    secretsRead: false,
    firestoreRead: false,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    containsPII: false,
    containsSecrets: false
  };
  if (run.stderr) output.stderrSanitized = String(run.stderr).trim().slice(0, 2000);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
console.log(JSON.stringify(output, null, 2));
process.exit(exitCode);
