#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/cobros-private-authorization-materializer-p0.js','utf8'),{filename:'cobros-private-authorization-materializer-p0.js'});
const engine=Orbit.cobrosPrivateAuthorizationMaterializerP0;
const records=Array.from({length:5},(_,index)=>({
  authorizationRef:index===4?'auth-historical':'auth-direct-'+(index+1),
  category:index===4?'HISTORICAL_RECEIPT_REINFORCED':'EXISTING_CANONICAL_RECEIPT',
  clientLabel:'Synthetic Client '+(index+1),
  insurerLabel:'Synthetic Insurer',
  policyNumber:'SYN-POL-'+(index+1),
  receiptNumber:'SYN-REC-'+(index+1),
  currency:'GTQ',amount:100+index,paymentDate:'2026-07-22',
  idempotencyKey:'cobros:synthetic-'+(index+1),
  sourceProofs:['source-a-'+index,'source-b-'+index]
}));
const result=engine.materialize({
  privateRecords:records,ephemeralSession:true,persistAllowed:false,packageGrantsAuthorization:false
});
assert.equal(result.status,'PRIVATE_AUTHORIZATION_MATERIALIZATION_READY');
assert.equal(result.totals.cards,5);
assert.equal(result.totals.direct,4);
assert.equal(result.totals.historical,1);
assert.equal(result.duplicateRefs,0);
assert.equal(result.duplicateIdempotencyKeys,0);
assert.equal(result.privateCardsEnumerable,false);
assert.equal(Object.keys(result).includes('privateCards'),false);
assert.equal(Object.keys(result).includes('dispose'),false);
assert.equal(result.privateCards.length,5);
assert.equal(result.privateCards.at(-1).reinforcedAuthorizationRequired,true);
assert.equal(result.reinforcedHistoricalSeparated,true);
assert.equal(result.privateValuesPersisted,false);
assert.equal(result.persistAllowed,false);
assert.equal(result.packageGrantsAuthorization,false);
assert.equal(result.authorizationGranted,0);
assert.equal(result.writeEligible,0);
assert.equal(result.allSourceProofsSufficient,true);
assert.equal(result.allDiffsPresent,true);
const serialized=JSON.stringify(result);
for(const token of ['Synthetic Client','SYN-POL','SYN-REC','source-a','source-b'])assert.equal(serialized.includes(token),false);
assert.equal(result.cobrosWrites,0);
assert.equal(result.finmovsWrites,0);
assert.equal(result.firestoreWrites,0);
assert.equal(result.operationalWrites,0);
const disposed=result.dispose();
assert.deepEqual(disposed,{disposed:true,remainingPrivateCards:0});
assert.equal(result.privateCards.length,0);
console.log(JSON.stringify({
  status:'COBROS_PRIVATE_AUTHORIZATION_MATERIALIZER_PASS',version:result.version,
  cards:result.totals.cards,direct:result.totals.direct,historical:result.totals.historical,
  duplicateRefs:result.duplicateRefs,duplicateIdempotencyKeys:result.duplicateIdempotencyKeys,
  privateCardsEnumerable:result.privateCardsEnumerable,privateValuesPersisted:result.privateValuesPersisted,
  serializedPayloadContainsPrivateValues:false,allSourceProofsSufficient:result.allSourceProofsSufficient,
  reinforcedHistoricalSeparated:result.reinforcedHistoricalSeparated,authorizationGranted:0,writeEligible:0,
  disposed:disposed.disposed,remainingPrivateCards:disposed.remainingPrivateCards,
  cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  browserExecuted:false,deployExecuted:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false
},null,2));
