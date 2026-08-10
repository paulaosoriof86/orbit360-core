#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const OUT=process.env.ORBIT360_V35_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v35-logging-view-grant-source-sanitized-v20260810.json';
const TARGET='projects/ays-orbit-360-lab/locations/global/buckets/_Default/views/_AllLogs';
const ROLE='roles/logging.privateLogViewer';
const SYNTHETIC_MEMBER='serviceAccount:synthetic-v35@example.invalid';

function write(payload){
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
}
function clone(v){return JSON.parse(JSON.stringify(v));}
function normalizeBindings(bindings){
  return clone(bindings||[]).map(b=>({role:b.role,members:[...(b.members||[])].sort(),...(b.condition?{condition:b.condition}:{})}))
    .sort((a,b)=>`${a.role}|${JSON.stringify(a.condition||{})}`.localeCompare(`${b.role}|${JSON.stringify(b.condition||{})}`));
}
function addTemporaryBinding(policy,member){
  const next=clone(policy);
  next.bindings=Array.isArray(next.bindings)?next.bindings:[];
  let binding=next.bindings.find(b=>b.role===ROLE&&!b.condition);
  if(!binding){binding={role:ROLE,members:[]};next.bindings.push(binding);}
  binding.members=Array.isArray(binding.members)?binding.members:[];
  if(!binding.members.includes(member))binding.members.push(member);
  return next;
}
function removeTemporaryBinding(policy,member){
  const next=clone(policy);
  next.bindings=(next.bindings||[]).map(b=>{
    if(b.role!==ROLE||b.condition)return b;
    return {...b,members:(b.members||[]).filter(m=>m!==member)};
  }).filter(b=>!(b.role===ROLE&&!b.condition&&(b.members||[]).length===0));
  return next;
}
function sameBindings(a,b){return JSON.stringify(normalizeBindings(a))===JSON.stringify(normalizeBindings(b));}

const baseline={
  version:3,
  etag:'fixture-etag-before',
  bindings:[
    {role:'roles/logging.viewer',members:['serviceAccount:existing-reader@example.invalid']},
    {role:'roles/logging.privateLogViewer',members:['group:existing-private-readers@example.invalid']}
  ]
};
const granted=addTemporaryBinding(baseline,SYNTHETIC_MEMBER);
const restored=removeTemporaryBinding(granted,SYNTHETIC_MEMBER);
const existingPrivate=baseline.bindings.find(b=>b.role===ROLE).members[0];
const existingPreserved=granted.bindings.some(b=>b.role===ROLE&&(b.members||[]).includes(existingPrivate));
const syntheticAddedExactlyOnce=granted.bindings.flatMap(b=>b.role===ROLE?(b.members||[]):[]).filter(m=>m===SYNTHETIC_MEMBER).length===1;
const restoredExactly=sameBindings(restored.bindings,baseline.bindings);

const payload={
  schemaVersion:'orbit360-v35-logging-view-temporary-grant-source-v1',
  status:'PASS_V35_SOURCE_PLAN',
  classification:'ENVIRONMENT_FAILURE_IAM_REMEDIATION_SOURCE_READY',
  ok:existingPreserved&&syntheticAddedExactlyOnce&&restoredExactly,
  targetResourceClass:'LAB_DEFAULT_BUCKET_ALLLOGS_VIEW',
  targetResource:TARGET,
  role:ROLE,
  scopeLevel:'LOG_VIEW',
  projectLevelGrant:false,
  customRoleCreation:false,
  principalSource:'FUTURE_RUNTIME_SECRET_ONLY',
  rawPrincipalPersisted:false,
  futureIamWritesMaximum:2,
  futureGrantWritesMaximum:1,
  futureRevokeWritesMaximum:1,
  futurePolicyReadBeforeGrant:true,
  futurePolicyReadAfterGrant:true,
  futurePolicyReadBeforeRevoke:true,
  futurePolicyReadAfterRevoke:true,
  futureEtagRequired:true,
  futureConcurrentPolicyDriftFailClosed:true,
  futureRestoreExactBaselineBindings:true,
  futureRevokeMandatoryOnPassOrStop:true,
  fixtureExistingBindingPreserved:existingPreserved,
  fixtureSyntheticBindingAddedExactlyOnce:syntheticAddedExactlyOnce,
  fixtureBaselineBindingsRestoredExactly:restoredExactly,
  networkAccess:false,
  secretAccess:false,
  iamPolicyRead:false,
  iamWrites:0,
  loggingReads:0,
  firestoreReads:0,
  authReads:0,
  operationalWrites:0,
  runtimeExecuted:false,
  browserExecuted:false,
  deployExecuted:false,
  productionTouched:false,
  freshExplicitAuthorizationRequired:true,
  iamGrantAuthorized:false,
  containsPII:false,
  containsSecrets:false
};
write(payload);
console.log(JSON.stringify(payload));
if(!payload.ok)process.exit(41);
