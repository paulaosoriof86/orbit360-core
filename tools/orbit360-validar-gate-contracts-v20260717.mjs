#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const GATE_ID=process.argv[2]||'';
const PROFILE=process.env.ORBIT360_GATE_PROFILE||'default';
const REGISTRY_REL='tools/orbit360-gate-contract-registry-v20260717.json';
const LEDGER_REL='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const ROUTER_VERSION='v12-single-state-semantic-history-pointer-fence-20260828';
const HISTORICAL_FENCE='HISTORICAL_GATE_EXECUTION_FORBIDDEN_SINGLE_STATE_LEDGER_ONLY';
const UNREGISTERED_FENCE='UNREGISTERED_GATE_EXECUTION_FORBIDDEN_SINGLE_STATE_LEDGER_ONLY';

function emit(payload,exitCode=0){
  console.log(JSON.stringify({
    schemaVersion:'orbit360-gate-contract-preflight-canonical-router-v12-semantic-history-pointer-fence',
    gateId:GATE_ID,
    gateProfile:PROFILE,
    canonicalRouterVersion:ROUTER_VERSION,
    staticRegistry:REGISTRY_REL,
    currentStateAuthority:LEDGER_REL,
    sourceTransformed:false,
    dataAccess:false,
    secretAccess:false,
    secretsRead:false,
    firestoreRead:false,
    operationalWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    rulesApplied:false,
    deployExecuted:false,
    productionTouched:false,
    containsPII:false,
    containsSecrets:false,
    ...payload
  },null,2));
  process.exit(exitCode);
}

function stale(code,detail){
  emit({
    status:'VALIDATOR_STALE',
    classification:'PIPELINE_MECHANISM_FAILURE',
    failed:1,
    failedCheckIds:[code],
    error:detail,
    executionAllowed:false,
    blocked:true,
    ok:false
  },41);
}

function blocked(code,detail,binding=null){
  emit({
    status:'SINGLE_STATE_GATE_EXECUTION_FENCE_PASS',
    classification:'PASS',
    failed:0,
    failedCheckIds:[],
    policyCode:code,
    error:detail,
    executionAllowed:false,
    blocked:true,
    historicalBindingFrozen:Boolean(binding),
    historicalContractVersion:binding?.contractVersion||'',
    resolvedProfile:binding?.profile||PROFILE,
    currentStateMustComeFromLedger:true,
    ok:true
  },41);
}

const p=path.join(ROOT,REGISTRY_REL);
if(!fs.existsSync(p))stale('STATIC_GATE_REGISTRY_MISSING',REGISTRY_REL);
let R;
try{R=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));}
catch(e){stale('STATIC_GATE_REGISTRY_INVALID_JSON',String(e?.message||e));}

const schema=String(R.schemaVersion||'');
const policies=R.policies||{};
const semanticallyCurrent=
  /^orbit360-gate-contract-registry-v\d+-history-pointer-only$/.test(schema)&&
  R.status==='ACTIVE_STATIC_CONFIGURATION_HISTORY_POINTER_ONLY'&&
  R.stateBearing===false&&
  R.currentStateAuthority===LEDGER_REL&&
  R.dynamicStateForbidden===true&&
  R.historicalExecutionForbidden===true&&
  Array.isArray(R.routerBindings)&&R.routerBindings.length===0&&
  policies.singleStaticGateRegistry===true&&
  policies.singleMutableStateLedger===true&&
  policies.dynamicStateMustComeFromLedger===true&&
  policies.historicalExecutionForbidden===true&&
  policies.currentTreeHistoricalArtifactDependencyForbidden===true&&
  policies.newGateMustUseSingleStateControlPlane===true&&
  policies.productMutationOnParityFailure===false&&
  policies.dataMutationOnParityFailure===false&&
  policies.runtimeOnParityFailure===false&&
  policies.deployOnParityFailure===false;

if(!semanticallyCurrent){
  stale('STATIC_GATE_REGISTRY_SEMANTIC_CONTRACT_MISMATCH',`registry semantic contract mismatch: ${schema||'missing-schema'}`);
}

const bindings=Array.isArray(R.historicalBindings)?R.historicalBindings:[];
const sameGate=bindings.filter(x=>x&&x.gateId===GATE_ID);
let binding=sameGate.find(x=>(x.profile||'default')===PROFILE)||null;
if(!binding&&PROFILE==='default'&&sameGate.length===1)binding=sameGate[0];

if(binding){
  if(binding.executionMode!=='HISTORICAL_FROZEN_NO_EXECUTION'||binding.activeAuthority!==false){
    stale('HISTORICAL_BINDING_NOT_FROZEN',`${binding.gateId}::${binding.profile||'default'}`);
  }
  blocked(HISTORICAL_FENCE,`${GATE_ID}::${binding.profile||PROFILE}`,binding);
}

blocked(UNREGISTERED_FENCE,`${GATE_ID}::${PROFILE}`);
