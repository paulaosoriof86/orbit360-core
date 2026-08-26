#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const OUT=String(process.env.ORBIT360_CONTROL_PLANE_BASELINE_OUT||process.argv[2]||'').trim();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REGISTRY='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const FILES=[
  '.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
  'tools/orbit360-single-state-ledger-owner-v20260826.mjs',
  'tools/orbit360-single-state-invariant-v20260826.mjs',
  REGISTRY,
  'tools/orbit360-go-live-release-handler-v20260826.mjs',
  'tools/orbit360-control-plane-publication-preflight-v20260825.mjs',
  'orbit360-platform/docs/orbit360-control-plane-canonicality-contract-v20260822.json',
  'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',
  'tools/orbit360-control-plane-transport-contract-v20260826.json',
  'tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs',
  'tools/orbit360-f2-data-integrity-readonly-v20260818.mjs',
  'tools/orbit360-f2-compare-integrity-v20260818.mjs',
  'tools/orbit360-m6-resolve-smoke-identity-readonly-v20260730.mjs',
  'tools/orbit360-fase-a-hosting-release-helper-v20260813.mjs',
  'firebase.product-go-live.json',
  'firebase.product-rollback-safe.json'
];
const A=p=>path.resolve(ROOT,p);
const read=p=>fs.readFileSync(A(p));
const json=p=>JSON.parse(read(p).toString('utf8').replace(/^\uFEFF/,''));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=c=>{throw new Error(c);};
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=stable(v[k]),o),{}):v);

try{
  for(const p of [LEDGER,...FILES])if(!fs.existsSync(A(p)))fail(`CONTROL_PLANE_BASELINE_DEPENDENCY_MISSING:${p}`);
  const L=json(LEDGER),R=json(REGISTRY),release=R.executionTransitions?.GO_LIVE_RELEASE_WINDOW||{};
  if(L.activeState?.phase!=='GO_LIVE_RELEASE_HANDLER_READY_P3_HANDSHAKE_REQUIRED'||L.activeState?.status!=='GO_LIVE_RELEASE_HANDLER_READY'||Number(L.progress?.productionRouteProgressPct)!==91)fail('CONTROL_PLANE_BASELINE_LIVE_P2_STATE_REQUIRED');
  if(L.authorizationBoundary?.activeRuntimeAuthorization!==false||L.authorizationBoundary?.activeRequestPath!=null||L.authorizationBoundary?.authorizationRecordPath!=null)fail('CONTROL_PLANE_BASELINE_ACTIVE_AUTH_FORBIDDEN');
  if(L.executionClaim?.active===true)fail('CONTROL_PLANE_BASELINE_ACTIVE_CLAIM_FORBIDDEN');
  if(release.handler!=='tools/orbit360-go-live-release-handler-v20260826.mjs'||release.handlerReady!==true||release.from?.phase!=='CONTROL_PLANE_FROZEN_BASELINE_AWAITING_GO_LIVE_AUTHORIZATION'||release.from?.status!=='FINAL_RELEASE_HANDSHAKE_PASS'||Number(release.from?.progress)!==93)fail('CONTROL_PLANE_BASELINE_RELEASE_TRANSITION_NOT_FINAL');
  const candidate={
    artifactId:Number(L.successorCandidate?.artifactId),
    sourceHead:String(L.successorCandidate?.sourceHead||''),
    artifactDigest:String(L.successorCandidate?.artifactDigest||''),
    zipSha256:String(L.successorCandidate?.zipSha256||''),
    manifestSha256:String(L.successorCandidate?.manifestSha256||''),
    fileCount:Number(L.successorCandidate?.fileCount)
  };
  if(!Number.isInteger(candidate.artifactId)||candidate.artifactId<=0||!/^[a-f0-9]{40}$/.test(candidate.sourceHead)||!/^[a-f0-9]{64}$/.test(candidate.zipSha256)||!/^[a-f0-9]{64}$/.test(candidate.manifestSha256)||!Number.isInteger(candidate.fileCount)||candidate.fileCount<=0)fail('CONTROL_PLANE_BASELINE_CANDIDATE_IDENTITY_INVALID');
  const fileHashes=Object.fromEntries(FILES.map(p=>[p,sha(read(p))]));
  const contract={
    schemaVersion:'orbit360-control-plane-frozen-baseline-v1',
    status:'CONTROL_PLANE_FROZEN_BASELINE_SOURCE_ONLY_PASS',
    canonicalBranch:String(L.branch),
    ledgerRevision:Number(L.revision),
    candidate,
    releaseTransition:{
      handler:release.handler,
      handlerReady:release.handlerReady===true,
      capabilityClass:release.capabilityClass,
      stateMutation:release.stateMutation,
      requiresExplicitUserAuthorization:release.requiresExplicitUserAuthorization===true,
      from:release.from,
      requiredScope:release.requiredScope,
      releaseHandlerContract:release.releaseHandlerContract
    },
    fileHashes
  };
  const aggregateSha256=sha(Buffer.from(JSON.stringify(stable(contract)),'utf8'));
  const out={...contract,ok:true,classification:'PASS',aggregateSha256,controlPlaneFileCount:FILES.length,singleMutableOperationalState:LEDGER,stateBearingFileCount:Array.isArray(R.stateBearingFiles)?R.stateBearingFiles.length:0,projectionTargetCount:Array.isArray(R.projectionTargets)?R.projectionTargets.length:-1,authorizationActive:false,executionClaimActive:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  if(OUT){const p=path.resolve(OUT);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n','utf8');}
  console.log(JSON.stringify(out,null,2));
}catch(error){const out={schemaVersion:'orbit360-control-plane-frozen-baseline-v1',ok:false,status:'CONTROL_PLANE_FROZEN_BASELINE_SOURCE_ONLY_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code:String(error?.message||error),runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};if(OUT){const p=path.resolve(OUT);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(out,null,2)+'\n','utf8');}console.error(JSON.stringify(out,null,2));process.exit(41);}
