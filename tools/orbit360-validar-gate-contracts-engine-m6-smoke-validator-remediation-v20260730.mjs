#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block6-go-live-product-v20260730';
const VERSION='6.1.5';
const SMOKE='tools/orbit360-m6-product-browser-smoke-v20260730.mjs';
const ROOT_CAUSE='tools/orbit360-m6-smoke-validator-root-cause-v20260730.json';
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');}
try{
  const rc=JSON.parse(read(ROOT_CAUSE));
  const smoke=read(SMOKE);
  add('GATE',process.argv[2]===GATE&&rc.gateId===GATE);
  add('BRANCH',process.env.ORBIT360_BRANCH==='ays/backend-tenant-lab-v99-20260703');
  add('ROOT_CAUSE',rc.sourceRun===30519954902&&rc.sourceArtifact===8750370291&&rc.classification==='VALIDATOR_STALE'&&rc.rootCause==='PLAYWRIGHT_WAITFORFUNCTION_OPTIONS_PASSED_AS_ARG'&&rc.observedTimeoutMs===30000&&rc.intendedTimeoutMs===60000);
  add('SAFE_ROLLBACK',rc.rollbackStatus==='success'&&rc.rollbackReadinessStatus==='M6_HOSTING_READINESS_PASS'&&rc.remoteFailClosed===true&&rc.productionLive===false&&rc.countsStable===true&&rc.digestsStable===true&&rc.firestoreDataWrites===0&&rc.operationalWrites===0);
  add('STORAGE_DEFERRED',rc.storageDeferredFailClosed===true);
  execFileSync(process.execPath,['--check',SMOKE],{cwd:ROOT,stdio:'pipe'});
  add('SYNTAX',true);
  add('SMOKE_VERSION',smoke.includes("schemaVersion:'orbit360-m6-product-browser-smoke-v2'")&&smoke.includes("contractVersion:'6.1.6'")&&smoke.includes("validatorRevision:'20260730.2'"));
  add('PLAYWRIGHT_SIGNATURE_FIXED',smoke.includes("isStarted()===true,undefined,{timeout:60000,polling:100}")&&!smoke.includes("isStarted()===true,{timeout:60000,polling:100}"));
  add('LOGIN_DIAGNOSTICS',smoke.includes('loginDiagnostics')&&smoke.includes('productStarted')&&smoke.includes('productStatus')&&smoke.includes('storeReady')&&smoke.includes('noFallback')&&smoke.includes('writeEnabled'));
  add('WRITE_GUARD_PRESERVED',smoke.includes('WRITE_BLOCKED_PRODUCT_READ_ONLY_P0')&&smoke.includes('networkWriteCandidates')&&smoke.includes('firestoreWrites:0')&&smoke.includes('operationalWrites:0'));
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-gate-contract-preflight-m6-smoke-validator-remediation-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M6_PRODUCT_SMOKE_VALIDATOR_REMEDIATION_STATIC',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'VALIDATOR_STALE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,productFrozen:true,sourceRun:30519954902,sourceArtifact:8750370291,rootCause:'PLAYWRIGHT_WAITFORFUNCTION_OPTIONS_PASSED_AS_ARG',smokeValidatorRevision:'20260730.2',nextRecoveryContractVersion:'6.1.6',productRemoteFailClosed:true,storageDeferredFailClosed:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){write({schemaVersion:'orbit360-gate-contract-preflight-m6-smoke-validator-remediation-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'VALIDATOR_STALE',failed:1,failedCheckIds:['M6_SMOKE_VALIDATOR_REMEDIATION_EXCEPTION'],error:String(error&&error.message||error).slice(0,500),productFrozen:true,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);}
