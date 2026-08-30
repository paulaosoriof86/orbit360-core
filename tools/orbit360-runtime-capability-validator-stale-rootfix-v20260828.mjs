#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const D3='tools/orbit360-post-go-live-runtime-capability-composition-validate-v20260828.mjs';
const ASEG='tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs';
const TRANSITION='POST_GO_LIVE_RUNTIME_CAPABILITY_COMPOSITION_VALIDATOR_STALE_ROOTFIX';
const FAILED_TRANSITION='POST_GO_LIVE_RUNTIME_CAPABILITY_COMPOSITION_VALIDATE_SOURCE_ONLY';
const CLAIM_PHASE='POST_GO_LIVE_RUNTIME_CAPABILITY_VALIDATOR_STALE_ROOTFIX_RUNNING';
const CLAIM_STATUS='SOURCE_ONLY_CLAIMED';
const CLAIM_NEXT='RUN_RUNTIME_CAPABILITY_VALIDATOR_STALE_ROOTFIX';
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
function fail(code,meta={}){const out=zero({schemaVersion:'orbit360-runtime-capability-d3-mechanism-rootfix-terminal-v4-claim-aware-current-ledger',transitionId:TRANSITION,runId:Number.isInteger(runId)?runId:0,ok:false,status:'RUNTIME_CAPABILITY_D3_MECHANISM_ROOTFIX_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',failureCode:code,...meta,evidencePath:runId>0?`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`:''});write(terminalOut,out);console.error(JSON.stringify({ok:false,status:out.status,classification:out.classification,code,containsPII:false,containsSecrets:false}));process.exit(41);}
function zeroScope(scope={}){for(const k of ['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'])if(scope[k]!==false)throw new Error(`D3_MECHANISM_ROOTFIX_SCOPE_NOT_ZERO:${k}`);}
function runJson(script,argv=[]){const r=spawnSync(process.execPath,[A(script),...argv],{cwd:ROOT,encoding:'utf8',env:{...process.env,ORBIT360_ROOT:ROOT}});let out={};try{out=JSON.parse(String(r.stdout||'').trim());}catch{throw new Error(`D3_MECHANISM_ROOTFIX_OUTPUT_INVALID:${script}`);}if(r.status!==0||out.ok!==true){const detail=out.code||out.failureCode||out.status||r.status;throw new Error(`D3_MECHANISM_ROOTFIX_DEPENDENCY_FAIL:${script}:${out.classification||'UNKNOWN'}:${detail}`);}return out;}
try{
  if(!intentPath||!terminalOut||!Number.isInteger(runId)||runId<=0||!fs.existsSync(intentPath))throw new Error('D3_MECHANISM_ROOTFIX_HANDLER_ARGS_INVALID');
  const I=readJson(intentPath);
  if(I.schemaVersion!=='orbit360-execution-intent-v1'||I.transitionId!==TRANSITION)throw new Error('D3_MECHANISM_ROOTFIX_INTENT_INVALID');
  zeroScope(I.scope||{});
  const L=readJson(A(LEDGER)),S=L.postGoLiveSuccessorAcceptance||{},H=L.history?.latestExecutionTerminal||{},AState=L.activeState||{},next=String(L.nextAction?.id||'');
  if(AState.phase!==CLAIM_PHASE||AState.status!==CLAIM_STATUS||next!==CLAIM_NEXT||AState.productFrozen!==true||AState.dataFrozen!==true)throw new Error('D3_MECHANISM_ROOTFIX_CLAIM_FREEZE_STATE_INVALID');
  const predecessorEligible=H.ok===false&&H.classification==='PIPELINE_MECHANISM_FAILURE'&&Number.isInteger(Number(H.runId))&&Number(H.runId)>0&&(H.transitionId===FAILED_TRANSITION||H.transitionId===TRANSITION);
  if(!predecessorEligible)throw new Error('D3_MECHANISM_ROOTFIX_PRECEDING_FAILURE_NOT_ELIGIBLE');
  if(S.status!=='ACCEPTED_SOURCE_ONLY_PENDING_COMPOSITION_VALIDATION'||S.classification!=='PASS'||!Number.isInteger(Number(S.acceptanceRunId))||Number(S.acceptanceRunId)<=0||!S.candidateId||!/^[a-f0-9]{64}$/.test(String(S.candidateManifestSha256||''))||!/^[a-f0-9]{64}$/.test(String(S.patchManifestSha256||''))||S.sourceOnly!==true||S.certifiedBaselinePreserved!==true)throw new Error('D3_MECHANISM_ROOTFIX_ACCEPTANCE_RECORD_NOT_PRESERVED');
  const aseg=runJson(ASEG);
  if(aseg.status!=='ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS'||aseg.expectedOwnerVersion!=='20260829.1')throw new Error('D3_MECHANISM_ROOTFIX_ASEG_NOT_PASS');
  const binding=runJson(D3,['--acceptance-binding-selftest']);
  if(binding.status!=='POST_GO_LIVE_RUNTIME_CAPABILITY_ACCEPTANCE_BINDING_SELFTEST_PASS'||binding.acceptanceAuthority!=='postGoLiveSuccessorAcceptance'||Number(binding.acceptanceRunId)!==Number(S.acceptanceRunId)||binding.latestExecutionTerminalAcceptanceDependency!==false||binding.laterTerminalDoesNotInvalidateAcceptance!==true||binding.wrongRunBlocked!==true||binding.wrongCandidateDigestBlocked!==true||binding.wrongPatchDigestBlocked!==true||binding.missingDedicatedRecordBlocked!==true)throw new Error('D3_MECHANISM_ROOTFIX_ACCEPTANCE_BINDING_NOT_FIXED');
  const d3=runJson(D3,['--source-only-selftest']);
  if(d3.status!=='POST_GO_LIVE_RUNTIME_CAPABILITY_COMPOSITION_VALIDATION_SELFTEST_PASS'||d3.classification!=='PASS'||d3.approvedPackageClosureOk!==true||Number(d3.packageClosureCapabilityCount)<6||Number(d3.baselineArtifactId)!==9504702901||d3.aseguradorasFinalOwnerAligned!==true||d3.aseguradorasOwnerVersion!=='20260829.1'||d3.runtimeProofSatisfied!==false||d3.acceptanceAuthority!=='postGoLiveSuccessorAcceptance')throw new Error('D3_MECHANISM_ROOTFIX_D3_SELFTEST_NOT_FIXED');
  const terminal=zero({schemaVersion:'orbit360-runtime-capability-d3-mechanism-rootfix-terminal-v4-claim-aware-current-ledger',transitionId:TRANSITION,runId,ok:true,status:'RUNTIME_CAPABILITY_D3_MECHANISM_ROOTFIX_PASS',classification:'PASS',rootCauseClassification:'VALIDATOR_STALE',secondaryClassification:'PIPELINE_MECHANISM_FAILURE',precedingFailedTransition:H.transitionId,precedingFailedRunId:Number(H.runId),acceptanceRunId:Number(S.acceptanceRunId),candidateId:S.candidateId,acceptanceAuthority:'postGoLiveSuccessorAcceptance',claimAwareValidation:true,freezePreservedDuringClaim:true,currentAcceptanceDerivedFromLedger:true,historicalRunIdsRequired:false,latestExecutionTerminalAcceptanceDependency:false,laterTerminalDoesNotInvalidateAcceptance:true,currentAseguradorasValidatorStatus:aseg.status,currentAseguradorasOwnerVersion:aseg.expectedOwnerVersion,d3ConsumerSelftestStatus:d3.status,approvedPackageClosureOk:d3.approvedPackageClosureOk===true,packageClosureCapabilityCount:Number(d3.packageClosureCapabilityCount||0),runtimeProofSatisfied:false,visibleDefectsRemainOpen:d3.visibleDefectsRemainOpen||[],evidencePath:`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`});
  write(terminalOut,terminal);
  console.log(JSON.stringify({ok:true,status:terminal.status,classification:'PASS',rootCauseClassification:terminal.rootCauseClassification,secondaryClassification:terminal.secondaryClassification,precedingFailedTransition:terminal.precedingFailedTransition,precedingFailedRunId:terminal.precedingFailedRunId,acceptanceRunId:terminal.acceptanceRunId,candidateId:terminal.candidateId,claimAwareValidation:true,freezePreservedDuringClaim:true,currentAcceptanceDerivedFromLedger:true,historicalRunIdsRequired:false,d3ConsumerSelftestStatus:d3.status,approvedPackageClosureOk:true,packageClosureCapabilityCount:terminal.packageClosureCapabilityCount,runtimeProofSatisfied:false,visibleDefectsRemainOpen:terminal.visibleDefectsRemainOpen,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
}catch(error){fail(String(error?.message||error));}
