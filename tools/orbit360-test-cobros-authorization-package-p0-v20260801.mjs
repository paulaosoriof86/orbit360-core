#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/cobros-proposal-queue-p0.js','utf8'),{filename:'cobros-proposal-queue-p0.js'});
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/cobros-authorization-package-p0.js','utf8'),{filename:'cobros-authorization-package-p0.js'});

const direct=Array.from({length:4},(_,index)=>({
  queueId:`queue-direct-${index+1}`,
  caseKey:`case-direct-${index+1}`,
  queueType:'AUTHORIZATION_READY_DIRECT',
  authorizationEligible:true,
  idempotencyKey:`cobros:direct-${index+1}`,
  sourceCount:2,
  rollbackPlan:{required:true,strategy:'DELETE_CREATED_COBRO_AND_RESTORE_RECEIPT_SNAPSHOT',preWriteSnapshotRequired:true,sourceRowsRemainImmutable:true}
}));
const historical={
  queueId:'queue-historical-1',caseKey:'case-historical-1',
  queueType:'AUTHORIZATION_READY_HISTORICAL_RECEIPT',authorizationEligible:true,
  idempotencyKey:'cobros:historical-1',sourceCount:2,
  rollbackPlan:{required:true,strategy:'DELETE_CREATED_COBRO_AND_RESTORE_RECEIPT_SNAPSHOT',preWriteSnapshotRequired:true,sourceRowsRemainImmutable:true}
};
const ignored={queueId:'queue-hold-1',caseKey:'case-hold-1',queueType:'HOLD_SOURCE_OR_DATA_CONTRACT',authorizationEligible:false,idempotencyKey:'cobros:hold-1'};
const result=Orbit.cobrosAuthorizationPackageP0.buildPackage({items:[...direct,historical,ignored]});
assert.equal(result.status,'AUTHORIZATION_PACKAGE_STATIC_READY');
assert.equal(result.totals.cards,5);
assert.equal(result.totals.direct,4);
assert.equal(result.totals.historical,1);
assert.equal(result.cards.at(-1).category,'HISTORICAL_RECEIPT_REINFORCED');
assert.equal(result.cards.at(-1).controls.reinforcedAuthorizationRequired,true);
assert.equal(result.cards.at(-1).controls.atomicOperationRequired,true);
assert.equal(result.cards.slice(0,4).every(card=>card.category==='EXISTING_CANONICAL_RECEIPT'),true);
assert.equal(result.cards.every(card=>card.authorizationGranted===false&&card.writeEligible===false),true);
assert.equal(result.cards.every(card=>card.diff.proposed.reactivatePolicy===false&&card.diff.proposed.createFinmov===false),true);
assert.equal(result.duplicateIdempotencyKeys,0);
assert.equal(result.allDiffsPresent,true);
assert.equal(result.allRollbackPlansPresent,true);
assert.equal(result.allWritesBlocked,true);
assert.equal(result.privateMaterializationRequired,true);
assert.equal(result.privateValuesStoredInRepo,false);
assert.equal(result.packageGrantsAuthorization,false);
assert.equal(result.partialBatchDecisionAllowed,true);
assert.equal(result.cobrosWrites,0);
assert.equal(result.finmovsWrites,0);
assert.equal(result.firestoreWrites,0);
assert.equal(result.operationalWrites,0);
assert.equal(result.productionTouched,false);
console.log(JSON.stringify({
  status:'COBROS_AUTHORIZATION_PACKAGE_ENGINE_PASS',version:result.version,
  cards:result.totals.cards,direct:result.totals.direct,historical:result.totals.historical,
  duplicateIdempotencyKeys:result.duplicateIdempotencyKeys,
  allDiffsPresent:result.allDiffsPresent,allRollbackPlansPresent:result.allRollbackPlansPresent,
  allWritesBlocked:result.allWritesBlocked,privateMaterializationRequired:result.privateMaterializationRequired,
  packageGrantsAuthorization:result.packageGrantsAuthorization,
  reinforcedAuthorizationForHistorical:result.reinforcedAuthorizationForHistorical,
  partialBatchDecisionAllowed:result.partialBatchDecisionAllowed,
  cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  browserExecuted:false,deployExecuted:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false
},null,2));
