#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const FILE='orbit360-platform/docs/AUDITORIA-READONLY-COBROS-MATERIALIZACION-PRIVADA-REAL-SANITIZADA-20260801.json';
const raw=fs.readFileSync(FILE,'utf8');
const audit=JSON.parse(raw);
const cards=audit.materialization.cards||[];

assert.equal(audit.schemaVersion,'orbit360-cobros-private-real-materialization-attestation-v1');
assert.equal(audit.status,'PRIVATE_AUTHORIZATION_MATERIALIZATION_REAL_ATTESTED');
assert.equal(audit.sourceGate.gateId,'block10.7-cobros-private-materialization-static-v20260801');
assert.equal(audit.ephemeralSession.realMaterializationPerformed,true);
assert.equal(audit.ephemeralSession.privateInputAvailable,true);
assert.equal(audit.ephemeralSession.persistAllowed,false);
assert.equal(audit.ephemeralSession.privateCardsEnumerable,false);
assert.equal(audit.ephemeralSession.serializedAuditContainsPrivateValues,false);
assert.equal(audit.ephemeralSession.ownerPrivateCardsDisposed,true);
assert.equal(audit.ephemeralSession.callerPrivateInputDisposed,true);
assert.equal(audit.ephemeralSession.remainingPrivateCardsAfterDisposal,0);
assert.equal(audit.ephemeralSession.remainingPrivateInputsAfterDisposal,0);

assert.equal(audit.materialization.cardCount,5);
assert.equal(cards.length,5);
assert.equal(audit.materialization.direct,4);
assert.equal(audit.materialization.historical,1);
assert.equal(cards.filter(card=>card.category==='EXISTING_CANONICAL_RECEIPT').length,4);
assert.equal(cards.filter(card=>card.category==='HISTORICAL_RECEIPT_REINFORCED').length,1);
assert.equal(cards.at(-1).category,'HISTORICAL_RECEIPT_REINFORCED');
assert.equal(cards.every(card=>card.validationOk===true&&card.sourceProofCount>=2),true);
assert.equal(cards.every(card=>card.explicitAuthorizationRequired===true),true);
assert.equal(cards.slice(0,4).every(card=>card.reinforcedAuthorizationRequired===false&&card.atomicOperationRequired===false),true);
assert.equal(cards.at(-1).reinforcedAuthorizationRequired,true);
assert.equal(cards.at(-1).atomicOperationRequired,true);
assert.equal(cards.every(card=>card.authorizationGranted===false&&card.writeEligible===false),true);
assert.equal(cards.every(card=>card.createFinmov===false&&card.reactivatePolicy===false),true);
assert.equal(new Set(cards.map(card=>card.authorizationRef)).size,5);
assert.equal(cards.every(card=>/^cob-auth-[a-f0-9]{24}$/.test(card.authorizationRef)),true);
assert.equal(audit.materialization.duplicateAuthorizationRefs,0);
assert.equal(audit.materialization.duplicateIdempotencyKeys,0);
assert.equal(audit.materialization.authorizationGranted,0);
assert.equal(audit.materialization.writeEligible,0);
assert.equal(audit.materialization.historicalCardLast,true);
assert.match(audit.materialization.integrityDigest,/^sha256:[a-f0-9]{64}$/);

assert.equal(audit.sourceVerification.registeredHashesVerified,3);
assert.equal(audit.sourceVerification.crmExactHash,true);
assert.equal(audit.sourceVerification.generalExactHash,true);
assert.equal(audit.sourceVerification.mapfreExactHash,true);
assert.equal(audit.sourceVerification.canonicalPoliciesAvailable,true);
assert.equal(audit.sourceVerification.canonicalReceiptsAvailable,true);
assert.equal(audit.sourceVerification.newFilesRequested,0);
assert.equal(audit.sourceVerification.staleFinancialFilesUsed,false);
assert.equal(audit.sourceVerification.bankUsedAsPaymentAuthority,false);
assert.equal(audit.sourceVerification.commissionSheetUsedAsPaymentAuthority,false);

assert.equal(audit.controls.exactReceiptPrecedesFifo,true);
assert.equal(audit.controls.historicalReceiptRequiresReinforcedAuthorization,true);
assert.equal(audit.controls.historicalReceiptAtomicOperationRequired,true);
assert.equal(audit.controls.reactivatesPolicy,false);
assert.equal(audit.controls.createsFinmov,false);
assert.equal(audit.controls.autoApply,false);
assert.equal(audit.controls.preWriteSnapshotRequired,true);
assert.equal(audit.controls.rollbackRequired,true);
assert.equal(audit.controls.packageGrantsAuthorization,false);

assert.equal(audit.writes.cobros,0);
assert.equal(audit.writes.finmovs,0);
assert.equal(audit.writes.firestore,0);
assert.equal(audit.writes.operational,0);
assert.equal(audit.writes.browserExecuted,false);
assert.equal(audit.writes.deployExecuted,false);
assert.equal(audit.writes.productionTouched,false);
assert.equal(audit.security.realRowsStoredInRepo,0);
assert.equal(audit.security.privateValuesPersisted,false);
assert.equal(audit.security.containsPII,false);
assert.equal(audit.security.containsPolicyNumbers,false);
assert.equal(audit.security.containsRealAmounts,false);
assert.equal(audit.security.containsSecrets,false);

// Sanitized cards may expose only control metadata and opaque references.
const allowedCardKeys=new Set([
  'authorizationRef','category','validationOk','sourceProofCount','explicitAuthorizationRequired',
  'reinforcedAuthorizationRequired','atomicOperationRequired','authorizationGranted','writeEligible',
  'createFinmov','reactivatePolicy'
]);
assert.equal(cards.every(card=>Object.keys(card).every(key=>allowedCardKeys.has(key))),true);
for(const forbidden of ['"clientLabel"','"policyNumber"','"receiptNumber"','"currency"','"amount"','"paymentDate"','"sourceProofs"','"idempotencyKey"'])
  assert.equal(raw.includes(forbidden),false,`forbidden serialized field ${forbidden}`);

console.log(JSON.stringify({
  status:'COBROS_PRIVATE_REAL_MATERIALIZATION_ATTESTATION_PASS',
  cardCount:cards.length,
  direct:audit.materialization.direct,
  historical:audit.materialization.historical,
  sourceHashesVerified:audit.sourceVerification.registeredHashesVerified,
  ownerPrivateCardsDisposed:audit.ephemeralSession.ownerPrivateCardsDisposed,
  callerPrivateInputDisposed:audit.ephemeralSession.callerPrivateInputDisposed,
  remainingPrivateCards:audit.ephemeralSession.remainingPrivateCardsAfterDisposal,
  remainingPrivateInputs:audit.ephemeralSession.remainingPrivateInputsAfterDisposal,
  authorizationGranted:audit.materialization.authorizationGranted,
  writeEligible:audit.materialization.writeEligible,
  cobrosWrites:audit.writes.cobros,
  finmovsWrites:audit.writes.finmovs,
  firestoreWrites:audit.writes.firestore,
  operationalWrites:audit.writes.operational,
  browserExecuted:audit.writes.browserExecuted,
  deployExecuted:audit.writes.deployExecuted,
  productionTouched:audit.writes.productionTouched,
  containsPII:audit.security.containsPII,
  containsPolicyNumbers:audit.security.containsPolicyNumbers,
  containsRealAmounts:audit.security.containsRealAmounts,
  containsSecrets:audit.security.containsSecrets
},null,2));
