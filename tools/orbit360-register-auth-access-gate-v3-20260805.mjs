#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
const FILE='tools/orbit360-validar-gate-contracts-v20260717.mjs';
let source=fs.readFileSync(FILE,'utf8');
if(!source.includes('"block-auth-access-recovery-lab-v3-20260805"')){
  const anchor='  "block-auth-access-recovery-lab-v2-20260805":{contractVersion:"13.1.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v2-20260805.mjs"}\n});';
  const replacement='  "block-auth-access-recovery-lab-v2-20260805":{contractVersion:"13.1.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v2-20260805.mjs"},\n  "block-auth-access-recovery-lab-v3-20260805":{contractVersion:"13.2.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v3-20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v3-20260805.mjs"}\n});';
  if(!source.includes(anchor))throw new Error('VALIDATOR_STALE:GATE_V3_INSERTION_ANCHOR_NOT_FOUND');
  source=source.replace(anchor,replacement);
}
if(!source.includes('"AUTH_ACCESS_RECOVERY_LAB_V3"')){
  const anchor='  "AUTH_ACCESS_RECOVERY_LAB_V2":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});';
  const replacement='  "AUTH_ACCESS_RECOVERY_LAB_V2":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},\n  "AUTH_ACCESS_RECOVERY_LAB_V3":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});';
  if(!source.includes(anchor))throw new Error('VALIDATOR_STALE:PHASE_V3_INSERTION_ANCHOR_NOT_FOUND');
  source=source.replace(anchor,replacement);
}
fs.writeFileSync(FILE,source,'utf8');
console.log(JSON.stringify({ok:true,gateId:'block-auth-access-recovery-lab-v3-20260805',phase:'AUTH_ACCESS_RECOVERY_LAB_V3'}));
