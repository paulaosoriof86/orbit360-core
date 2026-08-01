#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/cobros-proposal-queue-p0.js','utf8'),{filename:'cobros-proposal-queue-p0.js'});
const owner=Orbit.cobrosProposalQueueP0;
const cases=[];
let sequence=0;
const add=(count,status)=>{for(let index=0;index<count;index+=1){const id=`case-${++sequence}`;cases.push({caseKey:id,status,sourceKeys:[`source-${id}`]});}};
add(4,'DIRECT_INSURER_MATCH_READY');
add(1,'DIRECT_INSURER_MATCH_HISTORICAL_RECEIPT_PROPOSAL');
add(24,'TEMPORAL_CLEARING_POLICY_PRESENT_REQUIRES_AUTHORIZATION');
add(7,'TEMPORAL_CLEARING_POLICY_ABSENT_REQUIRES_VALIDATION');
add(3,'HISTORICAL_RECEIPT_PROPOSAL_NEEDS_COUNTERPART');
add(1,'HOLD_DIRECT_DIFERENCIA_MONTO');
add(1,'HOLD_DIRECT_IDENTIDAD_INSUFICIENTE');
add(1,'HOLD_COMMISSION_CORROBORATED_DATA_CONTRACT');
add(1,'HOLD_STILL_PENDING_AFTER_PAYMENT');
add(14,'SOURCE_CUTOFF_BEFORE_PAYMENT_NEEDS_LATER_EVIDENCE');
add(11,'NO_COUNTERPART_EVIDENCE_YET');
const result=owner.buildQueue({
  cases,
  insurerOnlyEvidence:[
    {evidenceKey:'insurer-only-1',sourceKeys:['insurer-source-1']},
    {evidenceKey:'insurer-only-2',sourceKeys:['insurer-source-2']}
  ]
});
assert.equal(owner.VERSION,'20260801.1-controlled-proposal-queue');
assert.equal(result.status,'QUEUE_STATIC_READY');
assert.equal(result.totals.cases,70);
assert.equal(result.totals.authorizationReady,5);
assert.equal(result.totals.reviewOnly,24);
assert.equal(result.totals.validationRequired,7);
assert.equal(result.totals.hold,34);
assert.equal(result.counts.AUTHORIZATION_READY_DIRECT,4);
assert.equal(result.counts.AUTHORIZATION_READY_HISTORICAL_RECEIPT,1);
assert.equal(result.counts.REVIEW_TEMPORAL_CLEARING,24);
assert.equal(result.counts.VALIDATE_POLICY_ABSENT_FROM_SNAPSHOT,7);
assert.equal(result.counts.HOLD_SOURCE_OR_DATA_CONTRACT,32);
assert.equal(result.counts.HOLD_INSURER_ONLY_WITHOUT_CRM,2);
assert.equal(result.duplicateIdempotencyKeys,0);
assert.equal(result.allDiffsPresent,true);
assert.equal(result.allWritesBlocked,true);
assert.equal(result.explicitAuthorizationRequired,true);
assert.equal(result.reinforcedAuthorizationForHistorical,true);
const historical=result.items.find(item=>item.queueType==='AUTHORIZATION_READY_HISTORICAL_RECEIPT');
assert.ok(historical);
assert.equal(historical.authorizationEligible,true);
assert.equal(historical.reinforcedAuthorization,true);
assert.equal(historical.diff.proposed.createHistoricalReceipt,true);
assert.equal(historical.diff.proposed.reactivatePolicy,false);
assert.equal(historical.diff.proposed.createFinmov,false);
assert.equal(historical.rollbackPlan.preWriteSnapshotRequired,true);
assert.equal(result.items.every(item=>item.queueId&&item.idempotencyKey&&item.writeEligible===false),true);
assert.equal(result.cobrosWrites,0);
assert.equal(result.finmovsWrites,0);
assert.equal(result.firestoreWrites,0);
assert.equal(result.operationalWrites,0);
assert.equal(result.productionTouched,false);
console.log(JSON.stringify({
  status:'COBROS_CONTROLLED_PROPOSAL_QUEUE_PASS',version:result.version,
  cases:70,authorizationReady:5,reviewOnly:24,validationRequired:7,hold:34,
  queueCounts:result.counts,duplicateIdempotencyKeys:0,allDiffsPresent:true,
  allWritesBlocked:true,explicitAuthorizationRequired:true,
  reinforcedAuthorizationForHistorical:true,cobrosWrites:0,finmovsWrites:0,
  firestoreWrites:0,operationalWrites:0,browserExecuted:false,deployExecuted:false,
  productionTouched:false,containsPII:false,containsPolicyNumbers:false,
  containsRealAmounts:false,containsSecrets:false
},null,2));
