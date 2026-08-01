#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE='block11-planillas-comisiones-linkage-readonly-v20260801';
const VERSION='11.0.0';
const AUTH_REF='planillas-comisiones-five-relations-write-20260801';
const gateId=process.argv[2]||'';
const lifecycleRel='tools/orbit360-validator-lifecycle-contract-planillas-comisiones-linkage-readonly-v20260801.json';
const requestRel='.github/orbit360-requests/planillas-comisiones-controlled-write-lab-v20260801.json';
const evidenceRel='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const evidencePath=path.join(ROOT,evidenceRel);
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const save=payload=>{fs.mkdirSync(path.dirname(evidencePath),{recursive:true});fs.writeFileSync(evidencePath,JSON.stringify(payload,null,2)+'\n','utf8');};
const failed=[];const check=(id,ok)=>{if(!ok)failed.push(id);};
let lifecycle={},request={};try{lifecycle=read(lifecycleRel);request=read(requestRel);}catch(error){failed.push('CONTRACT_FILE_READ');}
check('GATE_ID',gateId===GATE&&lifecycle.gateId===GATE&&request.gateId===GATE);
check('VERSION',lifecycle.gateContractVersion===VERSION&&request.contractVersion===VERSION);
check('LIFECYCLE_REVISION',lifecycle.validatorLifecycleRevision==='phase-capability-contract-v1');
check('LIFECYCLE_STATUS',lifecycle.status==='PLANILLAS_COMMISSION_CONTROLLED_WRITE_AUTHORIZED');
check('MODE',lifecycle.executionProfile?.mode==='CONTROLLED_WRITE_PLANILLAS_COMMISSION');
check('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_APPLY');
check('REQUEST',request.schemaVersion==='orbit360-planillas-comisiones-controlled-write-request-v1'&&request.approved===true&&request.consumed===false&&request.authorizationRef===AUTH_REF);
check('AUTHORIZATION',lifecycle.authorization?.authorizedBy==='Paula Osorio'&&lifecycle.authorization?.authorizationRef===AUTH_REF&&lifecycle.authorization?.explicit===true&&lifecycle.authorization?.consumed===false);
check('SOURCE_COUNTS',lifecycle.sourceDryrunClosed===true&&lifecycle.sourceFiles===19&&lifecycle.sourceBundles===10&&lifecycle.sourceRowsObserved===67&&lifecycle.crmCandidateRows===65);
check('PREVIOUS_CLOSURE',lifecycle.policyReceiptClosure?.policyResolved===49&&lifecycle.policyReceiptClosure?.policyHolds===16&&lifecycle.policyReceiptClosure?.receiptResolved===5&&lifecycle.policyReceiptClosure?.receiptHolds===44&&lifecycle.policyReceiptClosure?.closed===true);
check('DRYRUN',lifecycle.commissionDryrun?.run===30720089823&&lifecycle.commissionDryrun?.exactPolicyReceiptRelations===5&&lifecycle.commissionDryrun?.commissionCandidates===5&&lifecycle.commissionDryrun?.proposedDocuments===15&&lifecycle.commissionDryrun?.sellerHolds===3&&lifecycle.commissionDryrun?.closed===true);
check('DIGESTS',request.digests?.candidateSet===lifecycle.commissionDryrun?.candidateSetDigest&&request.digests?.candidateSet==='04c7da071ddadfe689e0137e730448ada36abe7aff6c228cd5abb0206c26c680'&&request.digests?.emptyTargetSnapshot===lifecycle.commissionDryrun?.targetSnapshotDigest&&request.digests?.emptyTargetSnapshot==='12b3763f976433e1e7e809f461dc835bca3a4c39b1d6dd1655e42a202e6cbf3f');
check('SCOPE',request.scope?.relations===5&&request.scope?.documents===15&&request.scope?.planillasComisiones===5&&request.scope?.comisionesDevengadas===5&&request.scope?.conciliacionesComisiones===5&&request.scope?.sellerHolds===3);
check('NO_OTHER_WRITES',request.scope?.policyWrites===0&&request.scope?.receiptWrites===0&&request.scope?.cobroWrites===0&&request.scope?.finmovWrites===0&&request.scope?.invoiceWrites===0&&request.scope?.cxcWrites===0&&request.scope?.cxpWrites===0&&request.scope?.liquidationWrites===0);
check('PACKAGE',request.privatePackage?.driveFileId===lifecycle.privatePackage?.driveFileId&&request.privatePackage?.sha256===lifecycle.privatePackage?.sha256&&request.privatePackage?.logicalSha256===lifecycle.privatePackage?.logicalSha256);
check('BASELINE',request.expectedBaseline?.polizas===1373&&request.expectedBaseline?.recibosEsperados===1294&&request.expectedBaseline?.cobros===5&&request.expectedBaseline?.finmovs===0);
const cap=lifecycle.executionProfile?.capabilities||{};check('CAPABILITIES',cap.secrets===true&&cap.firestoreRead===true&&cap.writes===true&&cap.runtime===false&&cap.browser===false&&cap.deploy===false&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false&&request.capabilities?.writes===true&&request.capabilities?.deploy===false&&request.capabilities?.production===false);
check('WRITE_BOUNDARY',lifecycle.writeAuthorized===true&&lifecycle.commissionWritesAuthorized===true&&lifecycle.operationalWritesAllowed===15&&lifecycle.policyWritesAuthorized===false&&lifecycle.receiptWritesAuthorized===false&&lifecycle.cobroWritesAuthorized===false&&lifecycle.finmovWritesAuthorized===false&&lifecycle.cxcWritesAuthorized===false&&lifecycle.cxpWritesAuthorized===false&&lifecycle.advisorLiquidationWritesAuthorized===false);
check('VISUAL_BOUNDARY',request.crmVisualApproval?.clientes===true&&request.crmVisualApproval?.polizas===false&&request.crmVisualApproval?.vehiculos===false&&request.crmVisualApproval?.recibos===false&&request.crmVisualApproval?.cartera===false&&request.crmVisualApproval?.restoCrm===false&&lifecycle.crmVisualApproval?.approvalInferredFromThisWrite===false&&lifecycle.crmVisualApproval?.requiresSeparateHumanVisualization===true);
check('FINANCE_OFF',lifecycle.financeActivated===false);
check('WRITE_GUARDS',lifecycle.writeGateCondition?.requiresAtomicBatch===true&&lifecycle.writeGateCondition?.requiresIdempotency===true&&lifecycle.writeGateCondition?.requiresPostVerification===true&&lifecycle.writeGateCondition?.requiresRollbackOfExactDocuments===15&&lifecycle.writeGateCondition?.sellerLiquidationMustRemainBlocked===true&&lifecycle.writeGateCondition?.genericComisionesMustRemainUntouched===true&&lifecycle.writeGateCondition?.financeMustRemainInactive===true);
check('SANITIZATION',request.sanitization?.includeIds===false&&request.sanitization?.includePolicyNumbers===false&&request.sanitization?.includeAmounts===false&&request.sanitization?.includePII===false&&request.sanitization?.includeSourceRows===false&&request.sanitization?.includeSecrets===false);
const ok=failed.length===0;
const evidence={
  schemaVersion:'orbit360-planillas-comisiones-controlled-write-gate-preflight-v1',gateId:GATE,contractVersion:VERSION,
  status:ok?'GO_GATE_CONTRACT':'VALIDATOR_STALE',classification:ok?'PLANILLAS_COMMISSION_CONTROLLED_WRITE_READY':'PIPELINE_MECHANISM_FAILURE',
  canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_APPLY',phase:'CONTROLLED_WRITE_PLANILLAS_COMMISSION',requestState:'AUTHORIZED_ONCE',
  authorizationRef:AUTH_REF,privatePackageVerifiedByContract:ok,sourceRows:Number(lifecycle.sourceRowsObserved||0),
  policyReceiptRelations:Number(lifecycle.commissionDryrun?.exactPolicyReceiptRelations||0),destinationCollections:Number(lifecycle.commissionDryrunPlanner?.destinations?.length||0),
  executionAuthorized:ok,labWriteAuthorized:ok,writeEligible:ok?15:0,financeActivated:false,crmVisualApproval:request.crmVisualApproval||{},
  expectedBaseline:request.expectedBaseline||{},failed:failed.length,failedCheckIds:failed,dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,
  secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsIds:false,containsSourceRows:false,containsSecrets:false
};
save(evidence);console.log(JSON.stringify(evidence,null,2));process.exit(ok?0:41);
