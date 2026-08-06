#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceRoot = process.cwd();
const sourceScript = path.join(sourceRoot, 'tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh');
const outRel = 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json';
const canonicalRel = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const requestRel = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const branch = 'ays/backend-tenant-lab-v99-20260703';
const checks = {};
let error = '';
const run = (cmd,args,opts={}) => spawnSync(cmd,args,{encoding:'utf8',...opts});
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function initRepo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-preflight-branchctx-'));
  fs.mkdirSync(path.join(root,'tools'),{recursive:true});
  fs.copyFileSync(sourceScript,path.join(root,'tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh'));
  fs.chmodSync(path.join(root,'tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh'),0o755);
  run('git',['init','-q'],{cwd:root}); run('git',['config','user.name','orbit360-source-test'],{cwd:root}); run('git',['config','user.email','orbit360-source-test@example.invalid'],{cwd:root});
  fs.writeFileSync(path.join(root,'baseline.txt'),'baseline\n'); run('git',['add','.'],{cwd:root}); run('git',['commit','-qm','baseline'],{cwd:root});
  const parent=run('git',['rev-parse','HEAD'],{cwd:root}).stdout.trim();
  writeJson(path.join(root,requestRel),{schemaVersion:'orbit360-visual-matrix-corrected-post-auth-request-v1',gateId:'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',contractVersion:'2.7.8',status:'AUTHORIZED_ONCE',approved:true,allowedExecutions:1,consumed:false,replayAllowed:false,parentHead:parent});
  run('git',['add',requestRel],{cwd:root}); run('git',['commit','-qm','request'],{cwd:root});
  return root;
}
function fakeNode(root){
  const file=path.join(root,'fake-node.sh');
  fs.writeFileSync(file,`#!/usr/bin/env bash\nset -u\nOUT='${canonicalRel}'\nmkdir -p "$(dirname "$OUT")"\nif [[ "\${ORBIT360_FAKE_ROUTER_MODE:-pass}" == 'fail' ]]; then\ncat > "$OUT" <<'JSON'\n{"schemaVersion":"synthetic","gateId":"block2.7-visual-matrix-corrected-post-auth-lab-v20260805","contractVersion":"2.7.8","status":"STOP_GATE_CONTRACT","classification":"DATA_CONTRACT_FAILURE","failed":1,"failedCheckIds":["SYNTHETIC_ROUTER_FAILURE"],"secretAccess":false,"firestoreRead":false,"browserExecuted":false,"deployExecuted":false,"firestoreWrites":0,"authWrites":0,"operationalWrites":0,"ok":false}\nJSON\nexit 41\nfi\ncat > "$OUT" <<'JSON'\n{"schemaVersion":"synthetic","gateId":"block2.7-visual-matrix-corrected-post-auth-lab-v20260805","contractVersion":"2.7.8","status":"GO_GATE_CONTRACT","classification":"GO_VISUAL_MATRIX_CORRECTED_POST_AUTH","failed":0,"failedCheckIds":[],"secretAccess":false,"firestoreRead":false,"browserExecuted":false,"deployExecuted":false,"firestoreWrites":0,"authWrites":0,"operationalWrites":0,"ok":true}\nJSON\nexit 0\n`);
  fs.chmodSync(file,0o755); return file;
}
function execute(root,extraEnv={}){
  const outputFile=path.join(root,'github-output.txt');
  const result=run('bash',['tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh'],{cwd:root,env:{...process.env,GITHUB_EVENT_NAME:'pull_request',GITHUB_REF_NAME:'18/merge',GITHUB_BASE_REF:branch,GITHUB_RUN_ATTEMPT:'1',GITHUB_OUTPUT:outputFile,ORBIT360_CANONICAL_BRANCH:branch,ORBIT360_NODE_BIN:fakeNode(root),...extraEnv}});
  const evidenceFile=path.join(root,outRel);
  return {result,outputFile,evidence:fs.existsSync(evidenceFile)?readJson(evidenceFile):null};
}
try{
  const script=fs.readFileSync(sourceScript,'utf8');
  checks.sourceExists=fs.existsSync(sourceScript);
  checks.failHelperPresent=script.includes('emit_wrapper_failure()');
  checks.noGlobalSetE=script.includes('set -uo pipefail')&&!script.includes('set -euo pipefail');
  checks.routerStatusCaptured=script.includes('ROUTER_STATUS=$?');
  checks.routerEvidenceRequired=script.includes('CANONICAL_ROUTER_EVIDENCE_MISSING');
  checks.routerNonzeroObservable=script.includes('CANONICAL_ROUTER_NONZERO');
  checks.everyEarlyFailureSanitized=script.includes('secretsRead:false')&&script.includes('runtimeExecuted:false')&&script.includes('deployExecuted:false');
  checks.orbitOwnedBranchContract=script.includes('ORBIT360_CANONICAL_BRANCH');
  checks.pullRequestBaseRefValidated=script.includes('PULL_REQUEST_BASE_REF_MISMATCH')&&script.includes('GITHUB_BASE_REF');
  checks.githubRefNameNotCanonicalGate=!script.includes('GITHUB_REF_NAME does not match the canonical branch');

  const wrongOrbitRoot=initRepo(); const wrongOrbit=execute(wrongOrbitRoot,{ORBIT360_CANONICAL_BRANCH:'wrong'});
  checks.orbitBranchFailureExit41=wrongOrbit.result.status===41;
  checks.orbitBranchFailureCheckpoint=wrongOrbit.evidence?.wrapperCheckpoint==='ORBIT360_CANONICAL_BRANCH_MISMATCH';
  checks.orbitBranchFailureNoRisk=wrongOrbit.evidence?.secretsRead===false&&wrongOrbit.evidence?.runtimeExecuted===false&&wrongOrbit.evidence?.deployExecuted===false;

  const wrongBaseRoot=initRepo(); const wrongBase=execute(wrongBaseRoot,{GITHUB_BASE_REF:'wrong'});
  checks.baseRefFailureExit41=wrongBase.result.status===41;
  checks.baseRefFailureCheckpoint=wrongBase.evidence?.wrapperCheckpoint==='PULL_REQUEST_BASE_REF_MISMATCH';
  checks.baseRefFailureNoRisk=wrongBase.evidence?.secretsRead===false&&wrongBase.evidence?.runtimeExecuted===false&&wrongBase.evidence?.deployExecuted===false;

  const routerFailRoot=initRepo(); const routerFail=execute(routerFailRoot,{ORBIT360_FAKE_ROUTER_MODE:'fail'});
  checks.routerFailureExit41=routerFail.result.status===41;
  checks.routerFailureCheckpoint=routerFail.evidence?.wrapperCheckpoint==='CANONICAL_ROUTER_NONZERO';
  checks.routerFailureInnerCheckPreserved=Array.isArray(routerFail.evidence?.failedCheckIds)&&routerFail.evidence.failedCheckIds.includes('SYNTHETIC_ROUTER_FAILURE');
  checks.routerFailureNoRisk=routerFail.evidence?.secretAccess===false&&routerFail.evidence?.browserExecuted===false&&routerFail.evidence?.deployExecuted===false;

  const routerPassRoot=initRepo(); const routerPass=execute(routerPassRoot,{GITHUB_REF_NAME:'18/merge',ORBIT360_FAKE_ROUTER_MODE:'pass'});
  checks.routerPassExit0=routerPass.result.status===0;
  checks.prMergeRefDoesNotBlock=routerPass.evidence?.status==='GO_GATE_CONTRACT'&&routerPass.evidence?.ok===true;
  checks.routerPassOutput=fs.existsSync(routerPass.outputFile)&&fs.readFileSync(routerPass.outputFile,'utf8').includes('go=true');
  checks.routerPassNoRisk=routerPass.evidence?.secretAccess===false&&routerPass.evidence?.browserExecuted===false&&routerPass.evidence?.deployExecuted===false;
}catch(e){error=String(e&&e.stack||e);}
const failedCheckIds=Object.entries(checks).filter(([,ok])=>!ok).map(([id])=>id);
const evidence={schemaVersion:'orbit360-observable-preflight-wrapper-source-test-v2',gateId:'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',contractVersion:'2.7.8',status:failedCheckIds.length?'STOP_OBSERVABLE_PREFLIGHT_SOURCE_TEST':'PASS_OBSERVABLE_PREFLIGHT_BRANCH_CONTEXT_SOURCE',classification:failedCheckIds.length?'PIPELINE_MECHANISM_FAILURE':'PIPELINE_MECHANISM_FAILURE_CLOSED_SOURCE_ONLY',total:Object.keys(checks).length,passed:Object.values(checks).filter(Boolean).length,failed:failedCheckIds.length,failedCheckIds,checks,orbitOwnedBranchContract:checks.orbitOwnedBranchContract===true,pullRequestBaseRefValidated:checks.pullRequestBaseRefValidated===true,githubRefNameIgnoredForCanonicalBranch:checks.prMergeRefDoesNotBlock===true,routerInnerCheckPreserved:checks.routerFailureInnerCheckPreserved===true,secretsRead:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,containsPasswords:false,error,ok:failedCheckIds.length===0&&!error};
const out=path.join(sourceRoot,'orbit360-platform/runtime-gate-crm-v20260716/observable-preflight-branch-context-source-test-sanitized-v20260806.json');
writeJson(out,evidence); console.log(JSON.stringify(evidence,null,2)); process.exit(evidence.ok?0:41);
