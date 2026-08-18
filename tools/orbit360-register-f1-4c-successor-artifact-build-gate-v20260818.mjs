#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
const file='tools/orbit360-validar-gate-contracts-v20260717.mjs';
let s=fs.readFileSync(file,'utf8');
const gateId='f1-4c-successor-artifact-build-lab-v20260818';
const marker=`['${gateId}']`;
const entry=`  ['${gateId}']: {\n    contractVersion: '1.0.0',\n    lifecycle: 'tools/orbit360-validator-lifecycle-contract-f1-4c-successor-artifact-build-v20260818.json',\n    engine: 'tools/orbit360-validar-gate-contracts-engine-f1-4c-successor-artifact-build-v20260818.mjs',\n    defaultRequest: '.github/orbit360-requests/f1-4c-successor-artifact-build-v20260818.json',\n    sourcePhase: ''\n  },\n`;
if(!s.includes(marker)){const a='  [VISUAL_LEGACY_GATE_ID]: {';if(!s.includes(a))throw new Error('GATE_CONFIG_ANCHOR_NOT_FOUND');s=s.replace(a,entry+a);}
const phase='F1_4C_SUCCESSOR_ARTIFACT_BUILD:';
const phaseEntry='  F1_4C_SUCCESSOR_ARTIFACT_BUILD: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n';
if(!s.includes(phase)){const a='  VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION:';if(!s.includes(a))throw new Error('PHASE_ANCHOR_NOT_FOUND');s=s.replace(a,phaseEntry+a);}
fs.writeFileSync(file,s,'utf8');
const v=fs.readFileSync(file,'utf8');if(!v.includes(marker)||!v.includes(phase)||!v.includes('orbit360-validar-gate-contracts-engine-f1-4c-successor-artifact-build-v20260818.mjs'))throw new Error('F1_4C_GATE_REGISTRATION_FAILED');
console.log(JSON.stringify({ok:true,gateId,phase:'F1_4C_SUCCESSOR_ARTIFACT_BUILD',browser:false,runtime:false,deploy:false,writes:false,secrets:false}));
