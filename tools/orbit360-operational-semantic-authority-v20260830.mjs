#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
export const VISIBLE_PRIORITY_LOCK='orbit360-platform/docs/orbit360-post-go-live-visible-priority-lock-v20260827.json';
export const FUNCTIONAL_STATUS='BLOCKING_THREE_VISIBLE_DEFECTS';
export const SEMANTIC_ROOTFIX='POST_GO_LIVE_SEMANTIC_SINGLE_STATE_ROOTFIX_VALIDATE_AND_SEAL';
export const CURRENT_FUNCTIONAL_DIAGNOSIS='DIAGNOSE_POST_GO_LIVE_FUNCTIONAL_BLOCKERS';

const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const failDefault=code=>{throw new Error(code);};

export function operationalSemanticAuthority(fail=failDefault){
  const lock=readJson(VISIBLE_PRIORITY_LOCK);
  if(lock?.schemaVersion!=='orbit360-post-go-live-visible-priority-lock-v2-authorized-record-fallback'||lock?.stateBearing!==false||lock?.dynamicStateForbidden!==true)fail('OPERATIONAL_SEMANTIC_AUTHORITY_INVALID');
  const fv=lock.functionalValidation||{};
  const entries=[
    [fv.insurerCredentialReveal?.blockerId,fv.insurerCredentialReveal?.requiredDiagnosticPath],
    [fv.cliente360?.blockerId,fv.cliente360?.requiredDiagnosticPath],
    [fv.login?.blockerId,fv.login?.requiredDiagnosticPath]
  ];
  const map={};
  for(const [id,route] of entries){
    if(typeof id!=='string'||!id||typeof route!=='string'||!route||map[id])fail('OPERATIONAL_SEMANTIC_AUTHORITY_MAPPING_INVALID');
    map[id]=route;
  }
  const ids=Object.keys(map).sort();
  if(ids.length!==3)fail('OPERATIONAL_SEMANTIC_AUTHORITY_BLOCKER_COUNT_INVALID');
  return Object.freeze({lock:Object.freeze(lock),diagnosticByBlocker:Object.freeze(map),blockerIds:Object.freeze(ids)});
}

export function assertFunctionalDiagnosticSemantics(functionalValidation,fail=failDefault,{requireComplete=false}={}){
  if(!functionalValidation||typeof functionalValidation!=='object')return true;
  const authority=operationalSemanticAuthority(fail);
  const blockers=Array.isArray(functionalValidation.blockers)?functionalValidation.blockers:[];
  if(requireComplete||functionalValidation.status===FUNCTIONAL_STATUS){
    const ids=blockers.map(x=>String(x?.id||'')).sort();
    if(JSON.stringify(ids)!==JSON.stringify(authority.blockerIds))fail('OPERATIONAL_SEMANTIC_BLOCKER_SET_DESYNC');
  }
  for(const blocker of blockers){
    const id=String(blocker?.id||'');
    const expected=authority.diagnosticByBlocker[id];
    if(!expected)fail(`OPERATIONAL_SEMANTIC_BLOCKER_UNREGISTERED:${id}`);
    if(String(blocker?.nextDiagnostic||'')!==expected)fail(`OPERATIONAL_SEMANTIC_DIAGNOSTIC_DRIFT:${id}`);
  }
  return true;
}

export function functionalDiagnosticDriftPresent(functionalValidation){
  try{assertFunctionalDiagnosticSemantics(functionalValidation,failDefault,{requireComplete:functionalValidation?.status===FUNCTIONAL_STATUS});return false;}catch{return true;}
}

export function semanticRepairAliasAllowed(transitionId,ledger,registeredFrom){
  return transitionId===SEMANTIC_ROOTFIX&&
    registeredFrom?.nextAction==='DIAGNOSE_SEMANTIC_SINGLE_STATE_ROOT_CAUSE_STOP_RETRY'&&
    ledger?.nextAction?.id===CURRENT_FUNCTIONAL_DIAGNOSIS&&
    functionalDiagnosticDriftPresent(ledger?.functionalValidation);
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const authority=operationalSemanticAuthority();
    console.log(JSON.stringify({ok:true,status:'OPERATIONAL_SEMANTIC_AUTHORITY_PASS',lock:VISIBLE_PRIORITY_LOCK,blockerIds:authority.blockerIds,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
  }catch(error){
    console.error(JSON.stringify({ok:false,status:'OPERATIONAL_SEMANTIC_AUTHORITY_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code:String(error?.message||error),containsPII:false,containsSecrets:false}));process.exit(41);
  }
}
