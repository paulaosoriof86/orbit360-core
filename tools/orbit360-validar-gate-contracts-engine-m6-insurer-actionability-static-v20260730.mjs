#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730';
const VERSION='6.1.11';
const ROOT_CAUSE='tools/orbit360-m6-insurer-card-actionability-root-cause-v20260730.json';
const MODULE='orbit360-platform/modules/aseguradoras.js';
const CSS='orbit360-platform/styles/v1197-empalme.css';
const NEXT_REQUEST='tools/orbit360-m6-recovery-6112-request-v20260730.json';
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
try{
  const rc=JSON.parse(read(ROOT_CAUSE)),mod=read(MODULE),css=read(CSS);
  add('GATE',process.argv[2]===GATE&&rc.gateId===GATE);
  add('BRANCH',process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  add('ROOT_CAUSE',rc.sourceRun===30546548132&&rc.sourceArtifact===8761009923&&rc.classification==='VALIDATOR_STALE'&&rc.rootCause==='PLAYWRIGHT_CARD_ACTIONABILITY_STABILITY_FALSE_NEGATIVE');
  add('SAFE_ROLLBACK',rc.rollbackSafe===true&&rc.productionLive===false&&rc.evidence?.countsStable===true&&rc.evidence?.digestsStable===true&&rc.evidence?.firestoreDataWrites===0&&rc.evidence?.operationalWrites===0&&rc.evidence?.networkWriteCandidates===0);
  add('DATA_CONTRACT_PRESERVED',rc.evidence?.runtimeReadyReadOnly===true&&rc.evidence?.clients===414&&rc.evidence?.insurers===26&&rc.evidence?.queryAliasContractPass===true&&rc.evidence?.allActiveCollectionsReady===true&&rc.evidence?.writeGuardPass===true);
  add('CLICK_HANDLER_PRESENT',mod.includes("host.querySelectorAll('[data-asg]').forEach")&&mod.includes('ficha(el.dataset.asg)')&&mod.includes('function ficha(id, startEdit)'));
  add('APPROVED_VISUAL_MOTION_PRESENT',css.includes('.asg-card:hover')&&css.includes('transform:translateY(-1px)')&&css.includes('transition:border-color .15s,box-shadow .15s,transform .15s'));
  add('VALIDATOR_ONLY_FIX',rc.fixScope?.validatorOnly===true&&rc.fixScope?.productModuleChanges===false&&rc.fixScope?.dataChanges===false&&rc.fixScope?.rulesChanges===false&&rc.fixScope?.authChanges===false);
  add('NEXT_REQUEST_ABSENT',!fs.existsSync(path.join(ROOT,NEXT_REQUEST)));
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-insurer-actionability-static-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_SMOKE_VALIDATOR_REMEDIATION_STATIC',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,productFrozen:true,sourceRun:30546548132,sourceArtifact:8761009923,rootCause:'PLAYWRIGHT_CARD_ACTIONABILITY_STABILITY_FALSE_NEGATIVE',nextSmokeValidatorRevision:'20260730.5',nextRecoveryContractVersion:'6.1.12',storageDeferredFailClosed:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-insurer-actionability-static-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'VALIDATOR_STALE',failed:1,failedCheckIds:['M6_INSURER_ACTIONABILITY_STATIC_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),productFrozen:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
