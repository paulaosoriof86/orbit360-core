#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),GATE='block4-data-reconciliation-readonly-v20260725',OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m4-reconciliation-v20260725.json',registry:'tools/orbit360-gate-contract-registry-extension-m4-reconciliation-v20260725.json',overlay:'tools/orbit360-gate-contract-overlay-m4-reconciliation-v20260725.json',freeze:'tools/orbit360-m4-data-reconciliation-freeze-v20260725.json',authorization:'tools/orbit360-m4-data-reconciliation-authorization-v20260725.json',contract:'orbit360-platform/core/m4-data-reconciliation-contract-p0.js',runtime:'tools/orbit360-m4-data-reconciliation-v20260725.mjs',test:'tools/orbit360-m4-data-reconciliation-contract-v20260725.cjs',sourceAudit:'orbit360-platform/runtime-gate-crm-v20260716/m4-data-reconciliation-static-source-audit.json',baseline:'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json'};
const checks=[];function add(id,ok,detail=''){checks.push({id,ok:!!ok,detail});}function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}function json(rel){return JSON.parse(read(rel));}
Object.entries(files).forEach(([k,v])=>add('FILE:'+k,fs.existsSync(path.join(ROOT,v)),v));
try{
 const l=json(files.lifecycle),a=json(files.authorization),r=json(files.registry),o=json(files.overlay),f=json(files.freeze),s=json(files.sourceAudit),b=json(files.baseline),runtime=read(files.runtime),contract=read(files.contract),test=read(files.test);
 add('GATE',l.gateId===GATE&&r.gates[0].gateId===GATE&&o.gateId===GATE&&f.gateId===GATE);
 add('VERSION',l.gateContractVersion==='4.2.1'&&r.gates[0].contractVersion==='4.2.1'&&o.contractVersion==='4.2.1'&&f.contractVersion==='4.2.1');
 add('PHASE',l.executionProfile.phase==='M4_DATA_RECONCILIATION_STATIC_REPAIR_READY');
 const c=l.executionProfile.capabilities;add('CAPABILITIES_ZERO',Object.values(c).every(v=>v===false));
 add('BASELINE',b.dryRunClosure.requiresValidation===65&&b.dryRunClosure.issues.clientsMissingCurrency===61);
 add('AUTH_CONSUMED',a.explicitAuthorization===false&&a.allowedExecutions===0&&a.requestConsumed===true&&a.newRuntimeExecutionAuthorized===false);
 add('FREEZE',f.authorization.active===false&&f.authorization.allowedExecutions===0&&f.authorization.writeAuthorized===false);
 add('SANITIZATION_ORDER',runtime.indexOf("containsPII:false,containsSecrets:false")<runtime.indexOf('build(payload)'));
 add('SCHEMA_AUDIT_RUNTIME',runtime.includes("privacyMode:'field_names_and_counts_only'")&&runtime.includes('candidateFields:fields')&&runtime.includes('valuesExported:false'));
 add('SOURCE_AUDIT',s.schema.explicitCountryColumnPresent===false&&s.schema.candidateFields.length===3&&s.proposal.automaticCurrencyAssignmentAuthorized===false);
 add('PHONE_REGION_NOT_COUNTRY',s.schema.candidateFields.find(x=>x.name==='Cod. Región').authoritativeForCountry===false);
 add('COUNTRY_UNRESOLVED',s.runtimeBaseline.unresolved===61&&s.runtimeBaseline.canonicalCountryResolvedGT===0&&s.runtimeBaseline.canonicalCountryResolvedCO===0);
 add('TARGET_ONLY_PRESERVED',s.targetOnly.recommendation==='retirar_candidato'&&s.targetOnly.writeExecuted===false);
 add('CONTRACT_SCHEMA_AUDIT',contract.includes('schema_audit_contract_required'));
 add('TEST_10',test.includes("t('SCHEMA_AUDIT_REQUIRED'")&&test.includes("t('SCHEMA_VALUES_BLOCKED'"));
 const unsafeRuntime=runtime.split('\n').filter(line=>!line.includes('crypto.createHash')&&!line.includes('idx.set(')&&!line.includes('counts.set(')).some(line=>/\.(set|create|update|delete|commit)\s*\(/.test(line)||/\b(runTransaction|bulkWriter|writeBatch)\b/.test(line));
 add('RUNTIME_NO_FIRESTORE_WRITES',!unsafeRuntime);
 add('NO_REQUEST_AUTHORIZED',!('requestCreated' in l.authorization)&&l.authorization.allowedExecutions===0);
 add('NO_SCOPE_EXPANSION',r.writeAuthorization===false&&r.policiesDeferred===true);
}catch(e){add('CONTRACT_PARSE',false,String(e.message||e));}
const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-gate-contract-preflight-m4-reconciliation-static-repair-v1',gateId:GATE,contractVersion:'4.2.1',executionPhase:'M4_DATA_RECONCILIATION_STATIC_REPAIR_READY',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:false,allowedExecutions:0,sourceTransformed:false,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,operationalWrites:0,clientWrites:0,insurerWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
