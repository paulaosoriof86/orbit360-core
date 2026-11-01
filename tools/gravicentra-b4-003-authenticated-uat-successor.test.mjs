import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {authenticatedUatGuardSpec as k,checkAuthenticatedUatReadModel}
  from './gravicentra-b4-003-authenticated-uat-successor.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const before=JSON.parse(execFileSync('git',['show',k.base+':'+k.control],{encoding:'utf8'}));
const current=read(k.control),receipt=read(k.receipt),pointer=current[k.key];
const clone=value=>structuredClone(value);
const outcome=checkAuthenticatedUatReadModel(before,current,receipt,pointer);
assert.deepEqual(outcome,{governance:'PASS',uat:'3/3',automated:'5/5',formalI6Percent:50,
  p0Closed:'1/6',productionAuthorized:false,advisorRecordsChanged:0});
let checks=1;
function rejects(modify,code){
  const a=clone(before),b=clone(current),c=clone(receipt);
  modify(a,b,c);
  assert.throws(()=>checkAuthenticatedUatReadModel(a,b,c,b[k.key]),new RegExp(code));
  checks++;
}
rejects((a,b)=>{b.currentB4.status='B4_003_CLOSED';},'HISTORICAL_CONTROL_MUTATED');
rejects((a,b)=>{b[k.key].productionAuthorized=true;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].formalI6Percent=100;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].priorityP0Closed=6;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].advisorRecordsClassified=7;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].independentAdvisorUidUatPass=true;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].restoreDrillAccepted=true;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b,c)=>{c.releaseBoundary.productionAuthorized=true;},'RELEASE_HOLD_REMOVED');
rejects((a,b,c)=>{c.releaseBoundary.securityRulesP0Closed=true;},'RELEASE_HOLD_REMOVED');
rejects((a,b,c)=>{c.releaseBoundary.advisorClassificationsChanged=3;},'RELEASE_HOLD_REMOVED');
rejects((a,b,c)=>{c.isolatedPreview.runConclusion='failure';},'RECEIPT_EVIDENCE_INVALID');
rejects((a,b,c)=>{c.authenticatedUat.independentCarlosSamuelUidProof=true;},'RECEIPT_EVIDENCE_INVALID');
rejects((a,b,c)=>{c.sourceBlobs['orbit360-platform/modules/inicio.js']='0000000000000000000000000000000000000000';},'RECEIPT_EVIDENCE_INVALID');
rejects((a,b)=>{b.unauthorizedGate={release:'PASS'};},'CONTROL_KEY_CARDINALITY');
console.log('B4_003_AUTHENTICATED_UAT_NEGATIVE_QA_PASS checks='+checks+' protected_old_controls=true live_release=false');
