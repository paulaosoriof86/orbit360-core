import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {carlosHistorySuccessorSpec as k,checkCarlosHistorySuccessorReadModel}
  from './gravicentra-b4-003-carlos-history-hydration-successor.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const before=JSON.parse(execFileSync('git',['show',k.base+':'+k.control],{encoding:'utf8'}));
const current=read(k.control),receipt=read(k.receipt),pointer=current[k.key];
const clone=value=>structuredClone(value);
const outcome=checkCarlosHistorySuccessorReadModel(before,current,receipt,pointer);
assert.deepEqual(outcome,{governance:'PASS',bugReproduction:'0->1',preview:'hosting-only',
  formalI6Percent:50,p0Closed:'1/6',productionAuthorized:false,b4003Closed:false});
let checks=1;
function rejects(modify,code){
  const a=clone(before),b=clone(current),c=clone(receipt);
  modify(a,b,c);
  assert.throws(()=>checkCarlosHistorySuccessorReadModel(a,b,c,b[k.key]),new RegExp(code));
  checks++;
}
rejects((a,b)=>{b.currentB4.status='B4_003_CLOSED';},'HISTORICAL_CONTROL_MUTATED');
rejects((a,b)=>{b[k.key].productionAuthorized=true;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].formalI6Percent=100;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].priorityP0Closed=6;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].advisorRecordsClassified=7;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].carlosNewPreviewRerunVerified=true;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].restoreDrillAccepted=true;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b)=>{b[k.key].client360PolicyCrossCountryGapResolved=true;},'POINTER_SCOPE_OR_RELEASING');
rejects((a,b,c)=>{c.releaseBoundary.productionAuthorized=true;},'RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
rejects((a,b,c)=>{c.releaseBoundary.backendNegativeUidAccepted=true;},'RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
rejects((a,b,c)=>{c.releaseBoundary.advisorClassificationsChanged=3;},'RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
rejects((a,b,c)=>{c.preview.runConclusion='failure';},'RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
rejects((a,b,c)=>{c.carlosUat.newPreviewRerunVerified=true;},'RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
rejects((a,b,c)=>{c.sourceBlobs['orbit360-platform/modules/historial.js']='0000000000000000000000000000000000000000';},'RECEIPT_EVIDENCE_OR_RELEASE_HOLD_INVALID');
rejects((a,b)=>{b.unauthorizedGate={release:'PASS'};},'CONTROL_KEY_CARDINALITY');
console.log('B4_003_CARLOS_HISTORY_HYDRATION_NEGATIVE_GOVERNANCE_PASS checks='+checks+' old_controls_frozen=true no_release=true');
