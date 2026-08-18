#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
const file='tools/orbit360-validar-gate-contracts-v20260717.mjs';let s=fs.readFileSync(file,'utf8');
const gateId='block-auth-paula-membership-readonly-reconcile-v2-lab-v20260817',marker=`['${gateId}']`;
const entry=`  ['${gateId}']: {\n    contractVersion: '14.3.0',\n    lifecycle: 'tools/orbit360-validator-lifecycle-contract-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json',\n    engine: 'tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.mjs',\n    defaultRequest: '.github/orbit360-requests/auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json',\n    sourcePhase: ''\n  },\n`;
if(!s.includes(marker)){const anchor='  [VISUAL_LEGACY_GATE_ID]: {';if(!s.includes(anchor))throw new Error('PIPELINE_MECHANISM_FAILURE:GATE_CONFIG_ANCHOR_NOT_FOUND');s=s.replace(anchor,entry+anchor);}
const readonlyPhase='AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILIATION_V2_LAB:';
const readonlyEntry='  AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILIATION_V2_LAB: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n';
if(!s.includes(readonlyPhase)){const anchor='  VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION:';const i=s.indexOf(anchor);if(i<0)throw new Error('PIPELINE_MECHANISM_FAILURE:PHASE_PROFILE_ANCHOR_NOT_FOUND');s=s.slice(0,i)+readonlyEntry+s.slice(i);}
const repairPhase='AUTH_PAULA_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_LAB:';
const repairEntry='  AUTH_PAULA_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_LAB: {secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n';
if(!s.includes(repairPhase)){const anchor='  VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION:';const i=s.indexOf(anchor);if(i<0)throw new Error('PIPELINE_MECHANISM_FAILURE:REPAIR_PHASE_PROFILE_ANCHOR_NOT_FOUND');s=s.slice(0,i)+repairEntry+s.slice(i);}
fs.writeFileSync(file,s,'utf8');const v=fs.readFileSync(file,'utf8');if(!v.includes(marker)||!v.includes(readonlyPhase)||!v.includes(repairPhase))throw new Error('PIPELINE_MECHANISM_FAILURE:GATE14_3_PHASES_NOT_PERSISTED');console.log(JSON.stringify({ok:true,gateId,phases:['AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILIATION_V2_LAB','AUTH_PAULA_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_LAB']}));
