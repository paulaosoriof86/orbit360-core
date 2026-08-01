#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/cobros-controlled-write-gate-p0.js','utf8'),{filename:'cobros-controlled-write-gate-p0.js'});
const authorization=JSON.parse(fs.readFileSync('orbit360-platform/docs/AUTORIZACION-DIRECCION-COBROS-5-CASOS-20260801.json','utf8'));
const result=Orbit.cobrosControlledWriteGateP0.prepare({authorization});

assert.equal(result.status,'COBROS_CONTROLLED_WRITE_GATE_PREPARED');
assert.equal(result.phase,'PREPARED_STATIC');
assert.equal(result.gateId,'block10.9-cobros-controlled-write-lab-v20260801');
assert.equal(result.humanAuthorizationRecorded,true);
assert.equal(result.directApproved,4);
assert.equal(result.historicalApproved,1);
assert.equal(result.groups.length,5);
assert.equal(result.groups.filter(group=>group.category==='EXISTING_CANONICAL_RECEIPT').length,4);
assert.equal(result.groups.filter(group=>group.category==='HISTORICAL_RECEIPT_REINFORCED').length,1);
assert.equal(result.groups.at(-1).category,'HISTORICAL_RECEIPT_REINFORCED');
assert.equal(result.groups.every(group=>group.atomic===true),true);
assert.equal(result.groups.every(group=>group.snapshot.every(item=>item.required===true)),true);
assert.equal(result.groups.every(group=>group.operations.every(item=>item.writeEligible===false)),true);
assert.equal(result.groups.every(group=>group.rollback.length>=2),true);
assert.equal(result.groups.every(group=>group.reactivatePolicy===false&&group.createFinmov===false),true);
assert.equal(result.groups.at(-1).reinforcedAuthorizationRequired,true);
assert.equal(result.totals.groups,5);
assert.equal(result.totals.snapshots,11);
assert.equal(result.totals.operations,10);
assert.equal(result.totals.rollbacks,11);
assert.equal(result.duplicateIdempotencyKeys,0);
assert.equal(new Set(result.groups.map(group=>group.idempotencyKey)).size,5);
assert.equal(result.snapshotBeforeWriteRequired,true);
assert.equal(result.atomicPerCaseRequired,true);
assert.equal(result.rollbackPerCaseRequired,true);
assert.equal(result.historicalAtomicRequired,true);
assert.equal(result.genericWriterRemainsBlockedForCobros,true);
assert.equal(result.executionAuthorized,false);
assert.equal(result.labWriteAuthorized,false);
assert.equal(result.writeEligible,0);
assert.equal(result.cobrosWrites,0);
assert.equal(result.receiptWrites,0);
assert.equal(result.policyWrites,0);
assert.equal(result.finmovsWrites,0);
assert.equal(result.firestoreWrites,0);
assert.equal(result.operationalWrites,0);
assert.equal(result.browserExecuted,false);
assert.equal(result.deployExecuted,false);
assert.equal(result.productionTouched,false);
assert.deepEqual(result.validationErrors,[]);

const raw=JSON.stringify(result);
for(const forbidden of ['clientLabel','policyNumber','receiptNumber','amount','paymentDate','sourceProofs'])assert.equal(raw.includes(forbidden),false);

console.log(JSON.stringify({
  status:'COBROS_CONTROLLED_WRITE_GATE_PREFLIGHT_PASS',
  gateId:result.gateId,
  phase:result.phase,
  groups:result.totals.groups,
  direct:result.directApproved,
  historical:result.historicalApproved,
  snapshots:result.totals.snapshots,
  operations:result.totals.operations,
  rollbacks:result.totals.rollbacks,
  duplicateIdempotencyKeys:result.duplicateIdempotencyKeys,
  executionAuthorized:result.executionAuthorized,
  labWriteAuthorized:result.labWriteAuthorized,
  writeEligible:result.writeEligible,
  cobrosWrites:result.cobrosWrites,
  receiptWrites:result.receiptWrites,
  policyWrites:result.policyWrites,
  finmovsWrites:result.finmovsWrites,
  firestoreWrites:result.firestoreWrites,
  operationalWrites:result.operationalWrites,
  browserExecuted:result.browserExecuted,
  deployExecuted:result.deployExecuted,
  productionTouched:result.productionTouched,
  containsPII:result.containsPII,
  containsPolicyNumbers:result.containsPolicyNumbers,
  containsAmounts:result.containsAmounts,
  containsSecrets:result.containsSecrets
},null,2));
