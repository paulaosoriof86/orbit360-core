'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const dir = 'artifacts/orbit360-recovery/release-control/';
const transportPath = dir+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json';
const manifest = dir+'I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json';
const branch = 'recovery/fase-a-clean-20260831';
const git = (...args) => execFileSync('git',args,{encoding:'utf8'}).trim();

function previewRequestTransition(request, previousRequest) {
  if (JSON.stringify(request) === JSON.stringify(previousRequest)) return false;
  assert.ok(Number.isSafeInteger(request?.version) && request.version > 0,
    'PREVIEW_REQUEST_VERSION_INVALID');
  assert.equal(request.version,(previousRequest?.version || 0)+1,'PREVIEW_REQUEST_VERSION_DRIFT');
  return true;
}

async function admitPreview(transport,api,readMarker) {
  const request = transport.frontendPreviewRequest;
  const previous = JSON.parse(git('show','HEAD^:'+transportPath));
  if (!previewRequestTransition(request,previous.frontendPreviewRequest)) return false;
  const composite=request.mode==='COMPOSITE_ARTIFACT_HOSTING_PREVIEW_ONLY';
  assert.ok(request.mode==='PREVIEW_HOSTING_ONLY'||composite,'PREVIEW_REQUEST_MODE_INVALID');
  if(composite){
    assert.equal(request.backendPreviewRequired,true,'BACKEND_PREVIEW_ACCEPTANCE_REQUIRED');
    assert.equal(request.backendLiveDeployAllowed,false,'NO_UNCERTIFIED_BACKEND_LIVE');
    assert.equal(request.realDataWritesAllowed,false,'NO_REAL_WRITES_IN_PREVIEW');
    assert.deepEqual(request.backendPaths,['functions/product-ops-leads-domain.js'],'BACKEND_OWNER_SCOPE_DRIFT');
    assert.equal(request.backendPathBlobs?.[request.backendPaths[0]],
      git('rev-parse',request.sourceQaHead+':'+request.backendPaths[0]),'BACKEND_SOURCE_BLOB_DRIFT');
  }
  assert.equal(transport.livePromotionAuthorized,false);
  assert.equal(transport.noHostingPromotion,true);
  assert.equal(transport.forbidBackendFunctionDeploy,true);
  assert.equal(transport.forbidFirestoreRulesDataAuthWrites,true);
  const control = JSON.parse(fs.readFileSync(dir+'CONTROL_PLANE.json'));
  assert.equal(control.gateState.gates.I6.activeSubgate,'I6.6');
  const current = control[control.currentExecutionDecisionPointer];
  const physical = transport.currentPhysicalHostingRelease;
  assert.ok(current && physical && request.previousReceiptBlob);
  assert.equal(current.receiptGitBlobSha, request.previousReceiptBlob);
  assert.equal(git('rev-parse','HEAD:'+current.receiptPath),request.previousReceiptBlob);
  for (const field of ['artifactId','artifactDigest','sourceSha','buildId'])
    assert.equal(current[field],physical[field]);
  assert.equal(current.hostingVersion,physical.liveHostingVersion);
  assert.match(request.sourceQaHead,/^[0-9a-f]{40}$/);
  assert.match(request.manifestBlob,/^[0-9a-f]{40}$/);
  git('merge-base','--is-ancestor',current.sourceSha,request.sourceQaHead);
  git('merge-base','--is-ancestor',request.sourceQaHead,'HEAD');
  assert.equal(git('rev-parse',request.sourceQaHead+':'+manifest),request.manifestBlob);
  assert.equal(git('rev-parse','HEAD:'+manifest),request.manifestBlob);
  const roots = ['orbit360-platform','functions','firebase.json','storage.rules','firestore.rules',
    'database.rules.json','tools/gravicentra-i6-1-preview-package.mjs',':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json'];
  git('diff','--quiet',request.sourceQaHead,'HEAD','--',...roots);
  const paths=git('diff','--name-only',current.sourceSha,request.sourceQaHead,'--',...roots).split('\n');
  const frontendPath=p=>/^orbit360-platform\/(modules|core)\/[\w.-]+\.js$/.test(p);
  if(composite){
    assert.ok(paths.some(frontendPath),'COMPOSITE_FRONTEND_MISSING');
    assert.deepEqual(paths.filter(p=>!frontendPath(p)),request.backendPaths,'COMPOSITE_BACKEND_EXACT_SCOPE_REQUIRED');
  }else{
    assert.ok(paths.length && paths.every(frontendPath),'PREVIEW_SCOPE_DRIFT');
  }
  assert.deepEqual(request.productPaths,paths);
  const runs = [[request.sourceQaRunId,'gravicentra-i66-privileged-role-parity-source-qa.yml'],
    [request.guardRunId,'gravicentra-release-lock-sync.yml']];
  for (const [runId,workflow] of runs) {
    assert.ok(Number.isSafeInteger(runId) && runId>0);
    const run=await api('runs/'+runId);
    assert.deepEqual([run.head_sha,run.head_branch,run.path,run.status,run.conclusion],
      [request.sourceQaHead,branch,'.github/workflows/'+workflow,'completed','success']);
    const jobs=await api('runs/'+runId+'/jobs?per_page=100');
    assert.ok(jobs.jobs.some(j=>j.conclusion==='success' && j.steps?.some(s=>s.conclusion==='success' && s.number>2)));
  }
  const artifact=await api('artifacts/'+current.artifactId);
  assert.equal(artifact.digest,current.artifactDigest);
  assert.equal(artifact.workflow_run.head_sha,current.sourceSha);
  for(const origin of ['https://app.aysseguros.com','https://ays-orbit-360-lab.web.app']) {
    const marker=await readMarker(origin);
    assert.deepEqual([marker.sourceSha,marker.buildId],[current.sourceSha,current.buildId]);
  }
  return true;
}
module.exports={admitPreview,previewRequestTransition};
