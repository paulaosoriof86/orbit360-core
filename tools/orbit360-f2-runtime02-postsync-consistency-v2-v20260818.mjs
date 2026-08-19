#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const live=JSON.parse(fs.readFileSync(LIVE,'utf8').replace(/^\uFEFF/,''));
live.updatedAt=new Date().toISOString();
live.frozenPlan.currentPhaseSubphases.F2_runtime_browser_readonly_acceptance='PENDING_FRESH_EXPLICIT_AUTHORIZATION_REQUEST03';
live.documentationControl.transactionStatus='F2_RUNTIME02_ROOT_CAUSE_CLOSED_POSTSYNC_CONSISTENCY_V2_SOURCE_PROOF_PENDING';
fs.writeFileSync(LIVE,JSON.stringify(live,null,2)+'\n','utf8');
const index=JSON.parse(fs.readFileSync(INDEX,'utf8').replace(/^\uFEFF/,''));
index.updatedAt=new Date().toISOString();
index.operationalCurrent.currentPhaseInternalMethod='F2_two_same_gate_validator_stale_attempts_consumed_stable_boundary_rootfix_and_postsync_consistency_v2';
fs.writeFileSync(INDEX,JSON.stringify(index,null,2)+'\n','utf8');
console.log(JSON.stringify({ok:true,status:'F2_POSTSYNC_CONSISTENCY_V2_APPLIED',nextRequestOrdinal:3,runtimeCreated:false},null,2));
