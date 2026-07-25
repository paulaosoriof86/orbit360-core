#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';const ROOT=process.cwd(),GATE='block4-data-reconciliation-readonly-v20260725',OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const files={lifecycle:'tools/orbit360-validator-lifecycle-contract-m4-reconciliation-v20260725.json',registry:'tools/orbit360-gate-contract-registry-extension-m4-reconciliation-v20260725.json',overlay:'tools/orbit360-gate-contract-overlay-m4-reconciliation-v20260725.json',freeze:'tools/orbit360-m4-data-reconciliation-freeze-v20260725.json',authorization:'tools/orbit360-m4-data-reconciliation-authorization-v20260725.json',request:'tools/orbit360-m4-data-reconciliation-request-v20260725.json',contract:'orbit360-platform/core/m4-data-reconciliation-contract-p0.js',runtime:'tools/orbit360-m4-data-reconciliation-v20260725.mjs',test:'tools/orbit360-m4-data-reconciliation-contract-v20260725.cjs',workflow:'.github/workflows/orbit360-m4-data-reconciliation-gate-v20260725.yml',baseline:'tools/orbit360-m4-durable-writer-dryrun-freeze-v20260725.json'};
const checks=[];function add(id,ok,detail=''){checks.push({id,ok:!!ok,detail});}function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}function json(rel){return JSON.parse(read(rel));}
Object.entries(files).forEach(([k,v])=>add('FILE:'+k,fs.existsSync(path.join(ROOT,v)),v));
try{const l=json(files.lifecycle),a=json(files.authorization),r=json(files.registry),o=json(files.overlay),f=json(files.freeze),q=json(files.request),b=json(files.baseline),runtime=read(files.runtime),workflow=read(files.workflow);
 add('GATE',l.gateId===GATE&&r.gates[0].gateId===GATE&&o.gateId===GATE&&f.gateId===GATE&&q.gateId===GATE);
 add('PHASE',l.executionProfile.phase==='M4_DATA_RECONCILIATION_EXECUTION');
 add('CAPABILITIES',l.executionProfile.capabilities.secrets===true&&l.executionProfile.capabilities.firestoreRead===true&&l.executionProfile.capabilities.writes===false&&l.executionProfile.capabilities.runtime===true);
 add('BASELINE',b.dryRunClosure.requiresValidation===65&&b.dryRunClosure.issues.clientsMissingCurrency===61&&b.dryRunClosure.issues.clientTargetOnly===2&&b.dryRunClosure.issues.insurerTargetOnly===2);
 add('AUTH',a.explicitAuthorization===true&&a.allowedExecutions===1&&a.readOnlyReconciliation===true);
 add('REQUEST',q.explicitAuthorization===true&&q.allowedExecutions===1&&q.authorizedBaseCommit&&q.readOnlyReconciliation===true);
 add('NO_WRITES',a.operationalWrites===false&&a.clientWrites===false&&a.insurerWrites===false&&q.operationalWrites===false&&q.clientWrites===false&&q.insurerWrites===false);
 add('RUNTIME_READS',runtime.includes("legacy.collection('clientes').get()")&&runtime.includes("legacy.collection('aseguradoras').get()"));
 add('RUNTIME_RULE',runtime.includes("c==='GT'")&&runtime.includes("c==='CO'"));
 add('RUNTIME_SANITIZED',runtime.includes('containsPII:false')&&runtime.includes('containsSecrets:false')&&runtime.includes('token:hash('));
 const unsafeRuntime=runtime.split('\n').filter(line=>!line.includes('crypto.createHash')&&!line.includes('idx.set(')).some(line=>/\.(set|create|update|delete|commit)\s*\(/.test(line)||/\b(runTransaction|bulkWriter|writeBatch)\b/.test(line));add('RUNTIME_NO_FIRESTORE_WRITES',!unsafeRuntime);
 add('WORKFLOW_TRIGGER',workflow.includes('orbit360-m4-data-reconciliation-request-v20260725.json'));
 add('WORKFLOW_PREFLIGHT_FIRST',workflow.indexOf('Preflight canónico')<workflow.indexOf('Resolver cuenta existente'));
 add('WORKFLOW_NO_WRITES',!/(firebase deploy|gcloud firestore|\.set\(|\.update\(|\.delete\()/i.test(workflow));
}catch(e){add('CONTRACT_PARSE',false,String(e.message||e));}
const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-gate-contract-preflight-m4-reconciliation-v1',gateId:GATE,contractVersion:'4.2.0',executionPhase:'M4_DATA_RECONCILIATION_EXECUTION',status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,reconciliationAuthorized:true,allowedExecutions:1,secretAccess:false,firestoreRead:false,runtimeExecuted:false,operationalWrites:0,clientWrites:0,insurerWrites:0,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
