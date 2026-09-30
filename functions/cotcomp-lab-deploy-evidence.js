'use strict';

const storage = require('./cotcomp-lab-storage-adapter-candidate');

const VERSION = 'ays-cotcomp-lab-deploy-evidence-s432-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

const EXPECTED = Object.freeze({
  projectId:'ays-orbit-360-lab',
  environment:'LAB',
  workflowOwnerBlob:storage.EXPECTED.workflowOwnerBlob
});

function clean(v,max=1000){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}

function shaLike(v){
  return /^[a-f0-9]{40,64}$/i.test(clean(v,80));
}

function sha256(v){
  return /^[a-f0-9]{64}$/i.test(clean(v,80).replace(/^sha256:/i,''));
}

function validateLabDeployEvidence(input = {}){
  const reasons=[];

  if(input.projectId!==EXPECTED.projectId) reasons.push('PROJECT_NOT_LAB');
  if(input.environment!==EXPECTED.environment) reasons.push('ENVIRONMENT_NOT_LAB');
  if(!shaLike(input.sourceSha)) reasons.push('SOURCE_SHA_REQUIRED');
  if(!clean(input.runId,80)) reasons.push('RUN_ID_REQUIRED');
  if(!clean(input.artifactId,80)) reasons.push('ARTIFACT_ID_REQUIRED');
  if(!sha256(input.artifactDigest)) reasons.push('ARTIFACT_DIGEST_REQUIRED');
  if(input.readbackExact!==true) reasons.push('READBACK_EXACT_REQUIRED');
  if(!sha256(input.backendSourceDigest)) reasons.push('BACKEND_SOURCE_DIGEST_REQUIRED');
  if(input.workflowOwnerBlob!==EXPECTED.workflowOwnerBlob) reasons.push('WORKFLOW_OWNER_BLOB_MISMATCH');
  if(input.writesExecuted!==0) reasons.push('DEPLOY_EVIDENCE_WRITES_MUST_BE_ZERO');
  if(input.dataTouched===true) reasons.push('DATA_TOUCH_FORBIDDEN');
  if(input.productionTouched===true) reasons.push('PRODUCTION_TOUCH_FORBIDDEN');
  if(!clean(input.evidencePath,800)) reasons.push('EVIDENCE_PATH_REQUIRED');

  return {
    ok:reasons.length===0,
    reasons,
    value:reasons.length?null:{
      schemaVersion:VERSION,
      projectId:EXPECTED.projectId,
      environment:EXPECTED.environment,
      sourceSha:clean(input.sourceSha,80),
      runId:clean(input.runId,80),
      artifactId:clean(input.artifactId,80),
      artifactDigest:clean(input.artifactDigest,90),
      readbackExact:true,
      backendSourceDigest:clean(input.backendSourceDigest,90),
      workflowOwnerBlob:EXPECTED.workflowOwnerBlob,
      writesExecuted:0,
      dataTouched:false,
      productionTouched:false,
      evidencePath:clean(input.evidencePath,800)
    },
    runtimeEnabled:RUNTIME_ENABLED,
    writesEnabled:WRITES_ENABLED,
    deployAllowed:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

function currentDeployEvidenceStatus(){
  return Object.freeze({
    expectedProjectId:EXPECTED.projectId,
    expectedEnvironment:EXPECTED.environment,
    expectedWorkflowOwnerBlob:EXPECTED.workflowOwnerBlob,
    cotcompLabDeployEvidencePresent:false,
    source:'NO_COTCOMP_S420_LAB_DEPLOY_EVIDENCE_RECORDED'
  });
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  EXPECTED,
  validateLabDeployEvidence,
  currentDeployEvidenceStatus
});
