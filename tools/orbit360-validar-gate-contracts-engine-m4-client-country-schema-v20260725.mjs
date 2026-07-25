#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE='block4-client-country-schema-readonly-v20260725',OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m4-client-country-schema-v20260725.json',registry:'tools/orbit360-gate-contract-registry-extension-m4-client-country-schema-v20260725.json',overlay:'tools/orbit360-gate-contract-overlay-m4-client-country-schema-v20260725.json',freeze:'tools/orbit360-m4-client-country-schema-freeze-v20260725.json',authorization:'tools/orbit360-m4-client-country-schema-authorization-v20260725.json',request:'tools/orbit360-m4-client-country-schema-request-v20260725.json',contract:'orbit360-platform/core/m4-client-country-schema-contract-p0.js',runtime:'tools/orbit360-m4-client-country-schema-v20260725.mjs',test:'tools/orbit360-m4-client-country-schema-contract-v20260725.cjs',workflow:'.github/workflows/orbit360-m4-client-country-schema-gate-v20260725.yml',baseline:'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json'};
const checks=[];function add(id,ok,detail=''){checks.push({id,ok:!!ok,detail});}function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}function json(rel){return JSON.parse(read(rel));}
Object.entries(files).forEach(([k,v])=>add('FILE:'+k,fs.existsSync(path.join(ROOT,v)),v));
try{
 const l=json(files.lifecycle),a=json(files.authorization),r=json(files.registry),o=json(files.overlay),f=json(files.freeze),q=json(files.request),b=json(files.baseline),runtime=read(files.runtime),workflow=read(files.workflow),contract=read(files.contract),test=read(files.test);
 add('GATE',l.gateId===GATE&&r.gates[0].gateId===GATE&&o.gateId===GATE&&f.gateId===GATE&&q.gateId===GATE);
 add('VERSION',l.gateContractVersion==='4.2.2'&&r.gates[0].contractVersion==='4.2.2'&&o.contractVersion==='4.2.2'&&f.contractVersion==='4.2.2'&&q.contractVersion==='4.2.2');
 add('PHASE',l.executionProfile.phase==='M4_CLIENT_COUNTRY_SCHEMA_AUDIT_EXECUTION');
 const c=l.executionProfile.capabilities;add('CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===true&&c.browser===false&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
 add('BASELINE',b.dryRunClosure.requiresValidation===65&&b.dryRunClosure.issues.clientsMissingCurrency===61);
 add('AUTH',a.explicitAuthorization===true&&a.allowedExecutions===1&&a.schemaAuditReadOnly===true&&a.sourceCollection==='tenantId/{tenant}/clientes');
 add('REQUEST',q.explicitAuthorization===true&&q.allowedExecutions===1&&q.schemaAuditReadOnly===true&&!!q.authorizedBaseCommit);
 add('PRIVACY',a.privacyMode==='field_names_and_counts_only'&&a.valuesExported===false&&q.privacyMode==='field_names_and_counts_only'&&q.valuesExported===false);
 add('ONE_COLLECTION',a.insurersRead===false&&a.targetRead===false&&q.insurersRead===false&&q.targetRead===false);
 add('NO_WRITES',a.operationalWrites===false&&a.clientWrites===false&&a.insurerWrites===false&&q.operationalWrites===false&&q.clientWrites===false&&q.insurerWrites===false);
 add('RUNTIME_SOURCE_ONLY',runtime.includes("legacy.collection('clientes').get()")&&!runtime.includes("collection('aseguradoras')")&&!runtime.includes("collection('data')"));
 add('RUNTIME_PRIVACY',runtime.includes("privacyMode:'field_names_and_counts_only'")&&runtime.includes('valuesExported:false')&&!runtime.includes('sampleValues'));
 const unsafeRuntime=runtime.split('\n').filter(line=>!line.includes('counts.set(')).some(line=>/\.(set|create|update|delete|commit)\s*\(/.test(line)||/\b(runTransaction|bulkWriter|writeBatch)\b/.test(line));add('RUNTIME_NO_FIRESTORE_WRITES',!unsafeRuntime);
 add('CONTRACT_SCOPE',contract.includes('collection_scope_invalid')&&contract.includes('schema_audit_contract_required'));
 add('TEST_12',test.includes("t('NO_INSURERS'")&&test.includes("t('NO_TARGET'")&&test.includes("t('VERSION'"));
 add('WORKFLOW_TRIGGER',workflow.includes('orbit360-m4-client-country-schema-request-v20260725.json'));
 add('WORKFLOW_PREFLIGHT_FIRST',workflow.indexOf('Preflight canónico')<workflow.indexOf('Resolver cuenta existente'));
 add('WORKFLOW_NO_WRITES',!/(firebase deploy|gcloud firestore|\.set\(|\.update\(|\.delete\()/i.test(workflow));
}catch(e){add('CONTRACT_PARSE',false,String(e.message||e));}
const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-gate-contract-preflight-m4-client-country-schema-v1',gateId:GATE,contractVersion:'4.2.2',executionPhase:'M4_CLIENT_COUNTRY_SCHEMA_AUDIT_EXECUTION',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:true,allowedExecutions:1,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,operationalWrites:0,clientWrites:0,insurerWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
