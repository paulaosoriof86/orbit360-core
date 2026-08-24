#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { terminalPassContract } from './orbit360-f2-terminal-evidence-normalizer-v20260824.mjs';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const P={ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',pkg:'orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json',boundary:'orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json',prState:'orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md'};
const A=p=>path.join(ROOT,p),J=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'')),T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
let L={},pkg={},B={};if(!failures.length){L=J(P.ledger);pkg=J(P.pkg);B=J(P.boundary);}
const latest=L.history?.latestSealedConsumedRuntime||{};const terminalPath=String(latest.terminalEvidencePath||L.authorizationBoundary?.terminalEvidencePath||'').trim();
need(terminalPath&&fs.existsSync(A(terminalPath)),'TERMINAL_EVIDENCE_MISSING');
let E={};if(terminalPath&&fs.existsSync(A(terminalPath)))E=J(terminalPath);
const run=Number(latest.runId||0);need(run>0&&Number(E.runId||0)===run,'LATEST_TERMINAL_RUN_MISMATCH');
need(!(E.ok!==true&&E.classification==='PASS'),'TERMINAL_FALSE_PASS_CLASSIFICATION');
const currentRunBound=Number(E.browserRunId||0)===run&&Number(E.integrityRunId||0)===run;
const passEvidence=terminalPassContract(E)&&currentRunBound;
const stateClaimsPass=L.activeState?.status==='F2_TERMINAL_PASS'||L.progress?.f2TerminalPass===true||Number(L.progress?.productionRouteProgressPct)>75||L.nextAction?.id==='AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION';
if(stateClaimsPass)need(passEvidence,'STATE_PASS_WITHOUT_RUNTIME_EVIDENCE');
else{need(Number(L.progress?.productionRouteProgressPct)<=75,'NONPASS_PROGRESS_ABOVE_75');need(L.progress?.f2TerminalPass===false,'NONPASS_F2_FLAG_TRUE');}
need(Number(pkg.revision)===Number(L.productionReopeningPackage?.revision),'PACKAGE_REVISION_DRIFT');
need(pkg.phase===L.activeState?.phase,'PACKAGE_PHASE_DRIFT');
need(pkg.resumeProtocol?.nextActionExact===L.nextAction?.id,'PACKAGE_NEXT_ACTION_DRIFT');
need(Boolean(B.runtimeAllowed)===Boolean(L.activeState?.runtimeAuthorized),'BOUNDARY_RUNTIME_DRIFT');
need(Boolean(B.authorized)===Boolean(L.authorizationBoundary?.activeRuntimeAuthorization),'BOUNDARY_AUTH_DRIFT');
need(Boolean(B.requestMaterialized)===Boolean(L.authorizationBoundary?.activeRequestPath),'BOUNDARY_REQUEST_DRIFT');
const core={stateVersion:L.stateVersion,ledgerRevision:L.revision,packageRevision:L.productionReopeningPackage?.revision,phase:L.activeState?.phase,status:L.activeState?.status,nextAction:L.nextAction?.id,artifactId:L.successorCandidate?.artifactId,artifactDigest:L.successorCandidate?.artifactDigest,sourceHead:L.successorCandidate?.sourceHead,progress:L.progress?.productionRouteProgressPct};
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
need(T(P.prState).includes(`CANONICAL_STATE_FINGERPRINT: ${fingerprint}`),'PR_STATE_FINGERPRINT_DRIFT');
if(process.env.ORBIT360_PR_BODY_FILE){const body=T(process.env.ORBIT360_PR_BODY_FILE);need(body.includes(`CANONICAL_STATE_FINGERPRINT: ${fingerprint}`),'ACTUAL_PR_BODY_FINGERPRINT_DRIFT');}
const out={schemaVersion:'orbit360-control-plane-independent-readback-v4',ok:failures.length===0,status:failures.length?'CONTROL_PLANE_INDEPENDENT_READBACK_FAIL':'CONTROL_PLANE_INDEPENDENT_READBACK_PASS',classification:failures.length?'DATA_CONTRACT_FAILURE':'PASS',failures:[...new Set(failures)],stateFingerprint:fingerprint,ledgerRevision:L.revision||null,packageRevision:pkg.revision||null,candidateArtifactId:L.successorCandidate?.artifactId||null,productionRouteProgressPct:L.progress?.productionRouteProgressPct||null,terminalEvidencePath:terminalPath,latestRunId:run,terminalOk:E.ok===true,terminalClassification:E.classification||null,currentRunEvidenceBound:currentRunBound,terminalPassEvidence:passEvidence,prBodyValidated:Boolean(process.env.ORBIT360_PR_BODY_FILE)&&failures.length===0,runtimeExecuted:Boolean(E.runtimeExecuted),browserExecuted:Boolean(E.browserExecuted||E.browserMatrixPass),firestoreWrites:Number(E.firestoreWrites||0),authWrites:Number(E.authWrites||0),operationalWrites:Number(E.operationalWrites||0),deployExecuted:Boolean(E.deployExecuted),productionTouched:Boolean(E.productionHostingTouched),containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
