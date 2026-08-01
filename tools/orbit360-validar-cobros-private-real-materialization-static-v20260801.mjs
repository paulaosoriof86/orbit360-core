#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE_ID='block10.8-cobros-private-real-materialization-static-v20260801';
const VERSION='10.8.0';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/cobros-private-real-materialization-static-v20260801.json');
const files={
  lifecycle:'tools/orbit360-validator-lifecycle-contract-cobros-private-real-materialization-v20260801.json',
  owner:'orbit360-platform/core/cobros-private-authorization-materializer-p0.js',
  predecessor:'tools/orbit360-validar-cobros-private-materialization-static-v20260801.mjs',
  test:'tools/orbit360-test-cobros-private-real-materialization-attestation-v20260801.mjs',
  audit:'orbit360-platform/docs/AUDITORIA-READONLY-COBROS-MATERIALIZACION-PRIVADA-REAL-SANITIZADA-20260801.json',
  closure:'orbit360-platform/docs/CIERRE-STATIC-COBROS-MATERIALIZACION-PRIVADA-REAL-20260801.md',
  academia:'orbit360-platform/docs/ACADEMIA-MATERIALIZACION-PRIVADA-REAL-COBROS-20260801.md',
  claude:'orbit360-platform/docs/CLAUDE-ACUMULADO-COBROS-MATERIALIZACION-PRIVADA-REAL-20260801.md'
};
const checks=[];
const check=(id,ok)=>checks.push({id,ok:Boolean(ok)});
const read=key=>fs.readFileSync(path.join(ROOT,files[key]),'utf8');
let testResult=null,predecessorResult=null,error='';

try{
  Object.entries(files).forEach(([key,file])=>check('FILE_'+key,fs.existsSync(path.join(ROOT,file))));

  const lifecycle=JSON.parse(read('lifecycle'));
  check('LIFECYCLE_GATE',lifecycle.gateId===GATE_ID&&lifecycle.gateContractVersion===VERSION);
  check('LIFECYCLE_OWNER',lifecycle.owner==='cobros-private-authorization-materializer-p0'&&lifecycle.ownerVersion==='20260801.1-private-readonly-materializer');
  check('LIFECYCLE_ZERO_CAPABILITIES',Object.values(lifecycle.executionProfile.capabilities).every(value=>value===false));
  check('LIFECYCLE_COUNTS',lifecycle.expected.cardCount===5&&lifecycle.expected.direct===4&&lifecycle.expected.historical===1&&lifecycle.expected.registeredHashesVerified===3);
  check('LIFECYCLE_NO_AUTH',lifecycle.writeAuthorized===false&&lifecycle.expected.authorizationGranted===0&&lifecycle.expected.writeEligible===0);
  check('LIFECYCLE_DISPOSAL',lifecycle.expected.remainingPrivateCardsAfterDisposal===0&&lifecycle.expected.remainingPrivateInputsAfterDisposal===0);

  const owner=read('owner');
  [
    '20260801.1-private-readonly-materializer','privateCardsEnumerable:false','privateValuesPersisted:false',
    'packageGrantsAuthorization:false','authorizationGranted:0','writeEligible:0','disposalRequired:true',
    'reactivatesPolicy:false','createFinmov:false','cobrosWrites:0','finmovsWrites:0'
  ].forEach(token=>check('OWNER_'+token.slice(0,42),owner.includes(token)));
  check('OWNER_NO_COBROS_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]cobros['"]/.test(owner));
  check('OWNER_NO_FINMOV_WRITE',!/\.(?:insert|update|remove)\s*\(\s*['"]finmovs['"]/.test(owner));

  const pre=spawnSync(process.execPath,[files.predecessor],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('PREDECESSOR_EXIT',pre.status===0);
  if(pre.status===0)predecessorResult=JSON.parse(pre.stdout);
  check('PREDECESSOR_STATUS',predecessorResult&&predecessorResult.status==='GO_GATE_CONTRACT'&&predecessorResult.domainStatus==='COBROS_PRIVATE_MATERIALIZATION_STATIC_READY'&&predecessorResult.failed===0);
  check('PREDECESSOR_ZERO_WRITES',predecessorResult&&predecessorResult.cobrosWrites===0&&predecessorResult.finmovsWrites===0&&predecessorResult.firestoreWrites===0&&predecessorResult.operationalWrites===0);

  const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});
  check('TEST_EXIT',run.status===0);
  if(run.status===0)testResult=JSON.parse(run.stdout);
  check('TEST_STATUS',testResult&&testResult.status==='COBROS_PRIVATE_REAL_MATERIALIZATION_ATTESTATION_PASS');
  check('TEST_COUNTS',testResult&&testResult.cardCount===5&&testResult.direct===4&&testResult.historical===1&&testResult.sourceHashesVerified===3);
  check('TEST_DISPOSAL',testResult&&testResult.ownerPrivateCardsDisposed===true&&testResult.callerPrivateInputDisposed===true&&testResult.remainingPrivateCards===0&&testResult.remainingPrivateInputs===0);
  check('TEST_NO_AUTH',testResult&&testResult.authorizationGranted===0&&testResult.writeEligible===0);
  check('TEST_ZERO_WRITES',testResult&&testResult.cobrosWrites===0&&testResult.finmovsWrites===0&&testResult.firestoreWrites===0&&testResult.operationalWrites===0);
  check('TEST_NO_RUNTIME',testResult&&testResult.browserExecuted===false&&testResult.deployExecuted===false&&testResult.productionTouched===false);
  check('TEST_SANITIZED',testResult&&testResult.containsPII===false&&testResult.containsPolicyNumbers===false&&testResult.containsRealAmounts===false&&testResult.containsSecrets===false);

  const audit=JSON.parse(read('audit'));
  const cards=audit.materialization.cards||[];
  check('AUDIT_STATUS',audit.status==='PRIVATE_AUTHORIZATION_MATERIALIZATION_REAL_ATTESTED');
  check('AUDIT_SOURCE_GATE',audit.sourceGate.gateId==='block10.7-cobros-private-materialization-static-v20260801'&&audit.sourceGate.run===30706859578);
  check('AUDIT_SESSION',audit.ephemeralSession.realMaterializationPerformed===true&&audit.ephemeralSession.privateInputAvailable===true&&audit.ephemeralSession.persistAllowed===false);
  check('AUDIT_PRIVACY',audit.ephemeralSession.privateCardsEnumerable===false&&audit.ephemeralSession.serializedAuditContainsPrivateValues===false);
  check('AUDIT_DISPOSAL',audit.ephemeralSession.ownerPrivateCardsDisposed===true&&audit.ephemeralSession.callerPrivateInputDisposed===true&&audit.ephemeralSession.remainingPrivateCardsAfterDisposal===0&&audit.ephemeralSession.remainingPrivateInputsAfterDisposal===0);
  check('AUDIT_COUNTS',audit.materialization.cardCount===5&&cards.length===5&&audit.materialization.direct===4&&audit.materialization.historical===1);
  check('AUDIT_ORDER',audit.materialization.historicalCardLast===true&&cards.at(-1)?.category==='HISTORICAL_RECEIPT_REINFORCED');
  check('AUDIT_PROOFS',audit.materialization.allSourceProofsSufficient===true&&cards.every(card=>card.sourceProofCount>=2));
  check('AUDIT_UNIQUE',audit.materialization.duplicateAuthorizationRefs===0&&audit.materialization.duplicateIdempotencyKeys===0&&new Set(cards.map(card=>card.authorizationRef)).size===5);
  check('AUDIT_NO_AUTH',audit.materialization.authorizationGranted===0&&audit.materialization.writeEligible===0&&cards.every(card=>card.authorizationGranted===false&&card.writeEligible===false));
  check('AUDIT_HASHES',audit.sourceVerification.registeredHashesVerified===3&&audit.sourceVerification.crmExactHash===true&&audit.sourceVerification.generalExactHash===true&&audit.sourceVerification.mapfreExactHash===true);
  check('AUDIT_CANONICAL_AVAILABLE',audit.sourceVerification.canonicalPoliciesAvailable===true&&audit.sourceVerification.canonicalReceiptsAvailable===true);
  check('AUDIT_NO_NEW_FILES',audit.sourceVerification.newFilesRequested===0&&audit.sourceVerification.staleFinancialFilesUsed===false);
  check('AUDIT_AUTHORITY_BOUNDARY',audit.sourceVerification.bankUsedAsPaymentAuthority===false&&audit.sourceVerification.commissionSheetUsedAsPaymentAuthority===false);
  check('AUDIT_HISTORICAL',audit.controls.historicalReceiptRequiresReinforcedAuthorization===true&&audit.controls.historicalReceiptAtomicOperationRequired===true&&audit.controls.reactivatesPolicy===false);
  check('AUDIT_NO_FINMOV',audit.controls.createsFinmov===false&&audit.controls.autoApply===false);
  check('AUDIT_SNAPSHOT_ROLLBACK',audit.controls.preWriteSnapshotRequired===true&&audit.controls.rollbackRequired===true);
  check('AUDIT_ZERO_WRITES',audit.writes.cobros===0&&audit.writes.finmovs===0&&audit.writes.firestore===0&&audit.writes.operational===0);
  check('AUDIT_NO_RUNTIME',audit.writes.browserExecuted===false&&audit.writes.deployExecuted===false&&audit.writes.productionTouched===false);
  check('AUDIT_SANITIZED',audit.security.realRowsStoredInRepo===0&&audit.security.privateValuesPersisted===false&&audit.security.containsPII===false&&audit.security.containsPolicyNumbers===false&&audit.security.containsRealAmounts===false&&audit.security.containsSecrets===false);

  const closure=read('closure'),academia=read('academia'),claude=read('claude');
  check('CLOSURE_STATE',closure.includes('PRIVATE_AUTHORIZATION_MATERIALIZATION_REAL_ATTESTED'));
  check('CLOSURE_COUNTS',closure.includes('recibos canónicos existentes: 4')&&closure.includes('recibo histórico reforzado: 1'));
  check('CLOSURE_DISPOSAL',closure.includes('tarjetas privadas restantes: 0')&&closure.includes('inputs privados restantes: 0'));
  check('ACADEMIA_ROLES',academia.includes('Dirección / AdminTenant')&&academia.includes('Operativo')&&academia.includes('Asesor'));
  check('ACADEMIA_FLOW',academia.includes('evidencia disponible')&&academia.includes('autorización humana')&&academia.includes('escritura efectiva'));
  check('CLAUDE_CLASSIFICATION',claude.includes('SECRETO_DATO_REAL')&&claude.includes('REPLICABLE_CLAUDE_ACUMULADO'));
}catch(exception){
  error=String(exception&&exception.message||exception);
}

const failed=checks.filter(item=>!item.ok),ready=failed.length===0&&!error;
const auditExists=fs.existsSync(path.join(ROOT,files.audit));
const audit=auditExists?JSON.parse(read('audit')):null;
const payload={
  schemaVersion:'orbit360-cobros-private-real-materialization-static-v1',
  gateId:GATE_ID,contractVersion:VERSION,
  status:ready?'GO_GATE_CONTRACT':'HOLD_GATE_CONTRACT',
  domainStatus:ready?'COBROS_PRIVATE_REAL_MATERIALIZATION_STATIC_READY':'COBROS_PRIVATE_REAL_MATERIALIZATION_STATIC_BLOCKED',
  classification:ready?'GO_STATIC_COBROS_PRIVATE_REAL_MATERIALIZATION':'DATA_CONTRACT_FAILURE',
  total:checks.length,passed:checks.length-failed.length,failed:failed.length,
  failedCheckIds:failed.map(item=>item.id),checks,testResult,
  materialization:audit?{
    cardCount:audit.materialization.cardCount,
    direct:audit.materialization.direct,
    historical:audit.materialization.historical,
    registeredHashesVerified:audit.sourceVerification.registeredHashesVerified,
    authorizationGranted:audit.materialization.authorizationGranted,
    writeEligible:audit.materialization.writeEligible,
    ownerPrivateCardsDisposed:audit.ephemeralSession.ownerPrivateCardsDisposed,
    callerPrivateInputDisposed:audit.ephemeralSession.callerPrivateInputDisposed,
    remainingPrivateCardsAfterDisposal:audit.ephemeralSession.remainingPrivateCardsAfterDisposal,
    remainingPrivateInputsAfterDisposal:audit.ephemeralSession.remainingPrivateInputsAfterDisposal,
    integrityDigest:audit.materialization.integrityDigest
  }:null,
  realRowsStoredInRepo:0,
  cobrosWrites:0,finmovsWrites:0,firestoreWrites:0,operationalWrites:0,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
  deployExecuted:false,rulesApplied:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsRealAmounts:false,containsSecrets:false,error
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(ready?0:42);
