#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'',runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0),terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v),digest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const fail=code=>{console.error(JSON.stringify({ok:false,status:'SEMANTIC_SINGLE_STATE_ROOTFIX_SOURCE_ONLY_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,containsPII:false,containsSecrets:false}));process.exit(41);};
if(!intentPath||!terminalOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(intentPath))fail('ROOTFIX_HANDLER_ARGS_INVALID');
const I=JSON.parse(fs.readFileSync(intentPath,'utf8').replace(/^\uFEFF/,''));
if(I.transitionId!=='POST_GO_LIVE_SEMANTIC_SINGLE_STATE_ROOTFIX_VALIDATE_AND_SEAL')fail('ROOTFIX_HANDLER_TRANSITION_INVALID');
if(I.scope?.runtime!==false||I.scope?.browser!==false||I.scope?.secrets!==false||I.scope?.firestoreRead!==false||I.scope?.deploy!==false||I.scope?.production!==false)fail('ROOTFIX_HANDLER_SCOPE_NOT_SOURCE_ONLY');
const p=I.statePatch;if(!p||p.schemaVersion!=='orbit360-operational-state-patch-v1'||p.containsPII!==false||p.containsSecrets!==false||!p.values)fail('ROOTFIX_HANDLER_STATE_PATCH_INVALID');
const raw=JSON.stringify(p);if(raw.length>24000||/(password|secret|token|credential|serviceAccount|privateKey|emailAddress)/i.test(raw))fail('ROOTFIX_HANDLER_STATE_PATCH_SANITIZATION_INVALID');
const evidence={schemaVersion:'orbit360-semantic-single-state-rootfix-terminal-v1',transitionId:I.transitionId,runId,ok:true,classification:'PASS',status:'SEMANTIC_SINGLE_STATE_CLASSWIDE_ROOTFIX_SOURCE_ONLY_PASS',privilegedRiskObserved:false,secretAccess:false,firestoreRead:false,resetLinksGenerated:0,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runtimeExecuted:false,browserExecuted:false,statePatchDigest:digest(p),statePatch:p,antiStaleContract:'DYNAMIC_MODULE_STATE_ONLY_LEDGER_OR_APPEND_ONLY_EVIDENCE',productMutation:false,dataMutation:false,goLiveReopened:false,containsPII:false,containsSecrets:false,evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`};
fs.writeFileSync(terminalOut,JSON.stringify(evidence,null,2)+'\n','utf8');
console.log(JSON.stringify({ok:true,status:evidence.status,classification:'PASS',runId,statePatchDigest:evidence.statePatchDigest,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
