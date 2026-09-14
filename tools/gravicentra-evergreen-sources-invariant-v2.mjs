import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const LINEAGE='artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json';
const STATUS='artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json';
const PLAN='artifacts/orbit360-recovery/release-control/PLAN_TRABAJO_CONGELADO_V2.md';
const PLAN_ADDENDUM='artifacts/orbit360-recovery/release-control/PLAN_TRABAJO_CONGELADO_V2_ADDENDUM_EVERGREEN_20260909.md';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));

for(const p of [CONTROL,LINEAGE,STATUS,PLAN,PLAN_ADDENDUM]) need(fs.existsSync(p),'EVERGREEN_REQUIRED_FILE_MISSING:'+p);
const c=json(CONTROL),l=json(LINEAGE),s=json(STATUS);
const ps=c.projectSources||{};
need(typeof ps.manifestPath==='string'&&ps.manifestPath.length>0,'EVERGREEN_ACTIVE_MANIFEST_MISSING');
need(fs.existsSync(ps.manifestPath),'EVERGREEN_ACTIVE_MANIFEST_FILE_MISSING:'+ps.manifestPath);
const m=json(ps.manifestPath);
const inferredVersion=Number(m.version??((String(m.schemaVersion||'').match(/v(\d+)$/)||[])[1]));

need(m.packageId===ps.activePackage,'EVERGREEN_CONTROL_PACKAGE_MISMATCH');
need(Number.isInteger(inferredVersion)&&inferredVersion===Number(ps.activeVersion),'EVERGREEN_CONTROL_VERSION_MISMATCH');
need(m.operationalAuthority===CONTROL,'EVERGREEN_OPERATIONAL_AUTHORITY_DRIFT');
need(m.lineageAuthority===LINEAGE,'EVERGREEN_LINEAGE_AUTHORITY_DRIFT');
need(m.capabilityStatusAuthority===STATUS,'EVERGREEN_STATUS_AUTHORITY_DRIFT');
need(m.frozenExecutionPlan===PLAN,'EVERGREEN_PLAN_AUTHORITY_DRIFT');
need(m.frozenPlanInterpretationAddendum===PLAN_ADDENDUM,'EVERGREEN_PLAN_ADDENDUM_DRIFT');
for(const key of ['containsCurrentGate','containsCurrentHead','containsCurrentRunId','containsCurrentBuildId','containsCurrentPreviewUrl','containsMutablePassPendingState']) need(m[key]===false,'EVERGREEN_MUTABLE_STATE_FLAG_INVALID:'+key);
need(Array.isArray(m.canonicalFiles)&&m.canonicalFiles.length>=5,'EVERGREEN_CANONICAL_FILE_COUNT_INVALID');
const seen=new Set();
for(const f of m.canonicalFiles){
  need(typeof f.path==='string'&&f.path.startsWith('artifacts/orbit360-recovery/project-sources-v2/'),'EVERGREEN_PATH_INVALID');
  need(!seen.has(f.path),'EVERGREEN_DUPLICATE_CANONICAL_PATH:'+f.path); seen.add(f.path);
  need(/^[0-9a-f]{40}$/.test(String(f.gitBlobSha||'')),'EVERGREEN_BLOB_SHA_INVALID:'+f.path);
  need(fs.existsSync(f.path),'EVERGREEN_FILE_MISSING:'+f.path);
  const actual=git('hash-object',f.path);
  need(actual===f.gitBlobSha,'EVERGREEN_FILE_BLOB_DRIFT:'+f.path+':'+actual);
  const text=read(f.path);
  need(!/https:\/\/ays-orbit-360-lab--gi-i3-[A-Za-z0-9-]+\.web\.app/.test(text),'EVERGREEN_CURRENT_PREVIEW_URL_FORBIDDEN:'+f.path);
  need(!/\bgi-i3-[0-9a-f]{12}-[0-9a-f]{12}\b/.test(text),'EVERGREEN_CURRENT_BUILD_ID_FORBIDDEN:'+f.path);
}
need(m.replacementPolicy?.operationalStateChangeRequiresReplacement===false,'EVERGREEN_OPERATIONAL_REPLACEMENT_POLICY_INVALID');
need(m.replacementPolicy?.normativePermanentChangeRequiresHigherVersion===true,'EVERGREEN_NORMATIVE_REPLACEMENT_POLICY_INVALID');
need(m.replacementPolicy?.controlPlaneFlag==='projectSources.staticSourceUpdateRequired','EVERGREEN_NOTIFICATION_FLAG_INVALID');
need(typeof ps.staticSourceUpdateRequired==='boolean','EVERGREEN_UPDATE_FLAG_MISSING');
if(ps.staticSourceUpdateRequired===false) need(ps.reason==null,'EVERGREEN_FALSE_FLAG_REASON_MUST_BE_NULL');
if(ps.staticSourceUpdateRequired===true) need(typeof ps.reason==='string'&&ps.reason.length>0,'EVERGREEN_TRUE_FLAG_REASON_REQUIRED');

if(inferredVersion===4){
  need(m.schemaVersion==='gravicentra-project-sources-evergreen-v4','EVERGREEN_V4_SCHEMA_INVALID');
  need(m.compositionModel==='IMMUTABLE_RETAINED_V3_PLUS_V4_ADDENDUM','EVERGREEN_V4_COMPOSITION_INVALID');
  need(m.canonicalFiles.length===6,'EVERGREEN_V4_CANONICAL_FILE_COUNT_INVALID');
  need(m.canonicalFiles.filter(x=>x.disposition==='RETAIN_UNCHANGED').length===5,'EVERGREEN_V4_RETAINED_COUNT_INVALID');
  need(m.canonicalFiles.filter(x=>x.disposition==='ADD_AS_SIXTH_SOURCE').length===1,'EVERGREEN_V4_ADD_COUNT_INVALID');
  need(m.projectSourceUserAction?.resultingSourceCount===6,'EVERGREEN_V4_USER_SOURCE_COUNT_INVALID');
  need(Array.isArray(m.projectSourceUserAction?.remove)&&m.projectSourceUserAction.remove.length===0,'EVERGREEN_V4_REMOVE_MUST_BE_EMPTY');
  need(m.synchronizationContract?.manifestPinsEveryStaticSourceByGitBlobSha===true,'EVERGREEN_V4_SHA_PINNING_REQUIRED');
  need(m.synchronizationContract?.retainedFilesAreNotCopiedOrRewritten===true,'EVERGREEN_V4_RETAINED_IMMUTABILITY_REQUIRED');
  need(m.synchronizationContract?.guardMustFailClosedOnBlobDriftOrPackageMismatch===true,'EVERGREEN_V4_FAIL_CLOSED_REQUIRED');
}

need(s.schemaVersion==='gravicentra-capability-status-ledger-v1','CAPABILITY_STATUS_SCHEMA_INVALID');
need(s.authorityType==='DERIVED_MUTABLE_STATUS_LEDGER','CAPABILITY_STATUS_AUTHORITY_TYPE_INVALID');
need(s.notAuthorityForGateOrReleaseIdentity===true,'CAPABILITY_STATUS_AUTHORITY_ESCALATION');
need(s.controlPlanePath===CONTROL,'CAPABILITY_STATUS_CONTROL_PATH_DRIFT');
need(s.lineageLockPath===LINEAGE,'CAPABILITY_STATUS_LINEAGE_PATH_DRIFT');
need(c.capabilityStatusAuthority?.path===STATUS,'CONTROL_PLANE_CAPABILITY_STATUS_PATH_DRIFT');
need(c.capabilityStatusAuthority?.mayGovernGate===false,'CONTROL_PLANE_STATUS_GATE_AUTHORITY_INVALID');
need(c.capabilityStatusAuthority?.mayGovernReleaseIdentity===false,'CONTROL_PLANE_STATUS_RELEASE_AUTHORITY_INVALID');
const r=c.certifiedCandidate||{}, b=s.releaseBinding||{};
for(const k of ['sourceSha','buildId','artifactArchiveDigest','previewChannelId']) need(String(b[k]||'')===String(r[k]||''),'CAPABILITY_STATUS_RELEASE_BINDING_MISMATCH:'+k);
need(Number(b.artifactId)===Number(r.artifactId),'CAPABILITY_STATUS_RELEASE_BINDING_MISMATCH:artifactId');
need(Array.isArray(s.capabilities)&&s.capabilities.length===15,'CAPABILITY_STATUS_COUNT_INVALID');
const lineageIds=new Set(l.capabilities||[]), capabilitySeen=new Set();
const allowedPreview=new Set(['EVIDENCE_IMPORT_PENDING_NO_REOPEN','PARTIAL_PROBE_PASS_NOT_CLOSED','BLOCKED_CAUSAL_RUNTIME_BOUNDARY','OPEN_RETEST_TRANSIENT_VALIDATOR','LATEST_APPROVED_VERSION_PREVIEW_PASS']);
const allowedLive=new Set(['NOT_STARTED_I5_BLOCKED','LATEST_APPROVED_VERSION_LIVE_PASS']);
for(const x of s.capabilities){
  need(typeof x.id==='string'&&lineageIds.has(x.id),'CAPABILITY_STATUS_UNKNOWN_ID:'+x.id);
  need(!capabilitySeen.has(x.id),'CAPABILITY_STATUS_DUPLICATE_ID:'+x.id); capabilitySeen.add(x.id);
  need(x.lineageStatus==='FROZEN','CAPABILITY_STATUS_LINEAGE_NOT_FROZEN:'+x.id);
  need(allowedPreview.has(x.previewAcceptance?.status),'CAPABILITY_STATUS_PREVIEW_STATE_INVALID:'+x.id);
  need(allowedLive.has(x.liveAcceptance?.status),'CAPABILITY_STATUS_LIVE_STATE_INVALID:'+x.id);
  if(x.previewAcceptance.status==='LATEST_APPROVED_VERSION_PREVIEW_PASS') need(Array.isArray(x.previewAcceptance.evidence)&&x.previewAcceptance.evidence.length>0,'CAPABILITY_STATUS_PREVIEW_PASS_WITHOUT_EVIDENCE:'+x.id);
  if(x.liveAcceptance.status==='LATEST_APPROVED_VERSION_LIVE_PASS'){
    need(Array.isArray(x.liveAcceptance.evidence)&&x.liveAcceptance.evidence.length>0,'CAPABILITY_STATUS_LIVE_PASS_WITHOUT_EVIDENCE:'+x.id);
    need(c.environmentState?.productionAccepted===true,'CAPABILITY_STATUS_LIVE_PASS_BEFORE_PRODUCTION_ACCEPTED:'+x.id);
    need(c.gateState?.gates?.I5?.status==='PASS','CAPABILITY_STATUS_LIVE_PASS_BEFORE_I5:'+x.id);
  }
}
need(capabilitySeen.size===lineageIds.size,'CAPABILITY_STATUS_LINEAGE_COVERAGE_MISMATCH');
console.log('GRAVICENTRA_EVERGREEN_SOURCES_INVARIANT_V2=PASS');
console.log('ACTIVE_PACKAGE='+m.packageId);
console.log('ACTIVE_VERSION='+inferredVersion);
console.log('EVERGREEN_FILE_COUNT='+m.canonicalFiles.length);
console.log('CAPABILITY_STATUS_LEDGER_INVARIANT=PASS');
console.log('CAPABILITY_COUNT='+capabilitySeen.size);
console.log('STATIC_SOURCE_UPDATE_REQUIRED='+ps.staticSourceUpdateRequired);
