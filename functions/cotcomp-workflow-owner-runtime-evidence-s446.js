'use strict';

const VERSION='ays-cotcomp-workflow-owner-runtime-evidence-s446-v1.0';

const EXPECTED=Object.freeze({
  projectId:'ays-orbit-360-lab',
  region:'us-central1',
  recoveryBranch:'recovery/fase-a-clean-20260831',
  recoveryHead:'43b64b77c39b86153a5a34abb50d29da4074ec96',
  ownerPath:'functions/ops-leads-domain.js',
  ownerBlob:'73e09a4404cb4298dc34c9c38e26ad1f960d3170',
  functions:Object.freeze([
    'orbit360OpsLeadsCommand',
    'orbit360OpsLeadsCommandLabV20260804'
  ])
});

function evaluate(input={}){
  const blockers=[];
  if(input.projectId!==EXPECTED.projectId) blockers.push('PROJECT_NOT_LAB');
  if(input.region!==EXPECTED.region) blockers.push('REGION_MISMATCH');
  if(input.functionObservedActive!==true) blockers.push('OPS_LEADS_FUNCTION_NOT_ACTIVE');
  if(input.sourceArchiveReadSuccessful!==true) blockers.push('DEPLOYED_SOURCE_ARCHIVE_READBACK_REQUIRED');
  if(input.deployedOwnerBlob!==EXPECTED.ownerBlob) blockers.push('DEPLOYED_OWNER_BLOB_MISMATCH');
  if(input.writeExecuted===true) blockers.push('READ_ONLY_PROOF_VIOLATED');
  if(input.productionTouched===true) blockers.push('PRODUCTION_FORBIDDEN');

  return Object.freeze({
    version:VERSION,
    expected:EXPECTED,
    ok:blockers.length===0,
    blockers,
    workflowOwnerRuntimeVerified:blockers.length===0
  });
}

module.exports=Object.freeze({VERSION,EXPECTED,evaluate});
