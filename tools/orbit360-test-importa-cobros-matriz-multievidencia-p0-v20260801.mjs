#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-cobros-matriz-multievidencia-p0.js','utf8'),{filename:'importa-cobros-matriz-multievidencia-p0.js'});
const owner=Orbit.importaCobrosMatrizMultievidenciaP0;
const cases=[];
let sequence=0;
const add=(count,props)=>{for(let index=0;index<count;index+=1)cases.push({caseKey:`case-${++sequence}`,insurerKey:`ins-${(sequence%10)+1}`,...props});};

add(4,{canonicalPaymentLinked:true,direct:{matched:true}});
add(1,{canonicalPaymentLinked:false,historicalEligible:true,direct:{matched:true}});
add(1,{canonicalPaymentLinked:false,historicalEligible:true,direct:{holdReason:'DIFERENCIA_MONTO'}});
add(3,{canonicalPaymentLinked:false,historicalEligible:true});
add(1,{canonicalPaymentLinked:true,direct:{holdReason:'IDENTIDAD_INSUFICIENTE'}});
add(1,{canonicalPaymentLinked:true,commissionCorroborated:true,dataContractHold:true});
add(1,{canonicalPaymentLinked:true,snapshotStatus:'STILL_PENDING_AFTER_PAYMENT'});
add(24,{canonicalPaymentLinked:true,snapshotStatus:'ABSENT_EXACT_RECEIPT_POLICY_PRESENT_REQUIRES_VALIDATION'});
add(7,{canonicalPaymentLinked:true,snapshotStatus:'ABSENT_FROM_COMPLETE_SNAPSHOT_REQUIRES_VALIDATION'});
add(14,{canonicalPaymentLinked:true,snapshotStatus:'NO_POST_PAYMENT_SNAPSHOT'});
add(11,{canonicalPaymentLinked:true,snapshotStatus:'NO_PORTFOLIO_COUNTERPART'});

const result=owner.buildMatrix({
  sourcePaymentRows:68,canonicalPaymentRows:63,cases,
  directEvidenceKeys:Array.from({length:9},(_,index)=>`direct-${index+1}`),
  insurerOnlyEvidence:[
    {evidenceKey:'insurer-only-1',status:'HOLD_INSURER_ONLY_WITHOUT_CRM'},
    {evidenceKey:'insurer-only-2',status:'HOLD_INSURER_ONLY_WITHOUT_CRM'}
  ]
});
const expected={
  DIRECT_INSURER_MATCH_READY:4,
  DIRECT_INSURER_MATCH_HISTORICAL_RECEIPT_PROPOSAL:1,
  HISTORICAL_RECEIPT_PROPOSAL_NEEDS_COUNTERPART:3,
  HOLD_DIRECT_DIFERENCIA_MONTO:1,
  HOLD_DIRECT_IDENTIDAD_INSUFICIENTE:1,
  HOLD_COMMISSION_CORROBORATED_DATA_CONTRACT:1,
  HOLD_STILL_PENDING_AFTER_PAYMENT:1,
  TEMPORAL_CLEARING_POLICY_PRESENT_REQUIRES_AUTHORIZATION:24,
  TEMPORAL_CLEARING_POLICY_ABSENT_REQUIRES_VALIDATION:7,
  SOURCE_CUTOFF_BEFORE_PAYMENT_NEEDS_LATER_EVIDENCE:14,
  NO_COUNTERPART_EVIDENCE_YET:11
};
assert.equal(owner.VERSION,'20260801.1-real-matrix-historical-coverage');
assert.equal(result.status,'MATRIX_READY');
assert.equal(result.cases.length,68);
assert.deepEqual(result.counts,expected);
assert.equal(result.totals.sourcePaymentRows,68);
assert.equal(result.totals.canonicalPaymentRows,63);
assert.equal(result.totals.historicalOmissions,5);
assert.equal(result.totals.insurerOnlyEvidence,2);
assert.equal(result.totals.unionPaymentCases,70);
assert.equal(result.coverageBalanced,true);
assert.equal(result.oneToOneDirectEvidence,true);
assert.equal(result.exactReceiptPrecedesFifo,true);
assert.equal(result.historicalExigibleIncluded,true);
assert.equal(result.absenceAloneCreatesCobro,false);
assert.equal(result.commissionAloneCreatesCobro,false);
assert.equal(result.bankAloneCreatesCobro,false);
assert.equal(result.autoApply,false);
assert.equal(result.reactivatesPolicy,false);
assert.equal(result.cobrosWrites,0);
assert.equal(result.finmovsWrites,0);
assert.equal(result.firestoreWrites,0);
assert.equal(result.operationalWrites,0);
assert.equal(result.productionTouched,false);
console.log(JSON.stringify({
  status:'COBROS_REAL_MATRIX_ENGINE_PASS',version:result.version,
  sourcePaymentRows:68,canonicalPaymentRows:63,historicalOmissions:5,
  unionPaymentCases:70,insurerOnlyEvidence:2,statusCounts:result.counts,
  coverageBalanced:true,oneToOneDirectEvidence:true,exactReceiptPrecedesFifo:true,
  historicalExigibleIncluded:true,absenceAloneCreatesCobro:false,
  commissionAloneCreatesCobro:false,bankAloneCreatesCobro:false,
  cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  browserExecuted:false,deployExecuted:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false
},null,2));
