import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {checkGoalParticipationReadModel,goalParticipationGuardSpec as k} from './gravicentra-b4-003-goal-participation-successor.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const before=JSON.parse(execFileSync('git',['show',k.base+':'+k.control],{encoding:'utf8'}));
const current=read(k.control),receipt=read(k.receipt),source=read(k.source);
const pointer=current[k.key];
const cloned=v=>JSON.parse(JSON.stringify(v));
const result=checkGoalParticipationReadModel(before,current,receipt,source,pointer);
assert.equal(result.formalI6Percent,50);
assert.equal(result.priorityP0Closed,1);
assert.equal(result.advisorRecordsChanged,0);
assert.equal(result.productionAuthorized,false);
assert.equal(result.previewDeployed,false);
let checked=5;
function rejects(a,b,c,d,code){
  assert.throws(()=>checkGoalParticipationReadModel(a,b,c,d,b[k.key]),new RegExp(code));
  checked++;
}
const mutated=cloned(current);mutated.currentB4.status='B4_003_CLOSED';
rejects(before,mutated,receipt,source,'HISTORICAL_CONTROL_MUTATED');
const promoted=cloned(current);promoted[k.key].productionAuthorized=true;
rejects(before,promoted,receipt,source,'POINTER_SCOPE_INVALID');
const changed=cloned(current);changed[k.key].advisorRecordsClassified=7;
rejects(before,changed,receipt,source,'POINTER_SCOPE_INVALID');
const invalidSource=cloned(source);invalidSource.boundaries.dataWrites=7;
rejects(before,current,receipt,invalidSource,'SOURCE_CLAIMS_OR_BOUNDARIES');
const invalidReceipt=cloned(receipt);invalidReceipt.noPreviewDeployment=false;
rejects(before,current,invalidReceipt,source,'RECEIPT_INVALID');
const extraKey=cloned(current);extraKey.unauthorizedGate={status:'PASS'};
rejects(before,extraKey,receipt,source,'CONTROL_KEY_COUNTS');
console.log('B4_003_GOAL_PARTICIPATION_GOVERNANCE_NEGATIVE_QA_PASS checks='+checked+' no_writes');
