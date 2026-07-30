#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730';
const VERSION='6.1.13';
const ROOT_CAUSE='tools/orbit360-m6-insurer-card-viewport-root-cause-v20260730.json';
const SMOKE='tools/orbit360-m6-product-browser-smoke-v20260730.mjs';
const WORKFLOW='.github/workflows/orbit360-m6-corrective-go-live-v20260730.yml';
const NEXT_LIFECYCLE='tools/orbit360-validator-lifecycle-contract-m6-recovery-6114-v20260730.json';
const NEXT_ENGINE='tools/orbit360-validar-gate-contracts-engine-m6-recovery-6114-v20260730.mjs';
const NEXT_REQUEST='tools/orbit360-m6-recovery-6114-request-v20260730.json';
const POLICY='orbit360-platform/core/tenant-access-policy-product-p0.js';
const APP='orbit360-platform/core/product-app-runtime-p0.js';
const STATIC_RUN=30549826785;
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
try{
  const rc=JSON.parse(read(ROOT_CAUSE));
  const smoke=read(SMOKE),workflow=read(WORKFLOW),policy=read(POLICY),app=read(APP);
  add('GATE',process.argv[2]===GATE&&rc.gateId===GATE);
  add('BRANCH',process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  add('ROOT_CAUSE',rc.sourceRun===30549026522&&rc.sourceArtifact===8762009928&&rc.classification==='VALIDATOR_STALE'&&rc.rootCause==='SEMANTIC_CARD_HITTEST_MISSING_SCROLL_INTO_VIEW');
  add('SAFE_ROLLBACK',rc.rollbackSafe===true&&rc.productionLive===false&&rc.evidence?.countsStable===true&&rc.evidence?.digestsStable===true&&rc.evidence?.firestoreDataWrites===0&&rc.evidence?.operationalWrites===0&&rc.evidence?.networkWriteCandidates===0&&rc.evidence?.rollbackExecuted===true);
  add('DATA_CONTRACT_PRESERVED',rc.evidence?.runtimeReadyReadOnly===true&&rc.evidence?.clients===414&&rc.evidence?.insurers===26&&rc.evidence?.queryAliasContractPass===true&&rc.evidence?.allActiveCollectionsReady===true&&rc.evidence?.writeGuardPass===true);
  add('FAILURE_PRECLICK_ONLY',rc.evidence?.cardCount===26&&rc.evidence?.geometryStable===true&&rc.evidence?.centerHit===false&&rc.evidence?.clickDispatched===false&&rc.evidence?.smokeFailureStage==='desktopDirection');
  add('VALIDATOR_ONLY_FIX',rc.fixScope?.validatorOnly===true&&rc.fixScope?.productModuleChanges===false&&rc.fixScope?.dataChanges===false&&rc.fixScope?.rulesChanges===false&&rc.fixScope?.authChanges===false);
  add('SMOKE_6114',smoke.includes("contractVersion:'6.1.14'")&&smoke.includes("validatorRevision:'20260730.6'")&&smoke.includes('scrollIntoView')&&smoke.includes("block:'center'")&&smoke.includes('centerInsideViewport')&&smoke.includes('hitDescriptor')&&smoke.includes('verifiedSemanticCardClick')&&smoke.includes("report.checks.insurerSemanticClick=true"));
  add('QUERY_ALIAS_PRESERVED',policy.includes("QUERY_FIELD_ALIASES = Object.freeze({ country: 'pais' })")&&policy.includes('productPhysicalFieldAliasesApplied = true'));
  add('ALL_COLLECTION_BARRIER_PRESERVED',app.includes('waitActiveCollections')&&app.includes("expected.every(function(name){return done.indexOf(name)>=0;})"));
  add('NEXT_CONTROL_PLANE_FILES',fs.existsSync(path.join(ROOT,NEXT_LIFECYCLE))&&fs.existsSync(path.join(ROOT,NEXT_ENGINE)));
  if(fs.existsSync(path.join(ROOT,NEXT_LIFECYCLE))){const life=JSON.parse(read(NEXT_LIFECYCLE));add('NEXT_LIFECYCLE',life.gateId===GATE&&life.gateContractVersion==='6.1.14'&&life.executionProfile?.phase==='M6_PRODUCT_GO_LIVE_RECOVERY_EXECUTION'&&life.staticValidatorRemediationRun===STATIC_RUN&&life.smokeValidatorRevision==='20260730.6'&&life.semanticInsurerCardClickRequired===true&&life.viewportHitTestRequired===true);}else add('NEXT_LIFECYCLE',false,'missing');
  add('WORKFLOW_6114',workflow.includes(NEXT_REQUEST)&&workflow.includes('recovery productivo 6.1.14')&&workflow.includes("contractVersion!=='6.1.14'")&&workflow.includes("smokeValidatorRevision!=='20260730.6'")&&workflow.includes('viewportHitTest'));
  add('STORAGE_DEFERRED',workflow.includes('firestore:rules,hosting')&&!workflow.includes('firestore:rules,storage,hosting'));
  add('NEXT_REQUEST_ABSENT',!fs.existsSync(path.join(ROOT,NEXT_REQUEST)));
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-insurer-viewport-static-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_SMOKE_VALIDATOR_REMEDIATION_STATIC',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,productFrozen:true,sourceRun:30549026522,sourceArtifact:8762009928,rootCause:'SEMANTIC_CARD_HITTEST_MISSING_SCROLL_INTO_VIEW',staticValidatorRemediationRun:STATIC_RUN,nextSmokeValidatorRevision:'20260730.6',nextRecoveryContractVersion:'6.1.14',storageDeferredFailClosed:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-insurer-viewport-static-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'VALIDATOR_STALE',failed:1,failedCheckIds:['M6_INSURER_VIEWPORT_STATIC_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),productFrozen:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
