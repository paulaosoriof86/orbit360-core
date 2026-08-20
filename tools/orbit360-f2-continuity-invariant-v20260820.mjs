#!/usr/bin/env node
'use strict';
import fs from 'node:fs'; import path from 'node:path';
const ROOT=process.cwd(), a=p=>path.join(ROOT,p), txt=p=>fs.readFileSync(a(p),'utf8').replace(/^\uFEFF/,''), json=p=>JSON.parse(txt(p));
const P={ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',live:'orbit360-platform/docs/orbit360-live-state-v1.json',index:'orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json',life:'tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json',readme:'README.md',change:'orbit360-platform/CHANGELOG.md',prState:'orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md'};
const OUT=a(process.env.ORBIT360_CONTINUITY_OUT||'orbit360-platform/runtime-gate-crm-v20260716/f2-continuity-audit-v20260820.json');
const L=json(P.ledger),G=json(P.registry),live=json(P.live),idx=json(P.index),life=json(P.life),h=L.history?.latestConsumedRuntime||{},R=json(h.requestPath),A=json(h.authorizationPath),root=json(L.sourceRootCauseResolution.rootfixEvidencePath),causal=json(L.sourceRootCauseResolution.causalProofPath),readme=txt(P.readme),change=txt(P.change),prState=txt(P.prState);
const prFile=String(process.env.ORBIT360_PR_BODY_FILE||'').trim(), requirePr=String(process.env.ORBIT360_CONTINUITY_REQUIRE_PR||'false')==='true', pr=prFile&&fs.existsSync(prFile)?fs.readFileSync(prFile,'utf8'):'';
const activeText=JSON.stringify({ledger:{stateVersion:L.stateVersion,activeState:L.activeState,nextAction:L.nextAction,authorizationBoundary:L.authorizationBoundary,continuityControl:L.continuityControl},live:{stateVersion:live.stateVersion,phase:live.phase,canonicalCurrent:live.canonicalCurrent,activeState:live.activeState,authorization:live.authorization,nextActionExact:live.nextActionExact,documentationControl:live.documentationControl},index:{canonicalCurrent:idx.canonicalCurrent,operationalCurrent:idx.operationalCurrent,documentationControl:idx.documentationControl},life:{status:life.status,currentPhase:life.currentPhase,continuity:life.continuity,authorization:life.authorization,nextActionExact:life.nextActionExact}});
const ordinalFree=!/(?:REQUEST|\bR)\d+/i.test(activeText);
const workflows=fs.existsSync(a('.github/workflows'))?fs.readdirSync(a('.github/workflows')).filter(f=>/\.ya?ml$/i.test(f)):[];
const offenders=[]; for(const f of workflows){const rel='.github/workflows/'+f,t=txt(rel); const touches=G.projectionTargets.some(p=>t.includes(p)); if(touches&&rel!==G.canonicalWorkflow&&!t.includes(G.soleProjectionLogic)) offenders.push(rel);}
const checks={
 ledgerV2:L.schemaVersion==='orbit360-continuity-ledger-v2'&&L.ledgerId==='ORBIT360-F2-CONTINUITY-CURRENT'&&L.stateVersion==='ORBIT360-F2-CONTINUITY-CURRENT',
 ordinalFreeActiveState:ordinalFree,
 singleProjectionLogic:G.soleProjectionLogic==='tools/orbit360-continuity-sync-v20260820.mjs'&&G.canonicalWorkflow==='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
 noIndependentProjectionWriters:offenders.length===0,
 historySealed:R.requestOrdinal===h.requestOrdinal&&A.requestOrdinal===h.requestOrdinal&&R.allowedExecutions===0&&A.allowedExecutions===0&&R.consumed===true&&A.consumed===true&&R.replayAllowed===false&&A.replayAllowed===false&&R.runtimeRunId===h.runId&&A.runtimeRunId===h.runId,
 rootfixEvidence:root.ok===true&&root.status==='F2_PRODUCT_READONLY_GET_ROOTFIX_SOURCEONLY_PASS'&&root.resolvedCode===L.sourceRootCauseResolution.code&&root.apiPreserved===true&&root.cloneIsolationPreserved===true&&root.writesRemainBlocked===true,
 causalEvidence:causal.ok===true&&causal.code===L.sourceRootCauseResolution.code,
 liveProjection:live.stateVersion===L.stateVersion&&live.phase===L.activeState.phase&&live.canonicalCurrent?.status===L.activeState.status&&live.canonicalCurrent?.rootCauseStatus===L.activeState.rootCauseStatus&&live.currentCheckpoint===L.checkpoint,
 indexProjection:idx.canonicalCurrent?.stateVersion===L.stateVersion&&idx.canonicalCurrent?.status===L.activeState.status&&idx.operationalCurrent?.nextActionId===L.nextAction.id,
 lifecycleProjection:life.continuity?.stateVersion===L.stateVersion&&life.status===L.activeState.status&&life.authorization?.activeRequest===false&&life.authorization?.freshAuthorizationRequired===true,
 candidateBoundary:L.candidateBoundary?.historicalRuntimeReusable===false&&L.authorizationBoundary?.activeRuntimeAuthorization===false&&L.authorizationBoundary?.freshAuthorizationRequired===true,
 readmeCurrent:readme.includes('StateVersion: `ORBIT360-F2-CONTINUITY-CURRENT`')&&readme.includes('Los ordinales de Request pertenecen únicamente al historial'),
 changelogCurrent:change.includes('[F2-CONTINUITY-CURRENT]')&&change.includes('ORBIT360-F2-CONTINUITY-CURRENT'),
 prStateCurrent:prState.includes('ORBIT360-F2-CONTINUITY-CURRENT')&&prState.includes('no depende del ordinal'),
 prAvailable:!requirePr||pr.length>0,
 prCurrent:!requirePr||(pr.includes('ORBIT360-F2-CONTINUITY-CURRENT')&&pr.includes('no depende del ordinal')&&pr.includes(L.nextAction.id))
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),ok=failed.length===0;
const evidence={schemaVersion:'orbit360-f2-continuity-audit-v2',ok,status:ok?'ORBIT360_CONTINUITY_LIVE_STATE_AUDIT_PASS':'ORBIT360_CONTINUITY_LIVE_STATE_AUDIT_FAIL',classification:ok?'PASS':'PIPELINE_MECHANISM_FAILURE',code:ok?null:'CONTINUITY_OWNER_OR_WRITER_EXCLUSIVITY_FAILURE',stateVersion:L.stateVersion,activeStateOrdinalFree:ordinalFree,historicalRequestOrdinal:h.requestOrdinal,historicalRunId:h.runId,rootCauseCode:L.sourceRootCauseResolution.code,writerOffenders:offenders,checks,failed,productMutation:false,dataMutation:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n','utf8');console.log(JSON.stringify(evidence,null,2));if(!ok)process.exit(41);
