#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const OWNER='tools/orbit360-single-state-ledger-owner-v20260827.mjs';
const INVARIANT='tools/orbit360-single-state-invariant-v20260827.mjs';
const STATE_CONTRACT='tools/orbit360-single-state-contract-v20260827.mjs';
const WORKFLOW='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const args=process.argv.slice(2),arg=n=>{const i=args.indexOf(n);return i>=0?String(args[i+1]||''):'';};
const intentPath=arg('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const terminalOut=arg('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const runId=Number(arg('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const fail=c=>{throw new Error(c);};
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const write=(p,x)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(x,null,2)+'\n','utf8');
function evidence(ok=true,classification='PASS',failureCode=''){
 return {schemaVersion:'orbit360-control-plane-metadata-reconcile-terminal-v1',transitionId:'POST_GO_LIVE_CONTROL_PLANE_METADATA_RECONCILE',runId,ok,status:ok?'POST_GO_LIVE_CONTROL_PLANE_METADATA_RECONCILE_PASS':'POST_GO_LIVE_CONTROL_PLANE_METADATA_RECONCILE_FAIL',classification,failureCode,metadataSynchronized:ok,transitionOwner:OWNER,singleStateInvariant:INVARIANT,stateContract:STATE_CONTRACT,canonicalWorkflow:WORKFLOW,resetLinksGenerated:0,privilegedRiskObserved:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`};
}
try{
 if(!intentPath||!Number.isInteger(runId)||runId<=0)fail('PIPELINE_MECHANISM_FAILURE:METADATA_RECONCILE_INTENT_OR_RUN_ID_MISSING');
 const intent=JSON.parse(fs.readFileSync(intentPath,'utf8'));
 if(intent.transitionId!=='POST_GO_LIVE_CONTROL_PLANE_METADATA_RECONCILE')fail('PIPELINE_MECHANISM_FAILURE:METADATA_RECONCILE_TRANSITION_INVALID');
 const L=read(LEDGER);
 if(L.executionClaim?.active!==true||L.executionClaim?.transitionId!==intent.transitionId||Number(L.executionClaim?.runId)!==runId)fail('PIPELINE_MECHANISM_FAILURE:METADATA_RECONCILE_ACTIVE_CLAIM_MISMATCH');
 if(L.activeState?.phase!=='POST_GO_LIVE_CONTROL_PLANE_METADATA_RECONCILE_RUNNING'||L.activeState?.status!=='SOURCE_ONLY_CLAIMED')fail('PIPELINE_MECHANISM_FAILURE:METADATA_RECONCILE_CLAIM_STATE_INVALID');
 if(Number(L.progress?.productionRouteProgressPct)!==100||L.releaseMilestone?.closed!==true||L.releaseMilestone?.immutable!==true||L.releaseMilestone?.status!=='PRODUCTION_GO_LIVE_PASS')fail('PIPELINE_MECHANISM_FAILURE:GO_LIVE_MILESTONE_NOT_FROZEN');
 L.continuityControl={...(L.continuityControl||{}),status:'CONTROL_PLANE_POST_GO_LIVE_ACCESS_RECOVERY_ANTI_DESYNC_PASS',canonicalityConvergenceVersion:'v13-20260827-post-go-live-access-recovery-anti-desync',transitionOwner:OWNER,singleStateInvariant:INVARIANT,stateContract:STATE_CONTRACT,canonicalWorkflow:WORKFLOW,postGoLiveAccessRecoveryRootfix:{status:'CLOSED_PASS_METADATA_SYNCHRONIZED',classification:'PASS',selftestRunId:33034348092,sourcePrepRunId:33034388422,metadataReconcileRunId:runId,ownerInvariantSharedStateContract:true,goLiveReopened:false,historicalAuthorizationReusable:false,sourceOnly:true,runtimeExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false}};
 write(LEDGER,L);
 const out=evidence(true);if(terminalOut){fs.mkdirSync(path.dirname(terminalOut),{recursive:true});fs.writeFileSync(terminalOut,JSON.stringify(out,null,2)+'\n','utf8');}console.log(JSON.stringify(out,null,2));
}catch(error){const out=evidence(false,'PIPELINE_MECHANISM_FAILURE',String(error?.message||error));if(terminalOut){fs.mkdirSync(path.dirname(terminalOut),{recursive:true});fs.writeFileSync(terminalOut,JSON.stringify(out,null,2)+'\n','utf8');}console.error(JSON.stringify(out));process.exit(41);}
