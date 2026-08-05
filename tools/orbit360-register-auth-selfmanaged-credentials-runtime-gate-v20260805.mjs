#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FILE = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
let source = fs.readFileSync(FILE, 'utf8');

if (!source.includes('"block-auth-selfmanaged-credentials-runtime-v20260805"')) {
  const anchor = '  "block-auth-foundation-roster-resolution-and-runtime-v20260805":{contractVersion:"13.8.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-foundation-roster-resolution-and-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-foundation-roster-resolution-and-runtime-v20260805.mjs"}\n});';
  const replacement = '  "block-auth-foundation-roster-resolution-and-runtime-v20260805":{contractVersion:"13.8.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-foundation-roster-resolution-and-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-foundation-roster-resolution-and-runtime-v20260805.mjs"},\n  "block-auth-selfmanaged-credentials-runtime-v20260805":{contractVersion:"13.9.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-selfmanaged-credentials-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-selfmanaged-credentials-runtime-v20260805.mjs"}\n});';
  if (!source.includes(anchor)) throw new Error('VALIDATOR_STALE:AUTH_SELFMANAGED_GATE_ANCHOR_NOT_FOUND');
  source = source.replace(anchor, replacement);
}

if (!source.includes('"AUTH_SELFMANAGED_CREDENTIALS_RUNTIME"')) {
  const anchor = '  "AUTH_FOUNDATION_DYNAMIC_TEAM_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});';
  const replacement = '  "AUTH_FOUNDATION_DYNAMIC_TEAM_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},\n  "AUTH_SELFMANAGED_CREDENTIALS_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});';
  if (!source.includes(anchor)) throw new Error('VALIDATOR_STALE:AUTH_SELFMANAGED_PHASE_ANCHOR_NOT_FOUND');
  source = source.replace(anchor, replacement);
}

fs.writeFileSync(FILE, source, 'utf8');
console.log(JSON.stringify({ok:true,gateId:'block-auth-selfmanaged-credentials-runtime-v20260805',phase:'AUTH_SELFMANAGED_CREDENTIALS_RUNTIME',contractVersion:'13.9.0'}));
