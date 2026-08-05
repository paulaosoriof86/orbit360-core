#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FILE = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
let source = fs.readFileSync(FILE, 'utf8');

if (!source.includes('"block-auth-foundation-all-team-runtime-v20260805"')) {
  const anchor = '  "block-auth-foundation-all-team-source-only-v20260805":{contractVersion:"13.6.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-source-only-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-foundation-all-team-source-only-v20260805.mjs"}\n});';
  const replacement = '  "block-auth-foundation-all-team-source-only-v20260805":{contractVersion:"13.6.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-source-only-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-foundation-all-team-source-only-v20260805.mjs"},\n  "block-auth-foundation-all-team-runtime-v20260805":{contractVersion:"13.7.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-runtime-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-auth-foundation-all-team-runtime-v20260805.mjs"}\n});';
  if (!source.includes(anchor)) throw new Error('VALIDATOR_STALE:AUTH_FOUNDATION_RUNTIME_GATE_ANCHOR_NOT_FOUND');
  source = source.replace(anchor, replacement);
}

if (!source.includes('"AUTH_FOUNDATION_ALL_TEAM_RUNTIME"')) {
  const anchor = '  "AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY":ZERO\n});';
  const replacement = '  "AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY":ZERO,\n  "AUTH_FOUNDATION_ALL_TEAM_RUNTIME":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}\n});';
  if (!source.includes(anchor)) throw new Error('VALIDATOR_STALE:AUTH_FOUNDATION_RUNTIME_PHASE_ANCHOR_NOT_FOUND');
  source = source.replace(anchor, replacement);
}

fs.writeFileSync(FILE, source, 'utf8');
console.log(JSON.stringify({ ok:true, gateId:'block-auth-foundation-all-team-runtime-v20260805', phase:'AUTH_FOUNDATION_ALL_TEAM_RUNTIME', contractVersion:'13.7.0' }));
