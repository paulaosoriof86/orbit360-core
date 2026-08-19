#!/usr/bin/env node
'use strict';

const REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
function runtimeMode(){return String(process.env.ORBIT360_EXPECTED_REQUEST_VERSION||'NONE_PENDING_FRESH_AUTHORIZATION')!=='NONE_PENDING_FRESH_AUTHORIZATION';}
export function evaluateF2StableBoundary({ live, index, gateId, artifactId, requestVersion }) {
  const runtime=runtimeMode();
  const liveStatus=String(live?.f2SourceOnly?.status||'');
  const indexStatus=String(index?.operationalCurrent?.f2SourceOnlyStatus||'');
  const sourceClosed=liveStatus==='CLOSED_PASS'&&indexStatus==='CLOSED_PASS';
  const sourceRebindPending=liveStatus==='PENDING_REBIND_SOURCE_ONLY'&&indexStatus==='PENDING_REBIND_SOURCE_ONLY';
  const sourceBoundaryAccepted=(runtime?sourceClosed:(sourceClosed||sourceRebindPending))&&live?.f2SourceOnly?.gateId===gateId&&Number(live?.f2SourceOnly?.candidateArtifactId)===Number(artifactId);
  const phaseStillF2=live?.frozenPlan?.currentPhase==='F2'&&Array.isArray(live?.frozenPlan?.goLiveRoute?.remainingPhases)&&live.frozenPlan.goLiveRoute.remainingPhases.includes('F2');
  const nextActionBound=live?.nextActionExact?.gateId===gateId&&live?.nextActionExact?.requestVersion===requestVersion&&Number(live?.nextActionExact?.candidateArtifactId)===Number(artifactId);
  const indexBound=Number(index?.operationalCurrent?.successorCandidateArtifactId)===Number(artifactId)&&index?.operationalCurrent?.f2SourceOnlyGateId===gateId&&String(index?.operationalCurrent?.nextAuthorizationBoundary||'').includes(requestVersion)&&String(index?.operationalCurrent?.nextAuthorizationBoundary||'').includes(String(artifactId))&&(runtime?indexStatus==='CLOSED_PASS':['PENDING_REBIND_SOURCE_ONLY','CLOSED_PASS'].includes(indexStatus));
  const stable=sourceBoundaryAccepted&&phaseStillF2&&nextActionBound&&indexBound;
  return {ok:stable,sourceClosed,sourceRebindPending,sourceBoundaryAccepted,runtimeMode:runtime,phaseStillF2,nextActionBound,indexBound,narrativeAuthorizationStatusObserved:String(live?.authorization?.f2AuthorizationStatus||''),narrativeGoLiveStatusObserved:String(live?.goLive?.status||''),narrativeStatusesAuthoritative:false};
}
export function selfTestF2StableBoundary(args){const baseline=evaluateF2StableBoundary(args);const mutated=structuredClone(args.live);mutated.authorization={...(mutated.authorization||{}),f2AuthorizationStatus:'ARBITRARY_ATTEMPT_STATUS_MUST_NOT_INVALIDATE_F2_BOUNDARY'};mutated.goLive={...(mutated.goLive||{}),status:'ARBITRARY_F2_ATTEMPT_NARRATIVE_STATUS'};mutated.phase='ARBITRARY_F2_NARRATIVE_PHASE_LABEL';const narrativeMutation=evaluateF2StableBoundary({...args,live:mutated});return {ok:baseline.ok===true&&narrativeMutation.ok===true,baseline,narrativeMutation,provesNarrativeAttemptStatusIsNonAuthoritative:baseline.ok===true&&narrativeMutation.ok===true};}
export const F2_STABLE_BOUNDARY_REVISION='F2_SUCCESSOR_REBIND_SOURCE_BOUNDARY_V3';
export const F2_REQUEST_VERSION=REQUEST_VERSION;
