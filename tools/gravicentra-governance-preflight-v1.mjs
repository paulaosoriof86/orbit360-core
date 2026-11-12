import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const allowedModes=new Set(['governance','i2','i3','i4a','i4b','i5','i6','certified']);
const arg=process.argv.find(x=>x.startsWith('--mode='));
const mode=arg?arg.slice('--mode='.length):'governance';
if(!allowedModes.has(mode)) throw new Error('GRAVICENTRA_PREFLIGHT_MODE_INVALID:'+mode);

function run(cmd,args){
  const r=spawnSync(cmd,args,{stdio:'inherit',env:process.env});
  if(r.error) throw r.error;
  if(r.status!==0) throw new Error('GRAVICENTRA_PREFLIGHT_COMMAND_FAILED:'+cmd+' '+args.join(' ')+':'+String(r.status));
}

// Preserve a universal governance trigger. A path-filter here silently skipped
// Inicio/Equipo changes while allowing older release proof to look current.
const workflowTrigger=fs.readFileSync('.github/workflows/gravicentra-release-lock-sync.yml','utf8').split(/^permissions:/m)[0];
const canonicalPush='  push:\n    branches:\n      - recovery/fase-a-clean-20260831\n';
if(!workflowTrigger.includes(canonicalPush)||/^    paths(?:-ignore)?:/m.test(workflowTrigger))
  throw new Error('GRAVICENTRA_CANONICAL_GUARD_PUSH_PATH_FILTER_FORBIDDEN');

const node=process.execPath;
const controlPath='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const control=JSON.parse(fs.readFileSync(controlPath,'utf8'));
const postI5=control.status==='PRODUCTION_ACCEPTED'||control.environmentState?.productionAccepted===true;
const i6Status=String(control.gateState?.gates?.I6?.status||'');
const i6Active=control.i6Execution?.authorized===true||(!['','HOLD_PENDING_EXPLICIT_AUTHORIZATION'].includes(i6Status));
const preI5Guard='tools/gravicentra-control-plane-guard-v2.mjs';
const postI5Guard='tools/gravicentra-post-i5-control-plane-guard-v1.mjs';
const i6Guard='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const i66Guard='tools/gravicentra-i6-6-delta-guard.mjs';
const i66Active=i6Active&&control.gateState?.gates?.I6?.activeSubgate==='I6.6';
// An immutable Hosting promotion and a separately authorized Preview-only
// backend reader are different operations. Keep their permission flags scoped,
// and fail closed if mutable release summaries disagree on actual LIVE bytes.
if(i66Active){
  const transport=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json','utf8'));
  // Release pointers are immutable daily snapshots. The 11-Nov R4 pointer
  // remains historical; the exact R5 LIVE successor is the active sidecar.
  const pointer='artifacts/orbit360-recovery/release-control/I6_6_LATEST_EXACT_LIVE_POINTER_20261112.json';
  const latest=fs.existsSync(pointer)?JSON.parse(fs.readFileSync(pointer,'utf8')):
    control.i66LatestExactLiveRelease20261111;
  const live=transport.currentExactHostingRelease;
  const r4=transport.latestExactHostingPromotionR4;
  const fields=[
    [latest?.latestProductSourceSha,live?.sourceSha],
    [latest?.latestProductBuildId,live?.buildId],
    [latest?.immutableArtifactId,live?.artifactId],
    [latest?.immutableArtifactZipSha256,live?.artifactDigest],
    [latest?.releaseRunId,live?.liveCloneRunId],
    [latest?.latestPreviewBuildRunId,live?.previewRunId],
    [latest?.latestReleaseReceipt,live?.receipt]
  ];
  if(!live||!['PUBLISHED_EXACT_NOT_FULL_FUNCTIONAL_UAT','PUBLISHED_EXACT_FUNCTIONAL_UAT_PASS'].includes(live.status)||
     fields.some(([a,b])=>!a||!b||a!==b)||
     (live.sourceSha===r4?.sourceSha&&
       (live.artifactId!==r4.artifactId||live.liveCloneRunId!==r4.liveCloneRunId))||
     transport.authorizationFlagScopeClarification20261111?.exactR4LiveHostingPromotionConfirmed!==true||
     (transport.scope==='I6_6_ACTIVE_READER_PREVIEW_AUTHORIZATION_FLAGS_WITH_HISTORICAL_EXACT_R4_LIVE_HOSTING_RECEIPT'&&
       (transport.livePromotionAuthorized!==false||transport.previewApproved!==false))||
     (live.status==='PUBLISHED_EXACT_NOT_FULL_FUNCTIONAL_UAT'&&latest.doNotClaimWholePlatformQaPass!==true))
    throw new Error('I6_6_EXACT_LIVE_RELEASE_POINTER_OR_READER_AUTHORIZATION_DRIFT');
}
const activeGuard=i66Active?i66Guard:(i6Active?i6Guard:(postI5?postI5Guard:preI5Guard));
const evergreenGuard='tools/gravicentra-evergreen-sources-invariant-v2.mjs';
const syntaxTargets=[
  preI5Guard,
  postI5Guard,
  i6Guard,
  i66Guard,
  'tools/gravicentra-mechanism-invariant-v2.mjs',
  evergreenGuard,
  'tools/gravicentra-i4a-proof-registry-guard-v1.mjs',
  'tools/gravicentra-i4a-preview-function-remediation-guard-v1.mjs',
  'tools/gravicentra-i4a-preview-remediation-invariant-v1.mjs'
];
for(const p of syntaxTargets) run(node,['--check',p]);

if(i6Active&&['i2','i3','i4a','i4b','i5'].includes(mode)) throw new Error('GRAVICENTRA_PRIOR_GATE_REENTRY_BLOCKED_DURING_I6:'+mode);
run(node,[activeGuard,'--mode=governance']);
run(node,['tools/gravicentra-i4a-proof-registry-guard-v1.mjs']);
run(node,['tools/gravicentra-mechanism-invariant-v2.mjs']);
run(node,[evergreenGuard]);
run(node,['tools/gravicentra-i4a-preview-remediation-invariant-v1.mjs']);
if(mode==='i6'){
  if(!i6Active) throw new Error('GRAVICENTRA_I6_MODE_BEFORE_I6_ACTIVE');
  run(node,[activeGuard,'--mode=i6']);
}else if(mode!=='governance'&&mode!=='certified'){
  run(node,[activeGuard,'--mode='+mode]);
}
run('git',['diff','--exit-code']);

console.log('GRAVICENTRA_GOVERNANCE_PREFLIGHT=PASS');
console.log('PREFLIGHT_MODE='+mode);
console.log('CONTROL_STATUS='+control.status);
console.log('ACTIVE_CONTROL_GUARD='+activeGuard);
console.log('I6_ACTIVE='+String(i6Active));
console.log('I6_6_ACTIVE='+String(i66Active));
console.log('SAME_HEAD_GOVERNANCE_AND_GATE_GUARD=true');
console.log('PRODUCT_SOURCE_MUTATION=false');
console.log('PRODUCTION_ACCEPTED='+String(control.environmentState?.productionAccepted===true));
console.log('PRODUCTION_TOUCHED='+String(control.environmentState?.productionTouchedByRecovery===true));
console.log('CONTROLLED_DATA_TOUCHED='+String(control.environmentState?.dataTouchedByRecovery===true));
console.log('AUGUST_REFRESH='+String(control.environmentState?.augustRefresh||''));
console.log('PROJECT_SOURCES='+String(control.projectSources?.activePackage||''));
