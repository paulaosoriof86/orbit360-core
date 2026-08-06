#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ENTRY_REL = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const OUT_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-rootfix-validator-repair-sanitized-v20260805.json';
const GATE_ID = 'block2.7-visual-runtime-rootfix-lab-v20260805';
const GATE_LINE = '  "block2.7-visual-runtime-rootfix-lab-v20260805":{contractVersion:"2.7.2",lifecycle:"tools/orbit360-validator-lifecycle-contract-visual-runtime-rootfix-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-visual-runtime-rootfix-lab-v20260805.mjs"}';
const PHASE_LINE = '  "VISUAL_RUNTIME_ROOTFIX_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false}';

const entryPath = path.join(ROOT, ENTRY_REL);
const outPath = path.join(ROOT, OUT_REL);
const original = fs.readFileSync(entryPath, 'utf8');
let source = original;
const count = (haystack, needle) => haystack.split(needle).length - 1;
const fail = message => { throw new Error(message); };

try {
  const gateAnchor = '  "block-auth-selfmanaged-credentials-runtime-v20260805":{contractVersion:"13.9.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-selfmanaged-credentials-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-selfmanaged-credentials-runtime-v20260805.mjs"}\n});\nconst PHASE_PROFILES';
  const gateReplacement = '  "block-auth-selfmanaged-credentials-runtime-v20260805":{contractVersion:"13.9.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-selfmanaged-credentials-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-selfmanaged-credentials-runtime-v20260805.mjs"},\n' + GATE_LINE + '\n});\nconst PHASE_PROFILES';
  if (count(source, GATE_ID) === 0) {
    if (count(source, gateAnchor) !== 1) fail('VALIDATOR_STALE_GATE_ANCHOR_MISMATCH');
    source = source.replace(gateAnchor, gateReplacement);
  }

  const phaseAnchor = '  "AUTH_SELFMANAGED_CREDENTIALS_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});\nfunction readJson';
  const phaseReplacement = '  "AUTH_SELFMANAGED_CREDENTIALS_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},\n' + PHASE_LINE + '\n});\nfunction readJson';
  if (count(source, 'VISUAL_RUNTIME_ROOTFIX_LAB_EXECUTION') === 0) {
    if (count(source, phaseAnchor) !== 1) fail('VALIDATOR_STALE_PHASE_ANCHOR_MISMATCH');
    source = source.replace(phaseAnchor, phaseReplacement);
  }

  if (count(source, GATE_ID) !== 1) fail('VALIDATOR_STALE_GATE_DUPLICATE_OR_MISSING');
  if (count(source, 'VISUAL_RUNTIME_ROOTFIX_LAB_EXECUTION') !== 1) fail('VALIDATOR_STALE_PHASE_DUPLICATE_OR_MISSING');
  if (!source.includes('functionsDeploy:false,rulesDeploy:false,production:false')) fail('VALIDATOR_STALE_CAPABILITY_BOUNDARY');

  fs.writeFileSync(entryPath, source, 'utf8');
  const check = spawnSync(process.execPath, ['--check', ENTRY_REL], { cwd: ROOT, encoding: 'utf8' });
  if (check.status !== 0) fail('VALIDATOR_STALE_SYNTAX:' + String(check.stderr || '').slice(0, 300));

  const output = {
    schemaVersion: 'orbit360-visual-rootfix-validator-repair-v1',
    status: 'PASS_VISUAL_ROOTFIX_VALIDATOR_REPAIR',
    classification: 'VALIDATOR_STALE_CLOSED',
    gateId: GATE_ID,
    gateOccurrences: count(source, GATE_ID),
    phaseOccurrences: count(source, 'VISUAL_RUNTIME_ROOTFIX_LAB_EXECUTION'),
    changed: source !== original,
    syntaxOk: true,
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: true
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  const output = {
    schemaVersion: 'orbit360-visual-rootfix-validator-repair-v1',
    status: 'FAIL_VISUAL_ROOTFIX_VALIDATOR_REPAIR',
    classification: 'VALIDATOR_STALE',
    gateId: GATE_ID,
    error: String(error && error.message || error).slice(0, 700),
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: false
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.error(JSON.stringify(output, null, 2));
  process.exit(41);
}
