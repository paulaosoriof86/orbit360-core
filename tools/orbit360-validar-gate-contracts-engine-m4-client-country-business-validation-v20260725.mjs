#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const GATE = 'block4-client-country-business-validation-dryrun-v20260725';
const OUT = path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const files = {
  lifecycle:'tools/orbit360-validator-lifecycle-contract-m4-client-country-business-validation-v20260725.json',
  registry:'tools/orbit360-gate-contract-registry-extension-m4-client-country-business-validation-v20260725.json',
  overlay:'tools/orbit360-gate-contract-overlay-m4-client-country-business-validation-v20260725.json',
  freeze:'tools/orbit360-m4-client-country-business-validation-freeze-v20260725.json',
  authorization:'tools/orbit360-m4-client-country-business-validation-authorization-v20260725.json',
  request:'tools/orbit360-m4-client-country-business-validation-request-v20260725.json',
  contract:'orbit360-platform/core/m4-client-country-business-validation-contract-p0.js',
  runtime:'tools/orbit360-m4-client-country-business-validation-v20260725.mjs',
  test:'tools/orbit360-m4-client-country-business-validation-contract-v20260725.cjs',
  workflow:'.github/workflows/orbit360-m4-client-country-business-validation-gate-v20260725.yml',
  baseline:'orbit360-platform/runtime-gate-crm-v20260716/m4-client-country-values-closure.json'
};
const checks = [];
function add(id,ok,detail=''){ checks.push({id,ok:!!ok,detail}); }
function read(rel){ return fs.readFileSync(path.join(ROOT,rel),'utf8'); }
function json(rel){ return JSON.parse(read(rel)); }
Object.entries(files).forEach(([key,value]) => add('FILE:'+key,fs.existsSync(path.join(ROOT,value)),value));
try{
  const l=json(files.lifecycle),a=json(files.authorization),r=json(files.registry),o=json(files.overlay),f=json(files.freeze),q=json(files.request),b=json(files.baseline);
  const runtime=read(files.runtime),workflow=read(files.workflow),contract=read(files.contract),test=read(files.test);
  add('GATE',l.gateId===GATE&&r.gates[0].gateId===GATE&&o.gateId===GATE&&f.gateId===GATE&&q.gateId===GATE);
  add('VERSION',l.gateContractVersion==='4.2.4'&&r.gates[0].contractVersion==='4.2.4'&&o.contractVersion==='4.2.4'&&f.contractVersion==='4.2.4'&&q.contractVersion==='4.2.4');
  add('PHASE',l.executionProfile.phase==='M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_DRYRUN_EXECUTION');
  const c=l.executionProfile.capabilities;
  add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===true&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
  add('BASELINE',b.distribution?.nonCanonical===61&&b.targetOnlyDeferred===4);
  add('AUTH',a.explicitAuthorization===true&&a.allowedExecutions===1&&a.correctionDryRunReadOnly===true&&a.businessValidationAll61Guatemala===true);
  add('REQUEST',q.explicitAuthorization===true&&q.allowedExecutions===1&&q.correctionDryRunReadOnly===true&&q.businessValidationAll61Guatemala===true&&!!q.authorizedBaseCommit);
  add('PROPOSAL',a.proposedCountry==='GT'&&a.proposedCurrency==='GTQ'&&q.proposedCountry==='GT'&&q.proposedCurrency==='GTQ');
  add('PRIVACY',a.privacyMode==='aggregate_proposal_only'&&a.rawValuesExported===false&&q.rawValuesExported===false);
  add('ONE_COLLECTION',a.insurersRead===false&&a.targetRead===false&&q.insurersRead===false&&q.targetRead===false);
  add('NO_WRITES',a.operationalWrites===false&&a.clientWrites===false&&q.operationalWrites===false&&q.clientWrites===false);
  add('RUNTIME_SOURCE_ONLY',runtime.includes("legacy.collection('clientes').get()")&&!runtime.includes("collection('aseguradoras')")&&!runtime.includes("collection('data')"));
  add('RUNTIME_PROPOSAL',runtime.includes("country:'GT'")&&runtime.includes("currency:'GTQ'")&&runtime.includes('targetOnlyDeferred:4'));
  const unsafe=runtime.split('\n').some(line=>/\.(set|create|update|delete|commit)\s*\(/.test(line)||/\b(runTransaction|bulkWriter|writeBatch)\b/.test(line));
  add('RUNTIME_NO_FIRESTORE_WRITES',!unsafe);
  add('RUNTIME_NO_RAW_EXPORT',!runtime.includes('sampleValues')&&!runtime.includes('recordIds:'));
  add('CONTRACT_SCOPE',contract.includes('proposal_61_gt_gtq_required')&&contract.includes('rollback_required'));
  add('TEST_14',test.includes("t('M4_WRITE_BLOCKED'")&&test.includes("t('TARGET_ONLY'"));
  add('WORKFLOW_TRIGGER',workflow.includes('orbit360-m4-client-country-business-validation-request-v20260725.json'));
  add('WORKFLOW_PREFLIGHT_FIRST',workflow.indexOf('Preflight canónico')<workflow.indexOf('Resolver cuenta existente'));
  add('WORKFLOW_NO_WRITES',!/(firebase deploy|gcloud firestore|\.set\(|\.update\(|\.delete\()/i.test(workflow));
}catch(error){
  add('CONTRACT_PARSE',false,String(error.message||error));
}
const failed=checks.filter(item=>!item.ok);
const out={schemaVersion:'orbit360-gate-contract-preflight-m4-client-country-business-validation-v1',gateId:GATE,contractVersion:'4.2.4',executionPhase:'M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_DRYRUN_EXECUTION',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,executionAuthorized:true,allowedExecutions:1,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,operationalWrites:0,clientWrites:0,insurerWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
if(failed.length) process.exit(41);
