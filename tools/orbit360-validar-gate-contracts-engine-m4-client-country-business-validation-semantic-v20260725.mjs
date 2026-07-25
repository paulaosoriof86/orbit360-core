#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const ROOT=process.cwd(),GATE='block4-client-country-business-validation-semantic-repair-static-v20260725',OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const files={
 lifecycle:'tools/orbit360-validator-lifecycle-contract-m4-client-country-business-validation-semantic-v20260725.json',
 registry:'tools/orbit360-gate-contract-registry-extension-m4-client-country-business-validation-semantic-v20260725.json',
 overlay:'tools/orbit360-gate-contract-overlay-m4-client-country-business-validation-semantic-v20260725.json',
 freeze:'tools/orbit360-m4-client-country-business-validation-semantic-freeze-v20260725.json',
 authorization:'tools/orbit360-m4-client-country-business-validation-semantic-authorization-v20260725.json',
 contract:'orbit360-platform/core/m4-client-country-business-validation-semantic-contract-p0.js',
 test:'tools/orbit360-m4-client-country-business-validation-semantic-contract-v20260725.cjs',
 countryClosure:'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-values-closure.json',
 durableClosure:'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json',
 academy:'orbit360-platform/data/academia-m4-client-country-business-validation-semantic-v20260725.js'
};
const checks=[];function add(id,ok,detail=''){checks.push({id,ok:!!ok,detail});}function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}function json(rel){return JSON.parse(read(rel));}
Object.entries(files).forEach(([k,v])=>add('FILE:'+k,fs.existsSync(path.join(ROOT,v)),v));
try{
 const l=json(files.lifecycle),r=json(files.registry),o=json(files.overlay),f=json(files.freeze),a=json(files.authorization),country=json(files.countryClosure),durable=json(files.durableClosure);
 add('GATE',l.gateId===GATE&&r.gates[0].gateId===GATE&&o.gateId===GATE&&f.gateId===GATE&&a.gateId===GATE);
 add('VERSION',l.gateContractVersion==='4.2.5'&&r.gates[0].contractVersion==='4.2.5'&&o.contractVersion==='4.2.5'&&f.contractVersion==='4.2.5'&&a.contractVersion==='4.2.5');
 add('PHASE',l.executionProfile.phase==='M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_SEMANTIC_REPAIR_STATIC');
 const c=l.executionProfile.capabilities;add('CAPABILITIES',Object.values(c).every(v=>v===false));
 add('AUTH_PUBLICATION_ONLY',a.explicitAuthorization===true&&a.staticRepairPackagePublicationAuthorized===true&&a.staticGateExecutionAuthorized===false&&a.allowedExecutions===0&&a.requestCreated===false&&a.secrets===false&&a.firestoreRead===false&&a.runtime===false&&a.writes===false);
 add('VALIDATION_MODE',l.validationBoundary.mode==='executed_contract_fixtures'&&l.validationBoundary.literalSourceInspection===false&&r.gates[0].literalSourceInspection===false);
 add('COUNTRY_BASELINE',country.status==='M4_CLIENT_COUNTRY_VALUES_AUDIT_COMPLETED_DATA_CONTRACT_FAILURE_CONFIRMED'&&country.distribution?.nonCanonical===61);
 add('DURABLE_BASELINE',durable.status==='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED'&&durable.dryRunClosure?.issues?.clientTargetOnly===2&&durable.dryRunClosure?.issues?.insurerTargetOnly===2);
 const run=spawnSync(process.execPath,[files.test],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
 add('FIXTURE_PROCESS',run.status===0,(run.stderr||'').slice(0,240));
 const summaryPath='orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-business-validation-semantic-contract-summary.json';
 add('FIXTURE_SUMMARY_FILE',fs.existsSync(path.join(ROOT,summaryPath)),summaryPath);
 if(fs.existsSync(path.join(ROOT,summaryPath))){
   const s=json(summaryPath);
   add('FIXTURE_SUMMARY_PASS',s.status==='PASS'&&s.failed===0&&s.total>=15);
   add('SEMANTIC_EXECUTION',s.validationMode==='executed_contract_fixtures'&&s.literalSourceInspection===false);
   add('POSITIVE_NEGATIVE',s.positiveFixtures>=5&&s.negativeFixtures>=10);
   add('COMPOSED_BASELINE',s.composedBaseline?.clientTargetOnly===2&&s.composedBaseline?.insurerTargetOnly===2&&s.composedBaseline?.targetOnlyDeferred===4);
   add('PROPOSAL',s.proposal?.records===61&&s.proposal?.country==='GT'&&s.proposal?.currency==='GTQ'&&s.proposal?.targetOnlyDeferred===4);
   add('WRITE_BOUNDARY',s.approvalReadyForCorrectionDryRun===true&&s.approvalReadyForM4Write===false);
 }
}catch(error){add('SEMANTIC_PREFLIGHT_EXCEPTION',false,String(error&&error.message||error));}
const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-gate-contract-preflight-m4-client-country-business-validation-semantic-v1',gateId:GATE,contractVersion:'4.2.5',executionPhase:'M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_SEMANTIC_REPAIR_STATIC',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,validationMode:'executed_contract_fixtures',literalSourceInspection:false,packagePublicationAuthorized:true,executionAuthorized:false,allowedExecutions:0,requestCreated:false,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,operationalWrites:0,clientWrites:0,insurerWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
