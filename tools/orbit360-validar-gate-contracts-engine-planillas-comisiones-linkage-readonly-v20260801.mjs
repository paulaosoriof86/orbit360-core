#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE='block11-planillas-comisiones-linkage-readonly-v20260801';
const VERSION='11.0.0';
const gateId=process.argv[2]||'';
const lifecycleRel='tools/orbit360-validator-lifecycle-contract-planillas-comisiones-linkage-readonly-v20260801.json';
const evidenceRel='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const evidencePath=path.join(ROOT,evidenceRel);
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const save=payload=>{fs.mkdirSync(path.dirname(evidencePath),{recursive:true});fs.writeFileSync(evidencePath,JSON.stringify(payload,null,2)+'\n','utf8');};
const failed=[];const check=(id,ok)=>{if(!ok)failed.push(id);};
let lifecycle={};try{lifecycle=read(lifecycleRel);}catch(error){failed.push('CONTRACT_FILE_READ');}
check('GATE_ID',gateId===GATE&&lifecycle.gateId===GATE);
check('VERSION',lifecycle.gateContractVersion===VERSION);
check('LIFECYCLE_REVISION',lifecycle.validatorLifecycleRevision==='phase-capability-contract-v1');
check('STATUS',lifecycle.status==='PLANILLAS_COMMISSION_CONTROLLED_WRITE_CLOSED');
check('MODE',lifecycle.executionProfile?.mode==='CONTROLLED_WRITE_PLANILLAS_COMMISSION_CLOSED');
check('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
const cap=lifecycle.executionProfile?.capabilities||{};
check('CAPABILITIES',cap.secrets===true&&cap.firestoreRead===true&&cap.writes===false&&cap.runtime===false&&cap.browser===false&&cap.deploy===false&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false);
check('AUTH_CONSUMED',lifecycle.authorization?.consumed===true&&lifecycle.authorization?.consumedByRun===30722653179);
check('WRITE_RESULT',lifecycle.controlledWrite?.run===30722653179&&lifecycle.controlledWrite?.job===91428836213&&lifecycle.controlledWrite?.artifact===8825344683&&lifecycle.controlledWrite?.status==='WRITE_PASS'&&lifecycle.controlledWrite?.atomicCommit===true&&lifecycle.controlledWrite?.createdDocuments===15&&lifecycle.controlledWrite?.verifiedDocuments===15&&lifecycle.controlledWrite?.rollbackExecuted===false&&lifecycle.controlledWrite?.closed===true);
check('TARGET_COUNTS',lifecycle.controlledWrite?.targetBefore?.planillasComisiones===0&&lifecycle.controlledWrite?.targetBefore?.comisionesDevengadas===0&&lifecycle.controlledWrite?.targetBefore?.conciliacionesComisiones===0&&lifecycle.controlledWrite?.targetAfter?.planillasComisiones===5&&lifecycle.controlledWrite?.targetAfter?.comisionesDevengadas===5&&lifecycle.controlledWrite?.targetAfter?.conciliacionesComisiones===5);
check('BASELINE',lifecycle.baseline?.polizas===1373&&lifecycle.baseline?.recibosEsperados===1294&&lifecycle.baseline?.cobros===5&&lifecycle.baseline?.finmovs===0&&lifecycle.baseline?.unchangedByCommissionWrite===true);
check('SELLER_HOLDS',lifecycle.sellerHoldLedger?.HOLD_SELLER_ALIAS_NOT_CONFIGURED===3&&lifecycle.sellerHoldLedger?.liquidationAuthorized===false&&lifecycle.sellerHoldLedger?.defaultPercentageApplied===false);
check('VISUAL_BOUNDARY',lifecycle.crmVisualApproval?.clientes===true&&lifecycle.crmVisualApproval?.polizas===false&&lifecycle.crmVisualApproval?.vehiculos===false&&lifecycle.crmVisualApproval?.recibos===false&&lifecycle.crmVisualApproval?.cartera===false&&lifecycle.crmVisualApproval?.restoCrm===false&&lifecycle.crmVisualApproval?.approvalInferredFromThisWrite===false&&lifecycle.crmVisualApproval?.requiresSeparateHumanVisualization===true);
check('NO_MORE_WRITES',lifecycle.writeAuthorized===false&&lifecycle.commissionWritesAuthorized===false&&lifecycle.finmovWritesAuthorized===false&&lifecycle.cxcWritesAuthorized===false&&lifecycle.cxpWritesAuthorized===false&&lifecycle.advisorLiquidationWritesAuthorized===false&&lifecycle.policyWritesAuthorized===false&&lifecycle.receiptWritesAuthorized===false&&lifecycle.cobroWritesAuthorized===false&&lifecycle.operationalWritesAllowed===0);
check('SECURITY',lifecycle.security?.requestSemanticallyConsumed===true&&lifecycle.security?.requestReplayBlocked===true&&lifecycle.security?.singleAtomicTransactionUsed===true&&lifecycle.security?.genericComisionesUntouched===true&&lifecycle.security?.visualApprovalBoundaryPreserved===true&&lifecycle.security?.deployExecuted===false&&lifecycle.security?.productionTouched===false);
check('NEXT',lifecycle.nextGateCondition?.additionalCommissionWriteRequiresNewAuthorization===true&&lifecycle.nextGateCondition?.sellerLiquidationsRemainBlocked===3&&lifecycle.nextGateCondition?.policiesAndOtherCrmRequireHumanVisualization===true&&lifecycle.nextGateCondition?.noAutomaticAdvanceToNextCrmModule===true);
const ok=failed.length===0;
const evidence={
  schemaVersion:'orbit360-planillas-comisiones-controlled-write-closure-preflight-v1',gateId:GATE,contractVersion:VERSION,
  status:ok?'GO_GATE_CONTRACT':'VALIDATOR_STALE',classification:ok?'PLANILLAS_COMMISSION_CONTROLLED_WRITE_CLOSED':'PIPELINE_MECHANISM_FAILURE',
  canonicalPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',phase:'CONTROLLED_WRITE_PLANILLAS_COMMISSION_CLOSED',requestState:'CONSUMED_AND_REPLAY_BLOCKED',
  controlledWriteRun:Number(lifecycle.controlledWrite?.run||0),createdDocuments:Number(lifecycle.controlledWrite?.createdDocuments||0),verifiedDocuments:Number(lifecycle.controlledWrite?.verifiedDocuments||0),
  targetCounts:lifecycle.controlledWrite?.targetAfter||{},baseline:lifecycle.baseline||{},crmVisualApproval:lifecycle.crmVisualApproval||{},
  executionAuthorized:false,labWriteAuthorized:false,writeEligible:0,financeActivated:false,failed:failed.length,failedCheckIds:failed,
  dataAccess:false,secretAccess:false,operationalWrites:0,evidenceWrites:1,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,
  containsPII:false,containsPolicyNumbers:false,containsAmounts:false,containsIds:false,containsSourceRows:false,containsSecrets:false
};
save(evidence);console.log(JSON.stringify(evidence,null,2));process.exit(ok?0:41);
