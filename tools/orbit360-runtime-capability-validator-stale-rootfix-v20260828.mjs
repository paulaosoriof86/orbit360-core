#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const D3='tools/orbit360-post-go-live-runtime-capability-composition-validate-v20260828.mjs';
const ASEG='tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs';
const TRANSITION='POST_GO_LIVE_RUNTIME_CAPABILITY_COMPOSITION_VALIDATOR_STALE_ROOTFIX';
const args=process.argv.slice(2);
const val=f=>{const i=args.indexOf(f);return i>=0?String(args[i+1]||''):'';};
const intentPath=val('--intent')||process.env.ORBIT360_EXECUTION_INTENT||'';
const terminalOut=val('--terminal-out')||process.env.ORBIT360_TERMINAL_EVIDENCE||'';
const runId=Number(val('--run-id')||process.env.ORBIT360_EXECUTION_RUN_ID||0);
const A=p=>path.join(ROOT,p);
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const ensure=p=>fs.mkdirSync(path.dirname(p),{recursive:true});
const write=(p,x)=>{if(!p)return;ensure(p);fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n','utf8');};
const zero=extra=>({privilegedRiskObserved:false,secretAccess:false,firestoreRead:false,resetLinksGenerated:0,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,runtimeExecuted:false,browserExecuted:false,productMutation:false,dataMutation:false,containsPII:false,containsSecrets:false,...extra});
function fail(code){const out=zero({schemaVersion:'orbit360-runtime-capability-validator-stale-rootfix-terminal-v1',transitionId:TRANSITION,runId:Number.isInteger(runId)?runId:0,ok:false,status:'RUNTIME_CAPABILITY_VALIDATOR_STALE_ROOTFIX_FAIL',classification:'VALIDATOR_STALE',failureCode:code,evidencePath:runId>0?`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`:''});write(terminalOut,out);console.error(JSON.stringify({ok:false,status:out.status,classification:out.classification,code,containsPII:false,containsSecrets:false}));process.exit(41);}
function zeroScope(scope={}){for(const k of ['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'])if(scope[k]!==false)throw new Error(`VALIDATOR_STALE_ROOTFIX_SCOPE_NOT_ZERO:${k}`);}
function runJson(script,argv=[]){const r=spawnSync(process.execPath,[A(script),...argv],{cwd:ROOT,encoding:'utf8',env:{...process.env,ORBIT360_ROOT:ROOT}});let out={};try{out=JSON.parse(String(r.stdout||'').trim());}catch{throw new Error(`VALIDATOR_STALE_ROOTFIX_OUTPUT_INVALID:${script}`);}if(r.status!==0||out.ok!==true)throw new Error(`VALIDATOR_STALE_ROOTFIX_DEPENDENCY_FAIL:${script}:${out.status||r.status}`);return out;}
try{
  if(!intentPath||!terminalOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(intentPath))throw new Error('VALIDATOR_STALE_ROOTFIX_HANDLER_ARGS_INVALID');
  const I=readJson(intentPath);if(I.schemaVersion!=='orbit360-execution-intent-v1'||I.transitionId!==TRANSITION)throw new Error('VALIDATOR_STALE_ROOTFIX_INTENT_INVALID');zeroScope(I.scope||{});
  const a=runJson(ASEG);if(a.status!=='ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS')throw new Error('VALIDATOR_STALE_ROOTFIX_ASEG_NOT_PASS');
  if(Object.prototype.hasOwnProperty.call(a,'classification'))throw new Error('VALIDATOR_STALE_ROOTFIX_FIXTURE_CONTRACT_CHANGED');
  const d3=runJson(D3,['--source-only-selftest']);if(d3.status!=='POST_GO_LIVE_RUNTIME_CAPABILITY_COMPOSITION_VALIDATION_SELFTEST_PASS'||d3.aseguradorasClassificationFieldRequired!==false||d3.aseguradorasValidatorSemanticPass!==true)throw new Error('VALIDATOR_STALE_ROOTFIX_D3_CONSUMER_NOT_FIXED');
  const terminal=zero({schemaVersion:'orbit360-runtime-capability-validator-stale-rootfix-terminal-v1',transitionId:TRANSITION,runId,ok:true,status:'RUNTIME_CAPABILITY_VALIDATOR_STALE_ROOTFIX_PASS',classification:'PASS',rootCauseClassification:'VALIDATOR_STALE',staleAssumption:'aseguradoras_validator_classification_field_required',currentAseguradorasValidatorStatus:a.status,currentAseguradorasValidatorHasClassification:false,d3ConsumerSelftestStatus:d3.status,evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`});
  write(terminalOut,terminal);console.log(JSON.stringify({ok:true,status:terminal.status,classification:'PASS',rootCauseClassification:'VALIDATOR_STALE',currentAseguradorasValidatorStatus:a.status,currentAseguradorasValidatorHasClassification:false,d3ConsumerSelftestStatus:d3.status,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
}catch(error){fail(String(error?.message||error));}
