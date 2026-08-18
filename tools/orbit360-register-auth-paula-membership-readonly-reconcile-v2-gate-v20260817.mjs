#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const file='tools/orbit360-validar-gate-contracts-v20260717.mjs';let s=fs.readFileSync(file,'utf8');
const gateId='block-auth-paula-membership-readonly-reconcile-v2-lab-v20260817',marker=`['${gateId}']`;
const oldEngine='tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.mjs';
const engine='tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-lab-v20260818.mjs';
execFileSync(process.execPath,['--check',engine],{stdio:'inherit'});
const entry=`  ['${gateId}']: {\n    contractVersion: '14.3.0',\n    lifecycle: 'tools/orbit360-validator-lifecycle-contract-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json',\n    engine: '${engine}',\n    defaultRequest: '.github/orbit360-requests/auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json',\n    sourcePhase: ''\n  },\n`;
if(!s.includes(marker)){
  const anchor='  [VISUAL_LEGACY_GATE_ID]: {';
  if(!s.includes(anchor))throw new Error('PIPELINE_MECHANISM_FAILURE:GATE_CONFIG_ANCHOR_NOT_FOUND');
  s=s.replace(anchor,entry+anchor);
}else if(!s.includes(`engine: '${engine}'`)){
  const old=`engine: '${oldEngine}'`;
  if(!s.includes(old))throw new Error('PIPELINE_MECHANISM_FAILURE:GATE14_3_ENGINE_OWNER_NOT_REPLACEABLE');
  s=s.replace(old,`engine: '${engine}'`);
}
const phases=[
 ['AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILIATION_V2_LAB:','  AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILIATION_V2_LAB: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n'],
 ['AUTH_PAULA_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_LAB:','  AUTH_PAULA_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_LAB: {secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n'],
 ['AUTH_PAULA_REAL_BROWSER_READONLY_SMOKE_LAB:','  AUTH_PAULA_REAL_BROWSER_READONLY_SMOKE_LAB: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n']
];
for(const [phase,phaseEntry] of phases){if(!s.includes(phase)){const anchor='  VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION:';const i=s.indexOf(anchor);if(i<0)throw new Error('PIPELINE_MECHANISM_FAILURE:PHASE_PROFILE_ANCHOR_NOT_FOUND');s=s.slice(0,i)+phaseEntry+s.slice(i);}}
fs.writeFileSync(file,s,'utf8');
const v=fs.readFileSync(file,'utf8');
if(!v.includes(marker)||!v.includes(`engine: '${engine}'`)||phases.some(([p])=>!v.includes(p)))throw new Error('PIPELINE_MECHANISM_FAILURE:GATE14_3_PARITY_OWNER_NOT_PERSISTED');
console.log(JSON.stringify({ok:true,gateId,engine,rootfixArtifactParityRequired:true,phases:phases.map(([p])=>p.replace(/:$/,''))}));
