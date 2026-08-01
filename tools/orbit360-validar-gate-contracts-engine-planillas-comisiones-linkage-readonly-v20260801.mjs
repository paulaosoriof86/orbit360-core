#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE='block11-planillas-comisiones-linkage-readonly-v20260801';
const VERSION='11.0.0';
const gateId=process.argv[2]||'';
const lifecycleRel='tools/orbit360-validator-lifecycle-contract-planillas-comisiones-linkage-readonly-v20260801.json';
const markerRel='.github/orbit360-diagnostics/planillas-comisiones-linkage-readonly-v20260801.json';
const evidenceRel='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const evidencePath=path.join(ROOT,evidenceRel);
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const save=payload=>{fs.mkdirSync(path.dirname(evidencePath),{recursive:true});fs.writeFileSync(evidencePath,JSON.stringify(payload,null,2)+'\n','utf8');};
const failed=[];const check=(id,ok)=>{if(!ok)failed.push(id);};
let lifecycle={},marker={};try{lifecycle=read(lifecycleRel);marker=read(markerRel);}catch(error){failed.push('CONTRACT_FILE_READ');}
check('GATE_ID',gateId===GATE&&lifecycle.gateId===GATE&&marker.gateId===GATE);
check('VERSION',lifecycle.gateContractVersion===VERSION&&marker.contractVersion===VERSION);
check('LIFECYCLE_REVISION',lifecycle.validatorLifecycleRevision==='phase-capability-contract-v1');
check('LIFECYCLE_STATUS',lifecycle.status==='PLANILLAS_COMMISSION_DRYRUN_ACTIVE');
check('MODE',lifecycle.executionProfile?.mode==='READ_ONLY_PLANILLAS_COMMISSION_DRYRUN'&&marker.mode==='READ_ONLY_PLANILLAS_COMMISSION_DRYRUN');
check('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
check('APPROVED',marker.approved===true&&marker.sequence===6);
check('SOURCE_COUNTS',lifecycle.sourceDryrunClosed===true&&lifecycle.sourceFiles===19&&lifecycle.sourceBundles===10&&lifecycle.sourceRowsObserved===67&&lifecycle.crmCandidateRows===65&&marker.sourceCut?.crmCandidates===65);
check('PREVIOUS_CLOSURE',lifecycle.policyReceiptClosure?.policyResolved===49&&lifecycle.policyReceiptClosure?.policyHolds===16&&lifecycle.policyReceiptClosure?.receiptResolved===5&&lifecycle.policyReceiptClosure?.receiptHolds===44&&lifecycle.policyReceiptClosure?.currentCobrosLinked===0&&lifecycle.policyReceiptClosure?.closed===true);
check('PLANNER_STATIC',lifecycle.commissionDryrunPlanner?.run===30719949803&&lifecycle.commissionDryrunPlanner?.job===91421949720&&lifecycle.commissionDryrunPlanner?.artifact===8824535956&&lifecycle.commissionDryrunPlanner?.checks===32&&lifecycle.commissionDryrunPlanner?.status==='STATIC_COMMISSION_DRYRUN_PLANNER_PASS');
check('DESTINATIONS',JSON.stringify(lifecycle.commissionDryrunPlanner?.destinations)===JSON.stringify(['planillasComisiones','comisionesDevengadas','conciliacionesComisiones']));
check('FIVE_SCOPE',lifecycle.dryrunScope?.exactPolicyReceiptRelations===5&&lifecycle.dryrunScope?.sourceBundles?.el_roble_gtq_2026_06===3&&lifecycle.dryrunScope?.sourceBundles?.universales_gtq_2026_06===1&&lifecycle.dryrunScope?.sourceBundles?.bantrab_gtq_2026_06===1);
check('BOUNDARIES',lifecycle.dryrunScope?.genericComisionesDestinationAllowed===false&&lifecycle.dryrunScope?.invoiceWritesAllowed===false&&lifecycle.dryrunScope?.cxcWritesAllowed===false&&lifecycle.dryrunScope?.cxpWritesAllowed===false&&lifecycle.dryrunScope?.advisorLiquidationWritesAllowed===false&&lifecycle.dryrunScope?.rateInferenceAllowed===false);
check('PACKAGE_ID',marker.privatePackage?.driveFileId==='1aHmPWyfqN65DoXsHuk955e-Bx_JVB_84'&&lifecycle.privatePackage?.driveFileId===marker.privatePackage?.driveFileId);
check('PACKAGE_SHA',marker.privatePackage?.sha256==='abf5975e5cf8821489437b3b6172153c54032c8f097b720c0a98b30555a62a82'&&lifecycle.privatePackage?.sha256===marker.privatePackage?.sha256);
check('PACKAGE_LOGICAL_SHA',marker.privatePackage?.logicalSha256==='a42b2eb6deee3c7b55da5747684ef7a3338bb0bfc8788bb3533d21c1eed84d74'&&lifecycle.privatePackage?.logicalSha256===marker.privatePackage?.logicalSha256);
check('BASELINE',marker.expectedBaseline?.polizas===1373&&marker.expectedBaseline?.recibosEsperados===1294&&marker.expectedBaseline?.cobros===5&&marker.expectedBaseline?.finmovs===0);
const cap=lifecycle.executionProfile?.capabilities||{};check('CAPABILITIES',cap.secrets===true&&cap.firestoreRead===true&&cap.writes===false&&cap.runtime===false&&cap.browser===false&&cap.deploy===false&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false);
check('NO_WRITES',lifecycle.writeAuthorized===false&&lifecycle.commissionWritesAuthorized===false&&lifecycle.finmovWritesAuthorized===false&&lifecycle.cxcWritesAuthorized===false&&lifecycle.cxpWritesAuthorized===false&&lifecycle.advisorLiquidationWritesAuthorized===false&&lifecycle.operationalWritesAllowed===0);
check('FINANCE_OFF',lifecycle.financeActivated===false&&marker.expectedOutcome?.financeActivated===false);
check('FUTURE_WRITE_GUARDS',lifecycle.futureWriteRequirements?.candidateSetDigestRequired===true&&lifecycle.futureWriteRequirements?.targetSnapshotDigestRequired===true&&lifecycle.futureWriteRequirements?.idempotencyRequired===true&&lifecycle.futureWriteRequirements?.atomicBatchRequired===true&&lifecycle.futureWriteRequirements?.rollbackRequired===true&&lifecycle.futureWriteRequirements?.advisorValidationRequired===true);
check('SANITIZATION',marker.sanitization?.includeIds===false&&marker.sanitization?.includePolicyNumbers===false&&marker.sanitization?.includeAmounts===false&&marker.sanitization?.includePII===false&&marker.sanitization?.includeSourceRows===false&&marker.sanitization?.includeSecrets===false);
const ok=failed.length===0;
const evidence={
  schemaVersion:'orbit360-planillas-comisiones-commission-dryrun-gate-preflight-v1',
  gateId:GATE,
  contractVersion:VERSION,
  status:ok?'GO_GATE_CONTRACT':'VALIDATOR_STALE',
  classification:ok?'PLANILLAS_COMMISSION_DRYRUN_READY':'PIPELINE_MECHANISM_FAILURE',
  canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',
  phase:'READ_ONLY_PLANILLAS_COMMISSION_DRYRUN',
  requestState:'ACTIVE_READONLY_FIVE_RELATIONS',
  privatePackageVerifiedByContract:ok,
  packageCanonicalization:'node-json-stable-sort-v1',
  sourceDryrunClosed:lifecycle.sourceDryrunClosed===true,
  sourceRows:Number(marker.sourceCut?.rowsObserved||0),
  policyReceiptRelations:Number(lifecycle.dryrunScope?.exactPolicyReceiptRelations||0),
  destinationCollections:Number(lifecycle.commissionDryrunPlanner?.destinations?.length||0),
  executionAuthorized:false,
  labWriteAuthorized:false,
  writeEligible:0,
  financeActivated:false,
  expectedBaseline:marker.expectedBaseline||{},
  failed:failed.length,
  failedCheckIds:failed,
  dataAccess:false,
  secretAccess:false,
  operationalWrites:0,
  evidenceWrites:1,
  secretsRead:false,
  firestoreRead:false,
  runtimeExecuted:false,
  browserExecuted:false,
  rulesApplied:false,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsPolicyNumbers:false,
  containsAmounts:false,
  containsIds:false,
  containsSourceRows:false,
  containsSecrets:false
};
save(evidence);console.log(JSON.stringify(evidence,null,2));process.exit(ok?0:41);
