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
const failed=[];
const check=(id,ok)=>{if(!ok)failed.push(id);};
let lifecycle={},marker={};
try{lifecycle=read(lifecycleRel);marker=read(markerRel);}catch(error){failed.push('CONTRACT_FILE_READ');}
check('GATE_ID',gateId===GATE&&lifecycle.gateId===GATE&&marker.gateId===GATE);
check('VERSION',lifecycle.gateContractVersion===VERSION&&marker.contractVersion===VERSION);
check('LIFECYCLE_REVISION',lifecycle.validatorLifecycleRevision==='phase-capability-contract-v1');
check('LIFECYCLE_STATUS',lifecycle.status==='PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC_ACTIVE');
check('MODE',lifecycle.executionProfile?.mode==='READ_ONLY_PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC'&&marker.mode==='READ_ONLY_PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC');
check('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
check('APPROVED',marker.approved===true);
check('SOURCE_DRYRUN',lifecycle.sourceDryrunClosed===true&&marker.sourceCut?.rowsObserved===67&&marker.sourceCut?.crmCandidates===65&&marker.sourceCut?.omittedZeroCommission===2);
check('SOURCE_COUNTS',lifecycle.sourceFiles===19&&lifecycle.sourceBundles===10&&lifecycle.sourceRowsObserved===67&&lifecycle.crmCandidateRows===65);
check('PREVIOUS_LINKAGE',lifecycle.previousLinkage?.policyUnique===10&&lifecycle.previousLinkage?.policyMissing===29&&lifecycle.previousLinkage?.policyAmbiguous===26&&lifecycle.previousLinkage?.policyIdentityHolds===55);
check('ROOT_CAUSE',lifecycle.rootCauseDiagnostic?.classification==='VALIDATOR_STALE'&&lifecycle.rootCauseDiagnostic?.exactFirstShortCircuitStale===true&&lifecycle.rootCauseDiagnostic?.insurerAliasExpansionRequired===true&&lifecycle.rootCauseDiagnostic?.receiptCalendarEvidenceRequired===true&&lifecycle.rootCauseDiagnostic?.paymentDateTermSelectionAllowed===false&&lifecycle.rootCauseDiagnostic?.sourceRowsChanged===false);
check('EXPECTED_DIAGNOSTIC',lifecycle.expectedDiagnostic?.processed===65&&lifecycle.expectedDiagnostic?.resolved===49&&lifecycle.expectedDiagnostic?.holds===16&&lifecycle.expectedDiagnostic?.previousHoldsResolved===39&&lifecycle.expectedDiagnostic?.previousUniqueReclassified===1);
check('PACKAGE_ID',marker.privatePackage?.driveFileId==='1aHmPWyfqN65DoXsHuk955e-Bx_JVB_84'&&lifecycle.privatePackage?.driveFileId===marker.privatePackage?.driveFileId);
check('PACKAGE_SHA',marker.privatePackage?.sha256==='abf5975e5cf8821489437b3b6172153c54032c8f097b720c0a98b30555a62a82'&&lifecycle.privatePackage?.sha256===marker.privatePackage?.sha256);
check('PACKAGE_LOGICAL_SHA',marker.privatePackage?.logicalSha256==='a42b2eb6deee3c7b55da5747684ef7a3338bb0bfc8788bb3533d21c1eed84d74'&&lifecycle.privatePackage?.logicalSha256===marker.privatePackage?.logicalSha256);
check('BASELINE',marker.expectedBaseline?.polizas===1373&&marker.expectedBaseline?.recibosEsperados===1294&&marker.expectedBaseline?.cobros===5&&marker.expectedBaseline?.finmovs===0);
const capabilities=lifecycle.executionProfile?.capabilities||{};
check('CAPABILITIES',capabilities.secrets===true&&capabilities.firestoreRead===true&&capabilities.writes===false&&capabilities.runtime===false&&capabilities.browser===false&&capabilities.deploy===false&&capabilities.functionsDeploy===false&&capabilities.rulesDeploy===false&&capabilities.production===false);
check('NO_WRITES',lifecycle.writeAuthorized===false&&lifecycle.commissionWritesAuthorized===false&&lifecycle.finmovWritesAuthorized===false&&lifecycle.cxcWritesAuthorized===false&&lifecycle.cxpWritesAuthorized===false&&lifecycle.advisorLiquidationWritesAuthorized===false&&lifecycle.operationalWritesAllowed===0);
check('FINANCE_OFF',lifecycle.financeActivated===false&&marker.expectedOutcome?.financeActivated===false);
check('SANITIZATION',marker.sanitization?.includeIds===false&&marker.sanitization?.includePolicyNumbers===false&&marker.sanitization?.includeAmounts===false&&marker.sanitization?.includePII===false&&marker.sanitization?.includeSourceRows===false&&marker.sanitization?.includeSecrets===false);
const ok=failed.length===0;
const evidence={
  schemaVersion:'orbit360-planillas-comisiones-policy-identity-gate-preflight-v1',
  gateId:GATE,
  contractVersion:VERSION,
  status:ok?'GO_GATE_CONTRACT':'VALIDATOR_STALE',
  classification:ok?'PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC_READY':'PIPELINE_MECHANISM_FAILURE',
  canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',
  phase:'READ_ONLY_PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC',
  requestState:'ACTIVE_READONLY_ROOT_CAUSE_DIAGNOSTIC',
  privatePackageVerifiedByContract:ok,
  packageCanonicalization:'node-json-stable-sort-v1',
  sourceDryrunClosed:lifecycle.sourceDryrunClosed===true,
  sourceRows:Number(marker.sourceCut?.rowsObserved||0),
  diagnosticRows:Number(marker.sourceCut?.crmCandidates||0),
  previousPolicyIdentityHolds:Number(lifecycle.previousLinkage?.policyIdentityHolds||0),
  expectedResolved:Number(lifecycle.expectedDiagnostic?.resolved||0),
  expectedHolds:Number(lifecycle.expectedDiagnostic?.holds||0),
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
