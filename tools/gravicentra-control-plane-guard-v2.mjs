import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const CONTROL_PATH=process.env.GRAVICENTRA_CONTROL_PLANE||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').split('=')[1];
const MODES=new Set(['governance','i4a','i4b','i5','certified']);
const SHA=/^[0-9a-f]{40}$/;
const HEX64=/^[0-9a-f]{64}$/;
const fail=code=>{throw new Error(code);};
const need=(ok,code)=>{if(!ok)fail(code);};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const exists=p=>fs.existsSync(p);

need(MODES.has(MODE),'CONTROL_PLANE_MODE_INVALID');
need(exists(CONTROL_PATH),'CONTROL_PLANE_MISSING');
const C=readJson(CONTROL_PATH);

need(C.schemaVersion==='gravicentra-control-plane-v2','CONTROL_PLANE_SCHEMA_INVALID');
need(C.controlPlaneId==='GRAVICENTRA-INSURANCE-FASE-A','CONTROL_PLANE_ID_INVALID');
need(C.productBrand==='Gravicentra Insurance','CONTROL_PLANE_PRODUCT_INVALID');
need(C.repository==='paulaosoriof86/orbit360-core','CONTROL_PLANE_REPOSITORY_INVALID');
need(C.branch==='recovery/fase-a-clean-20260831','CONTROL_PLANE_BRANCH_INVALID');
need(SHA.test(String(C.forensicOriginSha||'')),'CONTROL_PLANE_FORENSIC_ORIGIN_INVALID');
need(C.mechanismRules&&C.mechanismRules.singleMutableAuthority==='THIS_FILE','CONTROL_PLANE_SINGLE_AUTHORITY_MISSING');
need(C.mechanismRules.hardcodedReleaseIdentityInWorkflowsForbidden===true,'CONTROL_PLANE_HARDCODE_RULE_MISSING');
need(C.mechanismRules.conversationAsOperationalAuthorityForbidden===true,'CONTROL_PLANE_CONVERSATION_RULE_MISSING');
need(C.mechanismRules.staticSnapshotAsOperationalAuthorityForbidden===true,'CONTROL_PLANE_SNAPSHOT_RULE_MISSING');
need(C.mechanismRules.qaHarnessSelfPatchForbidden===true,'CONTROL_PLANE_QA_PATCH_RULE_MISSING');
need(C.mechanismRules.oneGateExecutorAtATime===true,'CONTROL_PLANE_SINGLE_EXECUTOR_RULE_MISSING');
need(C.mechanismRules.lineageRediscoveryAfterI1ForbiddenWithoutException===true,'CONTROL_PLANE_LINEAGE_REDISCOVERY_RULE_MISSING');
need(C.environmentState&&C.environmentState.productionAccepted===false,'CONTROL_PLANE_PRODUCTION_ALREADY_ACCEPTED');
need(C.environmentState.productionTouchedByRecovery===false,'CONTROL_PLANE_PRODUCTION_TOUCHED');
need(C.environmentState.dataTouchedByRecovery===false,'CONTROL_PLANE_DATA_TOUCHED');
need(C.environmentState.dataCutoff==='2026-07-31','CONTROL_PLANE_DATA_CUTOFF_DRIFT');
need(C.environmentState.augustRefresh==='HOLD','CONTROL_PLANE_AUGUST_NOT_HOLD');

const lineagePath=C.lineageAuthority&&C.lineageAuthority.path;
need(typeof lineagePath==='string'&&lineagePath.length>0,'CONTROL_PLANE_LINEAGE_PATH_MISSING');
need(exists(lineagePath),'LINEAGE_LOCK_MISSING');
const L=readJson(lineagePath);
need(L.schemaVersion==='gravicentra-capability-lineage-lock-v1','LINEAGE_LOCK_SCHEMA_INVALID');
need(L.status==='FROZEN','LINEAGE_LOCK_NOT_FROZEN');
need(L.capabilityCount===15,'LINEAGE_LOCK_CAPABILITY_COUNT_INVALID');
need(Array.isArray(L.capabilities)&&L.capabilities.length===15,'LINEAGE_LOCK_CAPABILITIES_INVALID');
need(L.rules&&L.rules.latestApprovedSearchMustNotRepeatAfterI1Pass===true,'LINEAGE_LOCK_REDISCOVERY_RULE_MISSING');
need(L.rules.onlyCausalLineageExceptionMayChangeThisLock===true,'LINEAGE_LOCK_EXCEPTION_RULE_MISSING');
const closure=L.closure||{};
need(SHA.test(String(closure.blobSha||'')),'LINEAGE_CLOSURE_BLOB_INVALID');
need(exists(closure.path),'LINEAGE_CLOSURE_FILE_MISSING');
const actualClosureBlob=git('hash-object',closure.path);
need(actualClosureBlob===closure.blobSha,'LINEAGE_CLOSURE_BLOB_DRIFT:'+actualClosureBlob);

const R=C.certifiedCandidate||{};
need(SHA.test(String(R.sourceSha||'')),'CONTROL_PLANE_SOURCE_SHA_INVALID');
need(SHA.test(String(R.sourceTree||'')),'CONTROL_PLANE_SOURCE_TREE_INVALID');
need(/^gi-i3-[0-9a-f]{12}-[0-9a-f]{12}$/.test(String(R.buildId||'')),'CONTROL_PLANE_BUILD_ID_INVALID');
need(String(R.buildId).includes(String(R.sourceSha).slice(0,12)),'CONTROL_PLANE_BUILD_SOURCE_MISMATCH');
need(Number.isInteger(R.i3RunId)&&R.i3RunId>0,'CONTROL_PLANE_I3_RUN_INVALID');
need(R.i3Conclusion==='success','CONTROL_PLANE_I3_NOT_SUCCESS');
need(Number.isInteger(R.artifactId)&&R.artifactId>0,'CONTROL_PLANE_ARTIFACT_INVALID');
need(/^sha256:[0-9a-f]{64}$/.test(String(R.artifactArchiveDigest||'')),'CONTROL_PLANE_ARCHIVE_DIGEST_INVALID');
for(const [name,value] of [['hostedPayloadDigest',R.hostedPayloadDigest],['backendSourceDigest',R.backendSourceDigest],['bundleDigest',R.bundleDigest]]) need(HEX64.test(String(value||'')),'CONTROL_PLANE_'+name.toUpperCase()+'_INVALID');
need(R.readbackExact===true&&R.readbackFileCount===R.hostedFileCount,'CONTROL_PLANE_READBACK_INVALID');
need(/^https:\/\/[A-Za-z0-9._-]+\.web\.app$/.test(String(R.previewUrl||'')),'CONTROL_PLANE_PREVIEW_URL_INVALID');
need(R.sameFrontendArtifactPreviewToProductionRequired===true,'CONTROL_PLANE_SAME_FRONTEND_ARTIFACT_RULE_MISSING');
need(R.sameBackendSourcePackageRequiredForI5===true,'CONTROL_PLANE_SAME_BACKEND_PACKAGE_RULE_MISSING');
need(R.sourceMutatedAfterBuild===false,'CONTROL_PLANE_SOURCE_MUTATED_AFTER_BUILD');

try{git('cat-file','-e',R.sourceSha+'^{commit}');}catch{fail('CONTROL_PLANE_SOURCE_COMMIT_NOT_AVAILABLE');}
const sourceTree=git('show','-s','--format=%T',R.sourceSha);
need(sourceTree===R.sourceTree,'CONTROL_PLANE_SOURCE_TREE_MISMATCH:'+sourceTree);
const current=git('rev-parse','HEAD');
try{execFileSync('git',['merge-base','--is-ancestor',R.sourceSha,current],{stdio:'ignore'});}catch{fail('CONTROL_PLANE_SOURCE_NOT_ANCESTOR');}

const allowedControlPrefixes=[
  '.github/workflows/gravicentra-',
  'tools/gravicentra-',
  'artifacts/orbit360-recovery/release-control/'
];
const changed=git('diff','--name-only',R.sourceSha+'..'+current).split(/\r?\n/).filter(Boolean);
const forbidden=changed.filter(p=>!allowedControlPrefixes.some(prefix=>p.startsWith(prefix)));
need(forbidden.length===0,'CONTROL_PLANE_PRODUCT_SOURCE_DRIFT:'+forbidden.slice(0,20).join(','));

const gate=C.gateState||{};
const gates=gate.gates||{};
if(MODE==='governance'){
  need(C.status==='GOVERNANCE_SYNC_IN_PROGRESS'||C.status==='I4A_IN_PROGRESS','GOVERNANCE_MODE_STATE_INVALID');
  need(gates.I3&&['PHYSICAL_PASS_PENDING_GOVERNANCE_SEAL','PASS'].includes(gates.I3.status),'GOVERNANCE_I3_STATE_INVALID');
}
if(MODE==='i4a'||MODE==='certified'){
  need(C.status==='I4A_IN_PROGRESS','I4A_NOT_ACTIVE');
  need(gates.I3&&gates.I3.status==='PASS','I4A_BLOCKED_I3_NOT_PASS');
  need(gates.I4A&&['IN_PROGRESS','PASS'].includes(gates.I4A.status),'I4A_GATE_STATE_INVALID');
}
if(MODE==='i4b'){
  need(C.status==='I4B_IN_PROGRESS','I4B_NOT_ACTIVE');
  need(gates.I4A&&gates.I4A.status==='PASS','I4B_BLOCKED_I4A_NOT_PASS');
}
if(MODE==='i5'){
  need(C.status==='I5_IN_PROGRESS','I5_NOT_ACTIVE');
  need(gates.I4B&&gates.I4B.status==='PASS','I5_BLOCKED_I4B_NOT_PASS');
}

const exportsMap={
  SOURCE_SHA:String(R.sourceSha),
  BUILD_ID:String(R.buildId),
  PREVIEW_URL:String(R.previewUrl),
  HOSTED_PAYLOAD_DIGEST:String(R.hostedPayloadDigest),
  BACKEND_SOURCE_DIGEST:String(R.backendSourceDigest),
  BUNDLE_DIGEST:String(R.bundleDigest),
  I3_RUN_ID:String(R.i3RunId),
  I3_ARTIFACT_ID:String(R.artifactId)
};
for(const [k,v] of Object.entries(exportsMap)){
  if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`${k}=${v}\n`);
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`${k.toLowerCase()}=${v}\n`);
}

console.log('GRAVICENTRA_CONTROL_PLANE_GUARD=PASS');
console.log('MODE='+MODE);
console.log('CONTROL_STATUS='+C.status);
console.log('CURRENT_TRANSITION='+(gate.currentTransition||''));
console.log('NEXT_FROZEN_ITERATION='+(gate.nextFrozenIteration||''));
console.log('SOURCE_SHA='+R.sourceSha);
console.log('BUILD_ID='+R.buildId);
console.log('I3_RUN_ID='+R.i3RunId);
console.log('ARTIFACT_ID='+R.artifactId);
console.log('POST_SOURCE_CHANGED_FILES='+changed.length);
console.log('PRODUCT_SOURCE_DRIFT=false');
console.log('PRODUCTION_TOUCHED=false');
console.log('DATA_TOUCHED=false');
