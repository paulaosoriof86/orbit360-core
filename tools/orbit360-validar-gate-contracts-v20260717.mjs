#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE_ID=process.argv[2]||'';
const PROFILE=process.env.ORBIT360_GATE_PROFILE||'default';
const REGISTRY_REL='tools/orbit360-gate-contract-registry-v20260717.json';
const LEDGER_REL='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const ROUTER_VERSION='v11-single-state-historical-fence-20260827';
const HISTORICAL_FENCE='HISTORICAL_GATE_EXECUTION_FORBIDDEN_SINGLE_STATE_LEDGER_ONLY';

function out(code,detail,binding=null){
  const payload={
    schemaVersion:'orbit360-gate-contract-preflight-canonical-router-v11-single-state-fence',
    gateId:GATE_ID,gateProfile:PROFILE,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',
    failed:1,failedCheckIds:[code],error:detail,canonicalRouterVersion:ROUTER_VERSION,
    staticRegistry:REGISTRY_REL,currentStateAuthority:LEDGER_REL,
    historicalBindingFrozen:Boolean(binding),historicalContractVersion:binding?.contractVersion||'',
    sourceTransformed:false,dataAccess:false,secretAccess:false,secretsRead:false,firestoreRead:false,
    operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,
    productionTouched:false,containsPII:false,containsSecrets:false,ok:false
  };
  console.log(JSON.stringify(payload,null,2));
  process.exit(41);
}

const p=path.join(ROOT,REGISTRY_REL);
if(!fs.existsSync(p))out('STATIC_GATE_REGISTRY_MISSING',REGISTRY_REL);
let R;
try{R=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));}
catch(e){out('STATIC_GATE_REGISTRY_INVALID_JSON',String(e?.message||e));}
if(R.schemaVersion!=='orbit360-gate-contract-registry-v3-single-state-static-authority'||
   R.currentStateAuthority!==LEDGER_REL||R.dynamicStateForbidden!==true||R.historicalExecutionForbidden!==true){
  out('STATIC_GATE_REGISTRY_NOT_SINGLE_STATE_V3','registry contract mismatch');
}
const bindings=Array.isArray(R.historicalBindings)?R.historicalBindings:[];
const binding=bindings.find(x=>x.gateId===GATE_ID&&(x.profile||'default')===PROFILE);
if(binding)out(HISTORICAL_FENCE,`${GATE_ID}::${PROFILE}`,binding);
out('UNREGISTERED_GATE_EXECUTION_FORBIDDEN_SINGLE_STATE_LEDGER_ONLY',`${GATE_ID}::${PROFILE}`);
