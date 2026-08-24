#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { terminalPassContract } from './orbit360-f2-terminal-evidence-normalizer-v20260824.mjs';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,''));
const exists=p=>Boolean(p)&&fs.existsSync(path.join(ROOT,p));
const L=read(LEDGER),latest=L.history?.latestSealedConsumedRuntime||{};
const failures=[];const need=(v,c)=>{if(!v)failures.push(c);};
const terminalPath=String(latest.terminalEvidencePath||L.authorizationBoundary?.terminalEvidencePath||'').trim();
need(terminalPath&&exists(terminalPath),'TERMINAL_EVIDENCE_MISSING');
let T={};if(terminalPath&&exists(terminalPath))T=read(terminalPath);
const run=Number(latest.runId||0),terminalRun=Number(T.runId||0);
need(run>0&&terminalRun===run,'TERMINAL_RUN_ID_NOT_BOUND_TO_LATEST_SEALED_RUNTIME');
need(!(T.ok!==true&&T.classification==='PASS'),'TERMINAL_FALSE_PASS_CLASSIFICATION');
const currentRunEvidenceBound=Number(T.browserRunId||0)===run&&Number(T.integrityRunId||0)===run;
const passEvidence=terminalPassContract(T)&&currentRunEvidenceBound;
const stateClaimsPass=L.activeState?.status==='F2_TERMINAL_PASS'||L.activeState?.phase==='F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE'||L.progress?.f2TerminalPass===true||Number(L.progress?.productionRouteProgressPct)>75||L.nextAction?.id==='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION';
if(stateClaimsPass){
  need(passEvidence,'STATE_PASS_WITHOUT_CURRENT_RUN_TERMINAL_PASS_EVIDENCE');
}else{
  need(Number(L.progress?.productionRouteProgressPct)<=75,'NONPASS_STATE_PROGRESS_ABOVE_75');
  need(L.progress?.f2TerminalPass===false,'NONPASS_STATE_F2_FLAG_TRUE');
  need(L.nextAction?.id!=='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION','NONPASS_STATE_GO_LIVE_NEXT_ACTION');
}
need(L.activeState?.runtimeReplayAllowed===false,'RUNTIME_REPLAY_OPEN');
need(latest.replayAllowed===false,'LATEST_RUNTIME_REPLAY_OPEN');
need(Number(latest.allowedExecutions)===0,'LATEST_RUNTIME_BUDGET_NOT_ZERO');
const out={schemaVersion:'orbit360-terminal-truth-invariant-v1',ok:failures.length===0,status:failures.length?'TERMINAL_TRUTH_INVARIANT_FAIL':'TERMINAL_TRUTH_INVARIANT_PASS',classification:failures.length?'DATA_CONTRACT_FAILURE':'PASS',failures,ledgerRevision:L.revision,terminalEvidencePath:terminalPath,latestRunId:run,terminalRunId:terminalRun,terminalOk:T.ok===true,terminalClassification:T.classification||null,currentRunEvidenceBound,passEvidence,stateClaimsPass,productionRouteProgressPct:L.progress?.productionRouteProgressPct,runtimeExecuted:Boolean(T.runtimeExecuted),browserExecuted:Boolean(T.browserExecuted||T.browserMatrixPass),firestoreWrites:Number(T.firestoreWrites||0),authWrites:Number(T.authWrites||0),operationalWrites:Number(T.operationalWrites||0),deployExecuted:Boolean(T.deployExecuted),productionTouched:Boolean(T.productionHostingTouched),containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
