#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE='block4-client-country-values-readonly-v20260725',OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m4-client-country-values-v20260725.json',registry:'tools/orbit360-gate-contract-registry-extension-m4-client-country-values-v20260725.json',overlay:'tools/orbit360-gate-contract-overlay-m4-client-country-values-v20260725.json',freeze:'tools/orbit360-m4-client-country-values-freeze-v20260725.json',authorization:'tools/orbit360-m4-client-country-values-authorization-v20260725.json',request:'tools/orbit360-m4-client-country-values-request-v20260725.json',contract:'orbit360-platform/core/m4-client-country-values-contract-p0.js',runtime:'tools/orbit360-m4-client-country-values-v20260725.mjs',test:'tools/orbit360-m4-client-country-values-contract-v20260725.cjs',workflow:'.github/workflows/orbit360-m4-client-country-values-gate-v20260725.yml',baseline:'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json'};
const checks=[];function add(id,ok,detail=''){checks.push({id,ok:!!ok,detail});}function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}function json(rel){return JSON.parse(read(rel));}
Object.entries(files).forEach(([k,v])=>add('FILE:'+k,fs.existsSync(path.join(ROOT,v)),v));
try{
 const l=json(files.lifecycle),a=json(files.authorization),r=json(files.registry),o=json(files.overlay),f=json(files.freeze),q=json(files.request),b=json(files.baseline),runtime=read(files.runtime),workflow=read(files.workflow),contract=read(files.contract),test=read(files.test);
 add('GATE',l.gateId===GATE&&r.gates[0].gateId===GATE&&o.gateId===GATE&&f.gateId===GATE&&q.gateId===GATE);
 add('VERSION',l.gateContractVersion==='4.2.3'&&r.gates[0].contractVersion==='4.2.3'&&o.contractVersion==='4.2.3'&&f.contractVersion==='4.2.3'&&q.contractVersion==='4.2.3');
 add('PHASE',l.executionProfile.phase==='M4_CLIENT_COUNTRY_VALUES_AUDIT_EXECUTION');
 const c=l.executionProfile.capabilities;add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===true&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
 add('BASELINE',b.dryRunClosure.issues.clientsMissingCurrency===61&&f.previousGate.runId===30161619900);
 add('AUTH',a.explicitAuthorization===true&&a.allowedExecutions===1&&a.valueAuditReadOnly===true&&a.sourceCollection==='tenantId/{tenant}/clientes');
 add('REQUEST',q.explicitAuthorization===true&&q.allowedExecutions===1&&q.valueAuditReadOnly===true&&!!q.authorizedBaseCommit);
 add('PRIVACY',a.privacyMode==='aggregate_categories_only'&&a.rawValuesExported===false&&a.individualRecordsExported===false&&q.privacyMode==='aggregate_categories_only'&&q.rawValuesExported===false&&q.individualRecordsExported===false);
 add('ONE_COLLECTION',a.insurersRead===false&&a.targetRead===false&&q.insurersRead===false&&q.targetRead===false);
 add('NO_WRITES',a.operationalWrites===false&&a.clientWrites===false&&a.insurerWrites===false&&q.operationalWrites===false&&q.clientWrites===false&&q.insurerWrites===false);
 add('RUNTIME_SOURCE_ONLY',runtime.includes("legacy.collection('clientes').get()")&&!runtime.includes("collection('aseguradoras')")&&!runtime.includes("collection('data')"));
 add('RUNTIME_AGGREGATE_ONLY',runtime.includes("privacyMode:'aggregate_categories_only'")&&runtime.includes('rawValuesExported:false')&&runtime.includes('individualRecordsExported:false')&&!/sampleValues|rawValues\s*[:=]|documentIds|clientIds/.test(runtime));
 add('NO_PHONE_INFERENCE',!runtime.includes("'502'")&&!runtime.includes("'57'")&&!runtime.includes('paisFuente')&&!runtime.includes('departamentoProvincia'));
 const unsafeRuntime=runtime.some?false:runtime.split('\n').some(line=>/\.(set|create|update|delete|commit)\s*\(/.test(line)||/\b(runTransaction|bulkWriter|writeBatch)\b/.test(line));add('RUNTIME_NO_FIRESTORE_WRITES',!unsafeRuntime);
 add('CONTRACT_SCOPE',contract.includes('distribution_balance_invalid')&&contract.includes('individual_or_raw_data_forbidden'));
 add('TEST_14',test.includes("t('RAW_BLOCKED'")&&test.includes("t('NO_INSURERS'")&&test.includes("t('VERSION'"));
 add('WORKFLOW_TRIGGER',workflow.includes('orbit360-m4-client-country-values-request-v20260725.json'));
 add('WORKFLOW_PREFLIGHT_FIRST',workflow.indexOf('Preflight canónico')<workflow.indexOf('Resolver cuenta existente'));
 add('WORKFLOW_NO_WRITES',!/(firebase deploy|gcloud firestore|\.set\(|\.update\(|\.delete\()/i.test(workflow));
}catch(e){add('CONTRACT_PARSE',false,String(e.message||e));}
const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-gate-contract-preflight-m4-client-country-values-v1',gateId:GATE,contractVersion:'4.2.3',executionPhase:'M4_CLIENT_COUNTRY_VALUES_AUDIT_EXECUTION',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:true,allowedExecutions:1,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,operationalWrites:0,clientWrites:0,insurerWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
