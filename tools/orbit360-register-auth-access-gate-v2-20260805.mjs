#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FILE = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
let source = fs.readFileSync(FILE, 'utf8');
const gateId = 'block-auth-access-recovery-lab-v2-20260805';
const phase = 'AUTH_ACCESS_RECOVERY_LAB_V2';

if (!source.includes(`"${gateId}"`)) {
  const oldGate = '  "block-auth-access-recovery-lab-v20260805":{contractVersion:"13.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v20260805.mjs"}\n});';
  const newGate = '  "block-auth-access-recovery-lab-v20260805":{contractVersion:"13.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v20260805.mjs"},\n  "block-auth-access-recovery-lab-v2-20260805":{contractVersion:"13.1.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v2-20260805.mjs"}\n});';
  if (!source.includes(oldGate)) throw new Error('VALIDATOR_STALE:GATE_INSERTION_ANCHOR_NOT_FOUND');
  source = source.replace(oldGate, newGate);
}

if (!source.includes(`"${phase}"`)) {
  const oldPhase = '  "AUTH_ACCESS_RECOVERY_LAB":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});';
  const newPhase = '  "AUTH_ACCESS_RECOVERY_LAB":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},\n  "AUTH_ACCESS_RECOVERY_LAB_V2":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});';
  if (!source.includes(oldPhase)) throw new Error('VALIDATOR_STALE:PHASE_INSERTION_ANCHOR_NOT_FOUND');
  source = source.replace(oldPhase, newPhase);
}

fs.writeFileSync(FILE, source, 'utf8');
console.log(JSON.stringify({ ok: true, gateId, phase }));
