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
const save=o=>{fs.mkdirSync(path.dirname(evidencePath),{recursive:true});fs.writeFileSync(evidencePath,JSON.stringify(o,null,2)+'\n','utf8');};
const failed=[];
const check=(id,ok)=>{if(!ok)failed.push(id);};
let lifecycle={},marker={};
try{lifecycle=read(lifecycleRel);marker=read(markerRel);}catch(e){failed.push('CONTRACT_FILE_READ');}
check('GATE_ID',gateId===GATE&&lifecycle.gateId===GATE&&marker.gateId===GATE);
check('VERSION',lifecycle.gateContractVersion===VERSION&&marker.contractVersion===VERSION);
check('LIFECYCLE_REVISION',lifecycle.validatorLifecycleRevision==='phase-capability-contract-v1');
check('LIFECYCLE_STATUS',lifecycle.status==='PLANILLAS_COMISIONES_LINKAGE_READONLY_ACTIVE');
check('MODE',lifecycle.executionProfile?.mode==='READ_ONLY_PLANILLAS_COMISIONES_LINKAGE'&&marker.mode==='READ_ONLY_PLANILLAS_COMISIONES_LINKAGE');
check('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
check('APPROVED',marker.approved===true);
check('SOURCE_DRYRUN',lifecycle.sourceDryrunClosed===true&&marker.sourceCut?.rowsObserved===67&&marker.sourceCut?.crmCandidates===65&&marker.sourceCut?.omittedZeroCommission===2);
check('SOURCE_COUNTS',lifecycle.sourceFiles===19&&lifecycle.sourceBundles===10&&lifecycle.sourceRowsObserved===67&&lifecycle.crmCandidateRows===65);
check('PACKAGE_ID',marker.privatePackage?.driveFileId==='1aHmPWyfqN65DoXsHuk955e-Bx_JVB_84'&&lifecycle.privatePackage?.driveFileId===marker.privatePackage?.driveFileId);
check('PACKAGE_SHA',marker.privatePackage?.sha256==='4933506bbe02e56c9dd2ed5f180ed3d0ad293f73a952a2044378e3f02aeed496'&&lifecycle.privatePackage?.sha256===marker.privatePackage?.sha256);
check('PACKAGE_LOGICAL_SHA',marker.privatePackage?.logicalSha256==='45a3b6f1c801482c37f17270c5fbba59602cadc2319cf88e5485ffbd304b08f8'&&lifecycle.privatePackage?.logicalSha256===marker.privatePackage?.logicalSha256);
check('BASELINE',marker.expectedBaseline?.polizas===1373&&marker.expectedBaseline?.recibosEsperados===1294&&marker.expectedBaseline?.cobros===5&&marker.expectedBaseline?.finmovs===0);
const cap=lifecycle.executionProfile?.capabilities||{};
check('CAPABILITIES',cap.secrets===true&&cap.firestoreRead===true&&cap.writes===false&&cap.runtime===false&&cap.browser===false&&cap.deploy===false&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false);
check('NO_WRITES',lifecycle.writeAuthorized===false&&lifecycle.commissionWritesAuthorized===false&&lifecycle.finmovWritesAuthorized===false&&lifecycle.cxcWritesAuthorized===false&&lifecycle.cxpWritesAuthorized===false&&lifecycle.advisorLiquidationWritesAuthorized===false&&lifecycle.operationalWritesAllowed===0);
check('FINANCE_OFF',lifecycle.financeActivated===false&&marker.expectedOutcome?.financeActivated===false);
check('SANITIZATION',marker.sanitization?.includeIds===false&&marker.sanitization?.includePolicyNumbers===false&&marker.sanitization?.includeAmounts===false&&marker.sanitization?.includePII===false&&marker.sanitization?.includeSourceRows===false&&marker.sanitization?.includeSecrets===false);
const ok=failed.length===0;
const evidence={
  schemaVersion:'orbit360-planillas-comisiones-linkage-gate-preflight-v1',
  gateId:GATE,
  contractVersion:VERSION,
  status:ok?'GO_GATE_CONTRACT':'VALIDATOR_STALE',
  classification:ok?'PLANILLAS_COMISIONES_LINKAGE_READONLY_READY':'PIPELINE_MECHANISM_FAILURE',
  canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',
  phase:'READ_ONLY_PLANILLAS_COMISIONES_LINKAGE',
  requestState:'ACTIVE_READONLY_SINGLE_CUT',
  privatePackageVerifiedByContract:ok,
  packageCanonicalization:'node-json-stable-sort-v1',
  sourceDryrunClosed:lifecycle.sourceDryrunClosed===true,
  sourceRows:Number(marker.sourceCut?.rowsObserved||0),
  linkageCandidates:Number(marker.sourceCut?.crmCandidates||0),
  sourceRowsOmitted:Number(marker.sourceCut?.omittedZeroCommission||0),
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
  containsSecrets:false
};
save(evidence);console.log(JSON.stringify(evidence,null,2));process.exit(ok?0:41);
