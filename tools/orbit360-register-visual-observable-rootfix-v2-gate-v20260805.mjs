#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const VALIDATOR_REL = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const OUT_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-gate-registration-sanitized-v20260805.json';
const GATE_ID = 'block2.7-visual-observable-rootfix-v2-lab-v20260805';
const CONFIG_LINE = '  "block2.7-visual-observable-rootfix-v2-lab-v20260805":{contractVersion:"2.7.5",lifecycle:"tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-visual-observable-rootfix-v2-lab-v20260805.mjs"},\n';
const CONFIG_ANCHOR = '  "block2.7-visual-observable-rootfix-lab-v20260805":{contractVersion:"2.7.3",lifecycle:"tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-visual-observable-rootfix-lab-v20260805.mjs"},\n';
const PROFILE_LINE = '  "VISUAL_OBSERVABLE_ROOTFIX_V2_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false},\n';
const PROFILE_ANCHOR = '  "VISUAL_OBSERVABLE_ROOTFIX_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false},\n';

const count = (value, token) => value.split(token).length - 1;
const syntaxOk = rel => spawnSync(process.execPath, ['--check', path.join(ROOT, rel)], { encoding: 'utf8' }).status === 0;
const write = payload => {
  const target = path.join(ROOT, OUT_REL);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
};

try {
  const target = path.join(ROOT, VALIDATOR_REL);
  let source = fs.readFileSync(target, 'utf8');
  if (count(source, GATE_ID) !== 0) throw new Error('VALIDATOR_STALE_GATE_ALREADY_PRESENT');
  if (count(source, CONFIG_ANCHOR) !== 1) throw new Error('VALIDATOR_STALE_CONFIG_ANCHOR');
  if (count(source, PROFILE_ANCHOR) !== 1) throw new Error('VALIDATOR_STALE_PROFILE_ANCHOR');
  source = source.replace(CONFIG_ANCHOR, CONFIG_LINE + CONFIG_ANCHOR);
  source = source.replace(PROFILE_ANCHOR, PROFILE_LINE + PROFILE_ANCHOR);
  fs.writeFileSync(target, source, 'utf8');
  const checks = {
    gateRegisteredOnce: count(source, GATE_ID) === 1,
    phaseRegisteredOnce: count(source, 'VISUAL_OBSERVABLE_ROOTFIX_V2_LAB_EXECUTION') === 1,
    contractVersion: source.includes('contractVersion:"2.7.5"'),
    lifecycleReference: source.includes('orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json'),
    engineReference: source.includes('orbit360-validar-gate-contracts-engine-visual-observable-rootfix-v2-lab-v20260805.mjs'),
    exactCapabilities: source.includes(PROFILE_LINE.trim()),
    validatorSyntax: syntaxOk(VALIDATOR_REL),
    engineSyntax: syntaxOk('tools/orbit360-validar-gate-contracts-engine-visual-observable-rootfix-v2-lab-v20260805.mjs')
  };
  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const output = {
    schemaVersion: 'orbit360-visual-observable-rootfix-v2-gate-registration-v1',
    gateId: GATE_ID,
    contractVersion: '2.7.5',
    status: failedCheckIds.length ? 'FAIL_GATE_REGISTRATION' : 'PASS_GATE_REGISTRATION',
    classification: failedCheckIds.length ? 'VALIDATOR_STALE' : 'VALIDATOR_STALE_CLOSED',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: failedCheckIds.length === 0
  };
  write(output);
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.ok ? 0 : 41);
} catch (error) {
  const output = {
    schemaVersion: 'orbit360-visual-observable-rootfix-v2-gate-registration-v1',
    gateId: GATE_ID,
    contractVersion: '2.7.5',
    status: 'FAIL_GATE_REGISTRATION',
    classification: 'VALIDATOR_STALE',
    error: String(error && error.message || error).slice(0, 700),
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: false
  };
  write(output);
  console.error(JSON.stringify(output, null, 2));
  process.exit(41);
}
