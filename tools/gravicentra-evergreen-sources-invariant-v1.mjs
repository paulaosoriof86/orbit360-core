import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const MANIFEST='artifacts/orbit360-recovery/project-sources-v2/v3/05_MANIFIESTO_FUENTES_EVERGREEN_V3.json';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const LINEAGE='artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json';
const STATUS='artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json';
const PLAN='artifacts/orbit360-recovery/release-control/PLAN_TRABAJO_CONGELADO_V2.md';
const PLAN_ADDENDUM='artifacts/orbit360-recovery/release-control/PLAN_TRABAJO_CONGELADO_V2_ADDENDUM_EVERGREEN_20260909.md';
const ROOT='artifacts/orbit360-recovery/project-sources-v2/v3/';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
for(const p of [MANIFEST,CONTROL,LINEAGE,STATUS,PLAN,PLAN_ADDENDUM]) need(fs.existsSync(p),'EVERGREEN_V3_REQUIRED_FILE_MISSING:'+p);
const m=json(MANIFEST), c=json(CONTROL), l=json(LINEAGE), s=json(STATUS);
need(m.schemaVersion==='gravicentra-project-sources-evergreen-v3','EVERGREEN_V3_MANIFEST_SCHEMA_INVALID');
need(m.packageId==='GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V3','EVERGREEN_V3_PACKAGE_ID_INVALID');
need(m.operationalAuthority===CONTROL,'EVERGREEN_V3_OPERATIONAL_AUTHORITY_DRIFT');
need(m.lineageAuthority===LINEAGE,'EVERGREEN_V3_LINEAGE_AUTHORITY_DRIFT');
need(m.capabilityStatusAuthority===STATUS,'EVERGREEN_V3_STATUS_AUTHORITY_DRIFT');
need(m.frozenExecutionPlan===PLAN,'EVERGREEN_V3_PLAN_AUTHORITY_DRIFT');
need(m.frozenPlanInterpretationAddendum===PLAN_ADDENDUM,'EVERGREEN_V3_PLAN_ADDENDUM_DRIFT');
for(const key of ['containsCurrentGate','containsCurrentHead','containsCurrentRunId','containsCurrentBuildId','containsCurrentPreviewUrl','containsMutablePassPendingState']) need(m[key]===false,'EVERGREEN_V3_MUTABLE_STATE_FLAG_INVALID:'+key);
need(Array.isArray(m.canonicalFiles)&&m.canonicalFiles.length===5,'EVERGREEN_V3_CANONICAL_FILE_COUNT_INVALID');
for(const f of m.canonicalFiles){
  need(typeof f.path==='string'&&f.path.startsWith(ROOT),'EVERGREEN_V3_PATH_INVALID');
  need(/^[0-9a-f]{40}$/.test(String(f.gitBlobSha||'')),'EVERGREEN_V3_BLOB_SHA_INVALID:'+f.path);
  need(fs.existsSync(f.path),'EVERGREEN_V3_FILE_MISSING:'+f.path);
  const actual=git('hash-object',f.path);
  need(actual===f.gitBlobSha,'EVERGREEN_V3_FILE_BLOB_DRIFT:'+f.path+':'+actual);
  const text=read(f.path);
  need(!/https:\/\/ays-orbit-360-lab--gi-i3-[A-Za-z0-9-]+\.web\.app/.test(text),'EVERGREEN_V3_CURRENT_PREVIEW_URL_FORBIDDEN:'+f.path);
  need(!/\bgi-i3-[0-9a-f]{12}-[0-9a-f]{12}\b/.test(text),'EVERGREEN_V3_CURRENT_BUILD_ID_FORBIDDEN:'+f.path);
  need(!/\b343\d{8}\b/.test(text),'EVERGREEN_V3_CURRENT_RUN_ID_FORBIDDEN:'+f.path);
}
need(m.replacementPolicy?.operationalStateChangeRequiresReplacement===false,'EVERGREEN_V3_OPERATIONAL_REPLACEMENT_POLICY_INVALID');
need(m.replacementPolicy?.normativePermanentChangeRequiresHigherVersion===true,'EVERGREEN_V3_NORMATIVE_REPLACEMENT_POLICY_INVALID');
need(m.replacementPolicy?.controlPlaneFlag==='projectSources.staticSourceUpdateRequired','EVERGREEN_V3_NOTIFICATION_FLAG_INVALID');
need(c.projectSources?.activePackage===m.packageId,'EVERGREEN_V3_CONTROL_ACTIVE_PACKAGE_MISMATCH');
need(c.projectSources?.activeVersion===3,'EVERGREEN_V3_CONTROL_ACTIVE_VERSION_MISMATCH');
need(c.projectSources?.canonicalRoot===ROOT.slice(0,-1),'EVERGREEN_V3_CONTROL_ROOT_MISMATCH');
need(c.projectSources?.manifestPath===MANIFEST,'EVERGREEN_V3_CONTROL_MANIFEST_MISMATCH');
need(typeof c.projectSources?.staticSourceUpdateRequired==='boolean','EVERGREEN_V3_UPDATE_FLAG_MISSING');
if(c.projectSources.staticSourceUpdateRequired===false) need(c.projectSources.reason==null,'EVERGREEN_V3_FALSE_FLAG_REASON_MUST_BE_NULL');
if(c.projectSources.staticSourceUpdateRequired===true) need(typeof c.projectSources.reason==='string'&&c.projectSources.reason.length>0,'EVERGREEN_V3_TRUE_FLAG_REASON_REQUIRED');

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
const lineageIds=new Set(l.capabilities||[]), seen=new Set();
const allowedPreview=new Set(['EVIDENCE_IMPORT_PENDING_NO_REOPEN','PARTIAL_PROBE_PASS_NOT_CLOSED','BLOCKED_CAUSAL_RUNTIME_BOUNDARY','OPEN_RETEST_TRANSIENT_VALIDATOR','LATEST_APPROVED_VERSION_PREVIEW_PASS']);
const allowedLive=new Set(['NOT_STARTED_I5_BLOCKED','LATEST_APPROVED_VERSION_LIVE_PASS']);
for(const x of s.capabilities){
  need(typeof x.id==='string'&&lineageIds.has(x.id),'CAPABILITY_STATUS_UNKNOWN_ID:'+x.id);
  need(!seen.has(x.id),'CAPABILITY_STATUS_DUPLICATE_ID:'+x.id); seen.add(x.id);
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
need(seen.size===lineageIds.size,'CAPABILITY_STATUS_LINEAGE_COVERAGE_MISMATCH');
console.log('GRAVICENTRA_EVERGREEN_SOURCES_INVARIANT=PASS');
console.log('ACTIVE_PACKAGE='+m.packageId);
console.log('EVERGREEN_FILE_COUNT='+m.canonicalFiles.length);
console.log('CAPABILITY_STATUS_LEDGER_INVARIANT=PASS');
console.log('CAPABILITY_COUNT='+seen.size);
console.log('STATIC_SOURCE_UPDATE_REQUIRED='+c.projectSources.staticSourceUpdateRequired);
