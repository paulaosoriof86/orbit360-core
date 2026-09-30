'use strict';

const VERSION='ays-cotcomp-artifact-cleanup-policy-s441-v1.0';

const POLICY=Object.freeze({
  projectId:'ays-orbit-360-lab',
  location:'us-central1',
  executionAuthorized:false,
  officialFirebaseDefaultRetentionDays:1,
  recommendedCandidateRetentionDays:7,
  recommendationBasis:[
    'Keep a short forensic inspection window after LAB function deployments.',
    'GitHub source/readback artifacts remain the canonical evidence package, so Artifact Registry does not need long retention.',
    'A separate explicit Owner gate is required before changing Artifact Registry policy.'
  ],
  candidateCommand:'firebase functions:artifacts:setpolicy --days 7 --location us-central1 --project ays-orbit-360-lab',
  forbiddenWithoutOwnerGate:[
    'EXECUTE_POLICY_CHANGE',
    'TARGET_PRODUCTION',
    'DELETE_ACTIVE_FUNCTIONS',
    'ALTER_COTCOMP_APP_DATA'
  ]
});

function evaluateCleanupGate(input={}){
  const blockers=[];
  if(input.projectId !== POLICY.projectId) blockers.push('LAB_PROJECT_ID_MISMATCH');
  if(input.location !== POLICY.location) blockers.push('REGION_MISMATCH');
  if(input.ownerAuthorized !== true) blockers.push('EXPLICIT_OWNER_AUTHORIZATION_REQUIRED');
  return Object.freeze({
    version:VERSION,
    policy:POLICY,
    readyToExecute:blockers.length===0,
    blockers
  });
}

module.exports=Object.freeze({VERSION,POLICY,evaluateCleanupGate});
