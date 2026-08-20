#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd(),a=p=>path.join(ROOT,p),txt=p=>fs.readFileSync(a(p),'utf8').replace(/^\uFEFF/,''),json=p=>JSON.parse(txt(p));
const P={ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',live:'orbit360-platform/docs/orbit360-live-state-v1.json',index:'orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json',life:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',readme:'README.md',change:'orbit360-platform/CHANGELOG.md',prState:'orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md'};
const OUT=a(process.env.ORBIT360_CONTINUITY_OUT||'orbit360-platform/runtime-gate-crm-v20260716/f2-continuity-audit-v20260820.json');
const L=json(P.ledger),G=json(P.registry),live=json(P.live),idx=json(P.index),life=json(P.life),h=L.history?.latestConsumedRuntime||{},c=L.candidateBoundary||{},cand=L.successorCandidate||null,R=json(h.requestPath),A=json(h.authorizationPath),root=json(L.sourceRootCauseResolution.rootfixEvidencePath),causal=json(L.sourceRootCauseResolution.causalProofPath),readme=txt(P.readme),change=txt(P.change),prState=txt(P.prState);
const certified=!!(cand&&cand.status==='CERTIFIED_SOURCE_ONLY'&&Number.isInteger(cand.artifactId)&&cand.artifactId>0&&cand.sourceHead&&cand.certificationEvidencePath);
const cert=certified?json(cand.certificationEvidencePath):null;
const prFile=String(process.env.ORBIT360_PR_BODY_FILE||'').trim(),requirePr=String(process.env.ORBIT360_CONTINUITY_REQUIRE_PR||'false')==='true',pr=prFile&&fs.existsSync(prFile)?fs.readFileSync(prFile,'utf8'):'';
const stripHistory=o=>{const x=JSON.parse(JSON.stringify(o));delete x.history;delete x.lastExecution;return x;};
const activeProjection={ledger:{stateVersion:L.stateVersion,activeState:L.activeState,successorCandidate:L.successorCandidate,nextAction:L.nextAction,authorizationBoundary:L.authorizationBoundary,continuityControl:L.continuityControl},live:stripHistory(live),index:stripHistory(idx),lifecycle:stripHistory(life)};
const activeText=JSON.stringify(activeProjection),ordinalFree=!/(?:REQUEST|\bR)\d+/i.test(activeText),historicalArtifactAbsentFromActive=!activeText.includes(String(c.historicalArtifactId));
const guardKeys=Object.keys(life.guards||{}),forbiddenGuardKeys=['candidateArtifactId','candidateZipSha256','candidateManifestSha256','candidateSourceHead','historicalCandidateArtifactId','request13MaterializationAllowed'];
const legacyGuardKeysAbsent=forbiddenGuardKeys.every(k=>!guardKeys.includes(k))&&!guardKeys.some(k=>/^request\d+/i.test(k));
const successorGuards=certified
  ?life.guards?.successorCandidateRequired===false&&life.guards?.successorCandidateArtifactId===cand.artifactId&&life.guards?.successorCandidateSourceHead===cand.sourceHead&&life.guards?.candidateCertificationRequired===false&&life.guards?.historicalCandidateRuntimeReuseAllowed===false
  :life.guards?.successorCandidateRequired===true&&life.guards?.successorCandidateArtifactId===null&&life.guards?.successorCandidateSourceHead===null&&life.guards?.candidateCertificationRequired===true&&life.guards?.historicalCandidateRuntimeReuseAllowed===false;
const sourcePrerequisiteDecoupled=!Object.prototype.hasOwnProperty.call(life,'sourceOnlyPrerequisite')&&(certified
  ?life.successorSourceOnlyPrerequisite?.status==='CERTIFIED_SUCCESSOR_SOURCE_ONLY'&&life.successorSourceOnlyPrerequisite?.successorCandidateRequired===false&&life.successorSourceOnlyPrerequisite?.successorCandidateArtifactId===cand.artifactId&&life.successorSourceOnlyPrerequisite?.runtimeAllowed===false
  :life.successorSourceOnlyPrerequisite?.successorCandidateRequired===true&&life.successorSourceOnlyPrerequisite?.successorCandidateArtifactId===null&&life.successorSourceOnlyPrerequisite?.runtimeAllowed===false);
const noTemporaryFiles=['orbit360-platform/docs/TEMP-INVALID-NOOP','orbit360-platform/docs/SHOULD_NOT_USE','orbit360-platform/docs/NEVER_AGAIN'].every(p=>!fs.existsSync(a(p)));
const workflows=fs.existsSync(a('.github/workflows'))?fs.readdirSync(a('.github/workflows')).filter(f=>/\.ya?ml$/i.test(f)):[],offenders=[];
for(const f of workflows){const rel='.github/workflows/'+f,t=txt(rel);const touches=G.projectionTargets.some(p=>t.includes(p));if(touches&&rel!==G.canonicalWorkflow&&!t.includes(G.soleProjectionLogic))offenders.push(rel);}
const successorCertification=!certified||(cert&&cert.ok===true&&cert.status==='F2_SUCCESSOR_SOURCEONLY_CANDIDATE_CERTIFIED'&&cert.candidateArtifactId===cand.artifactId&&cert.candidateSourceHead===cand.sourceHead&&cert.candidateZipSha256===cand.zipSha256&&cert.candidateManifestSha256===cand.manifestSha256&&cert.fileCount===194&&cert.fullRehashPass===true&&cert.deltaCount===2&&cert.historicalArtifact9387820198Used===false&&cert.runtimeAuthorized===false&&cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.firestoreWrites===0&&cert.authWrites===0&&cert.operationalWrites===0&&cert.productionTouched===false&&cand.artifactId!==c.historicalArtifactId);
const checks={
  ledgerV2:L.schemaVersion==='orbit360-continuity-ledger-v2'&&L.ledgerId==='ORBIT360-F2-CONTINUITY-CURRENT'&&L.stateVersion==='ORBIT360-F2-CONTINUITY-CURRENT',
  continuityClosedVerified:L.continuityControl?.status==='CLOSED_VERIFIED'&&L.continuityControl?.auditStatus==='ORBIT360_CONTINUITY_LIVE_STATE_AUDIT_PASS',
  ordinalFreeActiveState:ordinalFree,
  historicalArtifactAbsentFromActive,
  lifecycleLegacyGuardKeysAbsent:legacyGuardKeysAbsent,
  lifecycleSuccessorGuards:successorGuards,
  lifecycleSourcePrerequisiteDecoupled:sourcePrerequisiteDecoupled,
  noTemporaryCorrectionArtifacts:noTemporaryFiles,
  singleProjectionLogic:G.soleProjectionLogic==='tools/orbit360-continuity-sync-v20260820.mjs'&&G.canonicalWorkflow==='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
  noIndependentProjectionWriters:offenders.length===0,
  historySealed:R.requestOrdinal===h.requestOrdinal&&A.requestOrdinal===h.requestOrdinal&&R.allowedExecutions===0&&A.allowedExecutions===0&&R.consumed===true&&A.consumed===true&&R.replayAllowed===false&&A.replayAllowed===false&&R.runtimeRunId===h.runId&&A.runtimeRunId===h.runId,
  rootfixEvidence:root.ok===true&&root.status==='F2_PRODUCT_READONLY_GET_ROOTFIX_SOURCEONLY_PASS'&&root.resolvedCode===L.sourceRootCauseResolution.code&&root.apiPreserved===true&&root.cloneIsolationPreserved===true&&root.writesRemainBlocked===true,
  causalEvidence:causal.ok===true&&causal.code===L.sourceRootCauseResolution.code,
  successorCertification,
  liveProjection:live.stateVersion===L.stateVersion&&live.phase===L.activeState.phase&&live.canonicalCurrent?.status===L.activeState.status&&live.canonicalCurrent?.rootCauseStatus===L.activeState.rootCauseStatus&&live.currentCheckpoint===L.checkpoint&&live.history?.historicalCandidateBoundary?.historicalArtifactId===c.historicalArtifactId&&(!certified||live.successorCandidate?.artifactId===cand.artifactId),
  indexProjection:idx.canonicalCurrent?.stateVersion===L.stateVersion&&idx.canonicalCurrent?.status===L.activeState.status&&idx.operationalCurrent?.nextActionId===L.nextAction.id&&idx.operationalCurrent?.successorCandidateArtifactId===(certified?cand.artifactId:null)&&idx.operationalCurrent?.candidateCertificationRequired===!certified,
  lifecycleProjection:life.continuity?.stateVersion===L.stateVersion&&life.status===L.activeState.status&&life.authorization?.activeRequest===false&&life.authorization?.freshAuthorizationRequired===true&&life.authorization?.nextRuntimeMaterializationAllowed===false,
  candidateBoundary:L.candidateBoundary?.historicalRuntimeReusable===false&&L.authorizationBoundary?.activeRuntimeAuthorization===false&&L.authorizationBoundary?.freshAuthorizationRequired===true&&(!certified||L.candidateBoundary?.successorArtifactId===cand.artifactId),
  checkpointExists:fs.existsSync(a(L.checkpoint)),
  readmeCurrent:readme.includes('StateVersion: `ORBIT360-F2-CONTINUITY-CURRENT`')&&readme.includes('identificadores de artifacts consumidos pertenecen únicamente a historia/evidencia')&&!readme.includes('Request12')&&(!certified||readme.includes(`artifact \`${cand.artifactId}\``)),
  changelogCurrent:change.includes('[F2-CONTINUITY-CURRENT]')&&change.includes('guards desacoplados')&&(!certified||change.includes(`artifact \`${cand.artifactId}\``)),
  prStateCurrent:prState.includes('ORBIT360-F2-CONTINUITY-CURRENT')&&prState.includes('no depende del ordinal de ningún Request ni de una candidata histórica')&&(!certified||prState.includes(`artifact \`${cand.artifactId}\``)),
  prAvailable:!requirePr||pr.length>0,
  prCurrent:!requirePr||(pr.includes('ORBIT360-F2-CONTINUITY-CURRENT')&&pr.includes('no depende del ordinal de ningún Request ni de una candidata histórica')&&pr.includes(L.nextAction.id)&&(!certified||pr.includes(`artifact \`${cand.artifactId}\``)))
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),ok=failed.length===0;
const evidence={schemaVersion:'orbit360-f2-continuity-audit-v4',ok,status:ok?'ORBIT360_CONTINUITY_ACTIVE_GUARDS_AUDIT_PASS':'ORBIT360_CONTINUITY_ACTIVE_GUARDS_AUDIT_FAIL',classification:ok?'PASS':'PIPELINE_MECHANISM_FAILURE',code:ok?null:'CONTINUITY_CERTIFIED_SUCCESSOR_PERSISTENCE_FAILURE',stateVersion:L.stateVersion,activeStateOrdinalFree:ordinalFree,historicalArtifactAbsentFromActive,lifecycleLegacyGuardKeysAbsent:legacyGuardKeysAbsent,certifiedSuccessor:certified,successorCandidateArtifactId:certified?cand.artifactId:null,successorCandidateSourceHead:certified?cand.sourceHead:null,historicalRequestOrdinal:h.requestOrdinal,historicalRunId:h.runId,historicalArtifactId:c.historicalArtifactId,rootCauseCode:L.sourceRootCauseResolution.code,writerOffenders:offenders,checks,failed,productMutation:false,dataMutation:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n','utf8');console.log(JSON.stringify(evidence,null,2));if(!ok)process.exit(41);
