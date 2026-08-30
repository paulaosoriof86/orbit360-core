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
 const ids=Array.isArray(lock.visibleBlockerIds)?lock.visibleBlockerIds.map(String):[];
 const map={INSURER_PORTAL_REVEAL_OPEN:String(lock.insurerCredentialReveal?.requiredDiagnosticPath||''),CLIENT360_LIST_EMPTY_WITH_DATA_OPEN:String(lock.cliente360?.requiredDiagnosticPath||''),LOGIN_LATENCY_OPEN:String(lock.login?.requiredDiagnosticPath||'')};
 if(ids.length!==3||new Set(ids).size!==3||Object.keys(map).some(id=>!ids.includes(id)||!map[id]))fail('OPERATIONAL_SEMANTIC_AUTHORITY_MAPPING_INVALID');
 return Object.freeze({lock:Object.freeze(lock),diagnosticByBlocker:Object.freeze(map),blockerIds:Object.freeze([...ids].sort())});
}
export function assertFunctionalDiagnosticSemantics(functionalValidation,fail=failDefault,{requireComplete=false}={}){
 if(!functionalValidation||typeof functionalValidation!=='object')return true;const a=operationalSemanticAuthority(fail),blockers=Array.isArray(functionalValidation.blockers)?functionalValidation.blockers:[];
 if(requireComplete||functionalValidation.status===FUNCTIONAL_STATUS){const ids=blockers.map(x=>String(x?.id||'')).sort();if(JSON.stringify(ids)!==JSON.stringify(a.blockerIds))fail('OPERATIONAL_SEMANTIC_BLOCKER_SET_DESYNC');}
 for(const b of blockers){const id=String(b?.id||''),expected=a.diagnosticByBlocker[id];if(!expected)fail('OPERATIONAL_SEMANTIC_BLOCKER_UNREGISTERED:'+id);if(String(b?.nextDiagnostic||'')!==expected)fail('OPERATIONAL_SEMANTIC_DIAGNOSTIC_DRIFT:'+id);}return true;
}
export function functionalDiagnosticDriftPresent(fv){try{assertFunctionalDiagnosticSemantics(fv,failDefault,{requireComplete:fv?.status===FUNCTIONAL_STATUS});return false;}catch{return true;}}
export function semanticRepairAliasAllowed(transitionId,ledger,registeredFrom){
 const next=String(ledger?.nextAction?.id||''),phase=String(ledger?.activeState?.phase||''),status=String(ledger?.activeState?.status||''),progress=Number(ledger?.progress?.productionRouteProgressPct);
 return transitionId===SEMANTIC_ROOTFIX&&registeredFrom?.nextAction==='DIAGNOSE_SEMANTIC_SINGLE_STATE_ROOT_CAUSE_STOP_RETRY'&&phase==='PRODUCTION_SMOKE_PASS'&&status==='PRODUCTION_GO_LIVE_PASS'&&progress===100&&next.startsWith('DIAGNOSE_')&&functionalDiagnosticDriftPresent(ledger?.functionalValidation);
}
if(import.meta.url===`file://${process.argv[1]}`){try{const a=operationalSemanticAuthority();console.log(JSON.stringify({ok:true,status:'OPERATIONAL_SEMANTIC_AUTHORITY_PASS',lock:VISIBLE_PRIORITY_LOCK,blockerIds:a.blockerIds,diagnosticByBlocker:a.diagnosticByBlocker,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));}catch(e){console.error(JSON.stringify({ok:false,status:'OPERATIONAL_SEMANTIC_AUTHORITY_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code:String(e?.message||e),containsPII:false,containsSecrets:false}));process.exit(41);}}
