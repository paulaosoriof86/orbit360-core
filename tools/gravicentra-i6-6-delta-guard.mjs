import fs from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';

// The B4-003/004/005/006/007 guards govern their own sealed release epoch.
// I6.6 may not reinterpret their historic HEAD-diff checks against new source.
// The latest successful complete B4 Control Plane run is a frozen prerequisite;
// current-source modifications must be checked separately and fail closed.
const BASE='1ab76bcb2580c11449e5b13c99c84cb7a92eb871';
const HISTORICAL_GUARD_RUN=42840283468;
const HISTORICAL_B4007_SOURCE='45020d748dd5fa4328a96f99fe9919a6fcb207eb';
const HISTORICAL_B4007_ARTIFACT=13681376540;
const MANIFEST_PATH='artifacts/orbit360-recovery/release-control/I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json';
const fail=(reason)=>{throw new Error('I6_6_DELTA_GUARD:'+reason);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const need=(ok,reason)=>{if(!ok)fail(reason);};
const cp=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json','utf8'));
const closure=cp.b4007OwnerOperationalGateClosure20261110||{};
const i6=cp.gateState?.gates?.I6||{};
need(cp.status==='PRODUCTION_ACCEPTED'&&cp.environmentState?.productionAccepted===true,'PRODUCTION_BASE_NOT_ACCEPTED');
need(i6.activeSubgate==='I6.6'&&String(i6.status||'').startsWith('I6_6_'),'WRONG_ACTIVE_SUBGATE');
need(closure.status==='CLOSED_BY_DIRECTION_LIVE_RELEASE_PROVEN_SCOPED_FUNCTIONAL_UAT_CARRIED_FORWARD'&&closure.operationalReleaseClosedByDirection===true,'B4007_NOT_CLOSED');
need(closure.historicalB4006SealPreserved===true,'B4006_HISTORICAL_SEAL_NOT_PRESERVED');
need(closure.sameApprovedSourceSha===HISTORICAL_B4007_SOURCE&&closure.immutablePreviewArtifactId===HISTORICAL_B4007_ARTIFACT,'HISTORICAL_RELEASE_IDENTITY_DRIFT');
need(closure.liveReadbackExactFiles==='218_OF_218_PASS','HISTORICAL_LIVE_READBACK_NOT_SEALED');
need(closure.liveWorkflowRun===42660305513&&closure.governanceWorkflowRun===42660305518,'B4007_WORKFLOW_PROOF_DRIFT');
need(closure.fullSevenUserLiveRoleMatrixCertified===false&&closure.dnsHostingConsoleVerifiedComplete===false,'HISTORICAL_SCOPE_MISREPRESENTED');
need(git('rev-parse','HEAD').match(/^[0-9a-f]{40}$/),'HEAD_INVALID');
const ancestry=spawnSync('git',['merge-base','--is-ancestor',BASE,'HEAD'],{encoding:'utf8'});
need(ancestry.status===0,'B4007_HISTORICAL_GUARD_SOURCE_NOT_ANCESTOR');
const manifest=JSON.parse(fs.readFileSync(MANIFEST_PATH,'utf8'));
need(manifest.schema==='GRAVICENTRA_I6_6_APPROVED_PRODUCT_DELTAS_V1'&&manifest.baselineSuccessfulHead===BASE&&manifest.baselineSuccessfulRun===HISTORICAL_GUARD_RUN,'DELTA_MANIFEST_AUTHORITY_INVALID');
need(Array.isArray(manifest.changes)&&manifest.changes.length>0,'DELTA_MANIFEST_EMPTY');
const approved=new Map(),tests=new Map(),seenChangeIds=new Set();
// An I6.6 path may evolve in the same release branch only through an explicit,
// audited successor. Historical entries retain their original immutable blobs.
// The last linked entry is the sole blob permitted at HEAD.
function approveOrSupersede(entry,changeId){
  const p=entry.path||'';
  need(/^[0-9a-f]{40}$/.test(entry.gitBlobSha||''),'BAD_APPROVED_BLOB:'+p);
  const previous=approved.get(p);
  if(previous){
    const r=entry.replaces;
    need(Boolean(r)&&r.path===p&&r.priorGitBlobSha===previous.gitBlobSha&&
      r.priorChangeId===previous.changeId&&previous.changeId!==changeId&&
      entry.gitBlobSha!==previous.gitBlobSha,
    'UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN:'+p);
  }else{
    need(!entry.replaces,'SUPERSESSION_WITHOUT_PREDECESSOR:'+p);
  }
  approved.set(p,{gitBlobSha:entry.gitBlobSha,changeId});
}
function approveTestOrSupersede(entry,changeId){
  const p=entry.path||'';
  const prior=tests.get(p);
  if(prior&&prior.gitBlobSha!==entry.gitBlobSha){
    const r=entry.replaces;
    need(Boolean(r)&&r.path===p&&r.priorGitBlobSha===prior.gitBlobSha&&
      r.priorChangeId===prior.changeId&&prior.changeId!==changeId,
    'TEST_UNAUTHORIZED_OR_BROKEN_SUPERSESSION_CHAIN:'+p);
  }else need(!entry.replaces,'TEST_SUPERSESSION_WITHOUT_CHANGED_PREDECESSOR:'+p);
  tests.set(p,{gitBlobSha:entry.gitBlobSha,changeId});
}
for(const change of manifest.changes){
  need(/^I6_6_[A-Z0-9_]+$/.test(change.id||'')&&change.approvedByDirection===true&&Array.isArray(change.paths)&&change.paths.length>0,'CHANGE_NOT_AUTHORIZED_OR_MISSING_PATHS');
  need(!seenChangeIds.has(change.id),'DUPLICATE_CHANGE_ID:'+change.id);
  seenChangeIds.add(change.id);
  need(typeof change.receipt==='string'&&change.receipt.length>12,'CHANGE_AUTHORITY_RECEIPT_MISSING:'+change.id);
  need(Array.isArray(change.tests)&&change.tests.length>0,'CHANGE_TESTS_MISSING:'+change.id);
  for(const entry of change.paths){
    const p=entry.path||'';
    // Exact blob + approved receipt + pinned test are required for every path.
    // Allow asset/HTML successors as well as JS without relaxing the gate.
    const frontend=/^orbit360-platform\/[A-Za-z0-9_./-]+\.(?:js|html|css|json|webmanifest|svg|png|jpg|jpeg|webp|woff2?)$/.test(p);
    const backend=/^functions\/[A-Za-z0-9_./-]+\.js$/.test(p);
    // Exact canonical build packager may evolve only with pinned owner receipt and test.
    // Do not admit other tools, alternate packaging scripts or release paths.
    const canonicalBuildTool=p==='tools/gravicentra-i6-1-preview-package.mjs';
    need(frontend||backend||canonicalBuildTool,'UNSUPPORTED_PRODUCT_PATH:'+p);
    approveOrSupersede(entry,change.id);
  }
  for(const entry of change.tests){
    const p=entry.path||'';
    need(/^tools\/gravicentra-i6-6-[A-Za-z0-9_-]+\.test\.cjs$/.test(p)&&/^[0-9a-f]{40}$/.test(entry.gitBlobSha||''),'TEST_WITHOUT_PINNED_IMPLEMENTATION:'+p);
    approveTestOrSupersede(entry,change.id);
  }
}
const expectedPaths=[...approved.keys()].sort();
const diff=git('diff','--name-only',BASE,'HEAD','--','orbit360-platform','functions','tools/gravicentra-i6-1-preview-package.mjs','firestore.rules','storage.rules','database.rules.json','firebase.json').split('\n').filter(Boolean).sort();
need(JSON.stringify(diff)===JSON.stringify(expectedPaths),'UNDECLARED_PRODUCT_SOURCE_DELTA:'+diff.join(','));
for(const [p,approval] of approved){
  need(git('rev-parse','HEAD:'+p)===approval.gitBlobSha,'UNAPPROVED_OR_STALE_SOURCE_BLOB:'+p);
  if(p.endsWith('.js')){
    const syntax=spawnSync(process.execPath,['--check',p],{stdio:'inherit'});
    need(syntax.status===0,'SOURCE_SYNTAX_FAILED:'+p);
  }
}
for(const [p,testApproval] of tests){
  need(git('rev-parse','HEAD:'+p)===testApproval.gitBlobSha,'TEST_BLOB_CHANGED_WITHOUT_MANIFEST:'+p);
  const check=spawnSync(process.execPath,['--check',p],{stdio:'inherit'});
  need(check.status===0,'TEST_SYNTAX_FAILED:'+p);
  const test=spawnSync(process.execPath,[p],{stdio:'inherit',env:process.env});
  need(test.status===0,'DECLARED_CHANGE_TEST_FAILED:'+p);
}
const ledger=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_COBROS_CONCILIACION_SOURCE_INTAKE_20261110.json','utf8'));
need(ledger.lastClosedReleaseGate==='B4-007'&&ledger.currentReleaseGate==='I6.6'&&ledger.productionAccepted===false,'SOURCE_INTAKE_DID_NOT_CARRY_FORWARD_HOLD');
console.log('I6_6_DELTA_GUARD=PASS');
console.log('B4_HISTORICAL_GUARD_REUSED_FROM_SUCCESSFUL_RUN='+HISTORICAL_GUARD_RUN);
console.log('B4_HISTORICAL_SOURCE='+BASE);
console.log('I6_6_SOURCE_SHA='+git('rev-parse','HEAD'));
console.log('I6_6_APPROVED_PRODUCT_DELTA_FILES='+diff.length);
console.log('I6_6_APPROVED_DELTA_TESTS='+tests.size);
console.log('I6_6_PREVIEW_LIVE_NOT_CLAIMED=true');
console.log('I6_6_LIVE_DATA_WRITES=0');
