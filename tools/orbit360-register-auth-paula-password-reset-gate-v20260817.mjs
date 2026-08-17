#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const file = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
let source = fs.readFileSync(file, 'utf8');
const gateId = 'block-auth-paula-password-reset-lab-v20260817';
const gateMarker = `['${gateId}']`;
const gateEntry = `  ['${gateId}']: {
    contractVersion: '14.0.0',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-auth-paula-password-reset-lab-v20260817.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-auth-paula-password-reset-lab-v20260817.mjs',
    defaultRequest: '.github/orbit360-requests/auth-paula-password-reset-lab-v20260817.json',
    sourcePhase: ''
  },
`;
const phaseMarker = 'AUTH_PAULA_PASSWORD_RESET_LAB:';
const phaseEntry = '  AUTH_PAULA_PASSWORD_RESET_LAB: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n';

if (!source.includes(gateMarker)) {
  const anchor = '  [VISUAL_LEGACY_GATE_ID]: {';
  if (!source.includes(anchor)) throw new Error('PIPELINE_MECHANISM_FAILURE:GATE_CONFIG_ANCHOR_NOT_FOUND');
  source = source.replace(anchor, gateEntry + anchor);
}
if (!source.includes(phaseMarker)) {
  const anchor = '  VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION:';
  const index = source.indexOf(anchor);
  if (index < 0) throw new Error('PIPELINE_MECHANISM_FAILURE:PHASE_PROFILE_ANCHOR_NOT_FOUND');
  source = source.slice(0,index) + phaseEntry + source.slice(index);
}
fs.writeFileSync(file, source, 'utf8');
const verified = fs.readFileSync(file, 'utf8');
if (!verified.includes(gateMarker) || !verified.includes(phaseMarker)) {
  throw new Error('PIPELINE_MECHANISM_FAILURE:AUTH_RESET_GATE_REGISTRATION_NOT_PERSISTED');
}
console.log(JSON.stringify({ok:true,gateId,phase:'AUTH_PAULA_PASSWORD_RESET_LAB'}));
