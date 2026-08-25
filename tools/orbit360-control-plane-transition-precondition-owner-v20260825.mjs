#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const args=process.argv.slice(2);
const valueFor=flag=>{const i=args.indexOf(flag);return i>=0?String(args[i+1]||''):'';};
const transition=valueFor('--transition');
const expectedRevision=Number(valueFor('--expected-revision'));
const expectedPackageRevision=Number(valueFor('--expected-package-revision'));
const failureEvidence=valueFor('--control-plane-failure-evidence');
const OWNER='tools/orbit360-continuity-transition-owner-v20260824.mjs';
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const A=(root,p)=>path.join(root,p);
const readJson=(root,p)=>JSON.parse(fs.readFileSync(A(root,p),'utf8').replace(/^\uFEFF/,''));
const emit=x=>process.stdout.write(JSON.stringify(x,null,2)+'\n');
const fail=(code,detail='')=>{emit({ok:false,status:'CONTROL_PLANE_TRANSITION_PRECONDITION_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,detail:String(detail||'').slice(0,1000),transition,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});process.exit(41);};

if(transition!=='CONTROL_PLANE_REGRESSION_REOPEN')fail('UNSUPPORTED_PRECONDITION_TRANSITION',transition);
if(!Number.isInteger(expectedRevision)||expectedRevision<=0||!Number.isInteger(expectedPackageRevision)||expectedPackageRevision<=0)fail('EXPECTED_REVISIONS_REQUIRED');
for(const p of [OWNER,LEDGER,failureEvidence])if(!p||!fs.existsSync(A(ROOT,p)))fail('PRECONDITION_DEPENDENCY_MISSING',p);
const live=readJson(ROOT,LEDGER);
if(Number(live.revision)!==expectedRevision||Number(live.productionReopeningPackage?.revision)!==expectedPackageRevision)fail('PRECONDITION_REVISION_MISMATCH',`${live.revision}/${live.productionReopeningPackage?.revision}`);
const before=fs.readFileSync(A(ROOT,LEDGER),'utf8');
const tempRoot=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP?path.resolve(process.env.RUNNER_TEMP):os.tmpdir(),'orbit360-transition-precondition-'));
const scratch=path.join(tempRoot,'repo');
let simulated=null;
try{
  execFileSync('git',['worktree','add','--detach',scratch,'HEAD'],{cwd:ROOT,stdio:'ignore'});
  const env={...process.env,ORBIT360_ROOT:scratch,GITHUB_ACTIONS:'false',GH_TOKEN:'',ORBIT360_PUBLICATION_TRANSACTION_OUT:path.join(tempRoot,'publication.json')};
  const r=spawnSync(process.execPath,[A(scratch,OWNER),'--transition',transition,'--expected-revision',String(expectedRevision),'--expected-package-revision',String(expectedPackageRevision),'--control-plane-failure-evidence',failureEvidence],{cwd:scratch,encoding:'utf8',env});
  if(r.status!==0)fail('CANONICAL_OWNER_PRECONDITION_REJECTED',String(r.stderr||r.stdout||'').slice(-900));
  try{simulated=JSON.parse(String(r.stdout||'').trim());}catch{fail('CANONICAL_OWNER_PRECONDITION_OUTPUT_NOT_JSON',String(r.stdout||'').slice(-900));}
  if(simulated?.ok!==true||simulated?.status!=='CONTROL_PLANE_REGRESSION_REOPENED_STOP_RETRY'||simulated?.runtimeExecuted!==false||simulated?.browserExecuted!==false||Number(simulated?.operationalWrites||0)!==0)fail('CANONICAL_OWNER_PRECONDITION_RESULT_INVALID',JSON.stringify(simulated));
  const afterScratch=readJson(scratch,LEDGER);
  if(afterScratch.activeState?.status!=='CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY'||afterScratch.activeState?.runtimeAuthorized!==false||afterScratch.authorizationBoundary?.activeRequestPath!=null||afterScratch.authorizationBoundary?.authorizationRecordPath!=null||Number(afterScratch.progress?.productionRouteProgressPct)!==75)fail('CANONICAL_OWNER_SIMULATED_STATE_INVALID');
}finally{
  try{execFileSync('git',['worktree','remove','--force',scratch],{cwd:ROOT,stdio:'ignore'});}catch{}
  try{fs.rmSync(tempRoot,{recursive:true,force:true});}catch{}
}
if(fs.readFileSync(A(ROOT,LEDGER),'utf8')!==before)fail('PRECONDITION_MUTATED_CANONICAL_LEDGER');
emit({ok:true,status:'CONTROL_PLANE_REGRESSION_REOPEN_PRECONDITION_PASS',classification:'PASS',transition,semanticOwner:OWNER,validationMode:'CANONICAL_OWNER_SCRATCH_BEHAVIORAL_SIMULATION',expectedLedgerRevision:expectedRevision,expectedPackageRevision:expectedPackageRevision,candidateArtifactId:Number(live.successorCandidate?.artifactId),candidateSourceHead:live.successorCandidate?.sourceHead,reopenedFrom:simulated?.reopenedFrom||null,canonicalLedgerMutated:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
