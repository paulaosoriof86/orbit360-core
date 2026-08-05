#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const file = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
let source = fs.readFileSync(file, 'utf8');
const gateId = 'block-auth-access-recovery-lab-v20260805';
const gateEntry = `  "${gateId}":{contractVersion:"13.0.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-access-recovery-lab-v20260805.mjs"}`;
const phaseEntry = '  "AUTH_ACCESS_RECOVERY_LAB":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}';

if (!source.includes(`"${gateId}"`)) {
  const gateAnchor = /(  "block12-runtime-hang-rescue-lab-v20260804":\{contractVersion:"12\.0\.4",lifecycle:"tools\/orbit360-validator-lifecycle-contract-block12-runtime-hang-rescue-lab-v20260804\.json",engine:"tools\/orbit360-validar-gate-contracts-engine-block12-runtime-hang-rescue-lab-v20260804\.mjs"\})\n\}\);/;
  if (!gateAnchor.test(source)) throw new Error('PIPELINE_MECHANISM_FAILURE:GATE_CONFIG_ANCHOR_NOT_FOUND');
  source = source.replace(gateAnchor, `$1,\n${gateEntry}\n});`);
}

if (!source.includes('"AUTH_ACCESS_RECOVERY_LAB"')) {
  const phaseAnchor = /(  "RUNTIME_HANG_RESCUE_LAB_EXECUTION":\{secrets:true,firestoreRead:true,writes:true,runtime:false,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false\})\n\}\);/;
  if (!phaseAnchor.test(source)) throw new Error('PIPELINE_MECHANISM_FAILURE:PHASE_PROFILE_ANCHOR_NOT_FOUND');
  source = source.replace(phaseAnchor, `$1,\n${phaseEntry}\n});`);
}

fs.writeFileSync(file, source, 'utf8');
const verified = fs.readFileSync(file, 'utf8');
if (!verified.includes(`"${gateId}"`) || !verified.includes('"AUTH_ACCESS_RECOVERY_LAB"')) {
  throw new Error('PIPELINE_MECHANISM_FAILURE:GATE_REGISTRATION_NOT_PERSISTED');
}
console.log(JSON.stringify({ ok: true, gateId, phase: 'AUTH_ACCESS_RECOVERY_LAB' }));
