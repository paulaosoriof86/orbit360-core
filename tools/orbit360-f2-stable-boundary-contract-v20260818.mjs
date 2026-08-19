#!/usr/bin/env node
'use strict';

export function evaluateF2StableBoundary({ live, index, gateId, artifactId, requestVersion }) {
  const sourceClosed =
    live?.f2SourceOnly?.status === 'CLOSED_PASS' &&
    live?.f2SourceOnly?.gateId === gateId &&
    Number(live?.f2SourceOnly?.candidateArtifactId) === Number(artifactId);

  const phaseStillF2 =
    live?.frozenPlan?.currentPhase === 'F2' &&
    Array.isArray(live?.frozenPlan?.goLiveRoute?.remainingPhases) &&
    live.frozenPlan.goLiveRoute.remainingPhases.includes('F2');

  const nextActionBound =
    live?.nextActionExact?.gateId === gateId &&
    live?.nextActionExact?.requestVersion === requestVersion &&
    Number(live?.nextActionExact?.candidateArtifactId) === Number(artifactId);

  const indexBound =
    index?.operationalCurrent?.f2SourceOnlyStatus === 'CLOSED_PASS' &&
    index?.operationalCurrent?.f2SourceOnlyGateId === gateId &&
    Number(index?.operationalCurrent?.successorCandidateArtifactId) === Number(artifactId) &&
    String(index?.operationalCurrent?.nextAuthorizationBoundary || '').includes(requestVersion) &&
    String(index?.operationalCurrent?.nextAuthorizationBoundary || '').includes(String(artifactId));

  const stable = sourceClosed && phaseStillF2 && nextActionBound && indexBound;

  return {
    ok: stable,
    sourceClosed,
    phaseStillF2,
    nextActionBound,
    indexBound,
    narrativeAuthorizationStatusObserved: String(live?.authorization?.f2AuthorizationStatus || ''),
    narrativeGoLiveStatusObserved: String(live?.goLive?.status || ''),
    narrativeStatusesAuthoritative: false
  };
}

export function selfTestF2StableBoundary({ live, index, gateId, artifactId, requestVersion }) {
  const baseline = evaluateF2StableBoundary({ live, index, gateId, artifactId, requestVersion });
  const mutated = structuredClone(live);
  mutated.authorization = { ...(mutated.authorization || {}), f2AuthorizationStatus: 'ARBITRARY_ATTEMPT_STATUS_MUST_NOT_INVALIDATE_F2_BOUNDARY' };
  mutated.goLive = { ...(mutated.goLive || {}), status: 'ARBITRARY_F2_ATTEMPT_NARRATIVE_STATUS' };
  mutated.phase = 'ARBITRARY_F2_NARRATIVE_PHASE_LABEL';
  const narrativeMutation = evaluateF2StableBoundary({ live: mutated, index, gateId, artifactId, requestVersion });
  return {
    ok: baseline.ok === true && narrativeMutation.ok === true,
    baseline,
    narrativeMutation,
    provesNarrativeAttemptStatusIsNonAuthoritative: baseline.ok === true && narrativeMutation.ok === true
  };
}
