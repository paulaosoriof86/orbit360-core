#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE='block10.9-cobros-controlled-write-lab-v20260801';
const VERSION='10.9.0';
const SPECIFIC='tools/orbit360-validar-cobros-controlled-write-preflight-static-v20260801.mjs';
const SPECIFIC_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/cobros-controlled-write-preflight-static-v20260801.json';
const CANONICAL_EVIDENCE='orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';

function write(payload){
  const target=path.join(ROOT,CANONICAL_EVIDENCE);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(payload,null,2)+'\n','utf8');
}

try{
  if(process.argv[2]!==GATE)throw new Error('GATE_ID_MISMATCH');
  if(String(process.env.ORBIT360_BRANCH||'')!=='ays/backend-tenant-lab-v99-20260703')throw new Error('BRANCH_MISMATCH');
  const run=spawnSync(process.execPath,[SPECIFIC],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
  if(run.status!==0)throw new Error('SPECIFIC_VALIDATOR_FAILED_'+run.status);
  const sourcePath=path.join(ROOT,SPECIFIC_EVIDENCE);
  if(!fs.existsSync(sourcePath))throw new Error('SPECIFIC_EVIDENCE_MISSING');
  const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
  if(source.gateId!==GATE||source.contractVersion!==VERSION||source.status!=='GO_GATE_CONTRACT'||source.failed!==0)throw new Error('SPECIFIC_EVIDENCE_INVALID');
  const payload={
    ...source,
    schemaVersion:'orbit360-cobros-controlled-write-canonical-preflight-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:'GO_GATE_CONTRACT',
    classification:'STATIC_CONTRACT_READY',
    canonicalPhase:'STATIC_PREFLIGHT',
    dataAccess:false,
    secretAccess:false,
    operationalWrites:0,
    evidenceWrites:1,
    secretsRead:false,
    firestoreRead:false,
    runtimeExecuted:false,
    browserExecuted:false,
    rulesApplied:false,
    deployExecuted:false,
    productionTouched:false,
    containsPII:false,
    containsSecrets:false
  };
  write(payload);
  console.log(JSON.stringify(payload,null,2));
}catch(error){
  const payload={
    schemaVersion:'orbit360-cobros-controlled-write-canonical-preflight-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:'VALIDATOR_STALE',
    classification:'PIPELINE_MECHANISM_FAILURE',
    failed:1,
    failedCheckIds:['CANONICAL_ENGINE'],
    error:String(error&&error.message||error).slice(0,500),
    dataAccess:false,
    secretAccess:false,
    operationalWrites:0,
    evidenceWrites:1,
    secretsRead:false,
    firestoreRead:false,
    runtimeExecuted:false,
    browserExecuted:false,
    rulesApplied:false,
    deployExecuted:false,
    productionTouched:false,
    containsPII:false,
    containsSecrets:false
  };
  write(payload);
  console.error(JSON.stringify(payload,null,2));
  process.exit(41);
}
