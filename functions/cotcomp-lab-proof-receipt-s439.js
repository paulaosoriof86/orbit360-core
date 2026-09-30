'use strict';

const readback = require('./cotcomp-lab-readback-manifest-s438');
const deployEvidence = require('./cotcomp-lab-deploy-evidence');

const VERSION = 'ays-cotcomp-lab-proof-receipt-s439-v0.1';
const RUNTIME_VERIFIED = false;
const DEPLOY_CONFIRMED = false;
const WRITES_CONFIRMED = false;

function clean(v,max=1000){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}
function sha40(v){ return /^[a-f0-9]{40}$/i.test(clean(v,80)); }
function sha64(v){ return /^[a-f0-9]{64}$/i.test(clean(v,80).replace(/^sha256:/i,'')); }

function validateReceipt(input = {}){
  const reasons=[];

  if(!sha40(input.sourceSha)) reasons.push('SOURCE_SHA_REQUIRED');
  if(!sha40(input.sourceTree)) reasons.push('SOURCE_TREE_REQUIRED');
  if(!clean(input.runId,80)) reasons.push('RUN_ID_REQUIRED');
  if(!clean(input.artifactId,80)) reasons.push('ARTIFACT_ID_REQUIRED');
  if(!sha64(input.artifactDigest)) reasons.push('ARTIFACT_DIGEST_REQUIRED');
  if(!sha64(input.backendSourceDigest)) reasons.push('BACKEND_SOURCE_DIGEST_REQUIRED');
  if(!clean(input.receiptPath,800)) reasons.push('RECEIPT_PATH_REQUIRED');

  const rb=readback.validateReadback(input.readback||{});
  if(!rb.ok) reasons.push('READBACK_CONTRACT_FAILED');

  const deploy=deployEvidence.validateLabDeployEvidence({
    projectId:input.readback && input.readback.projectId,
    environment:input.readback && input.readback.environment,
    sourceSha:input.sourceSha,
    runId:input.runId,
    artifactId:input.artifactId,
    artifactDigest:input.artifactDigest,
    readbackExact:rb.ok,
    backendSourceDigest:input.backendSourceDigest,
    workflowOwnerBlob:input.workflowOwnerBlob,
    writesExecuted:input.readback && input.readback.writesExecuted,
    dataTouched:input.readback && input.readback.dataTouched,
    productionTouched:input.readback && input.readback.productionTouched,
    evidencePath:input.receiptPath
  });

  if(!deploy.ok) reasons.push('DEPLOY_EVIDENCE_CONTRACT_FAILED');

  return {
    ok:reasons.length===0,
    reasons:[...new Set(reasons)],
    readback:rb,
    deployEvidence:deploy,
    value:reasons.length?null:{
      schemaVersion:VERSION,
      sourceSha:clean(input.sourceSha,80),
      sourceTree:clean(input.sourceTree,80),
      runId:clean(input.runId,80),
      artifactId:clean(input.artifactId,80),
      artifactDigest:clean(input.artifactDigest,90),
      backendSourceDigest:clean(input.backendSourceDigest,90),
      workflowOwnerBlob:clean(input.workflowOwnerBlob,90),
      receiptPath:clean(input.receiptPath,800),
      readback:input.readback
    },
    runtimeVerifiedByCode:RUNTIME_VERIFIED,
    deployConfirmedByCode:DEPLOY_CONFIRMED,
    writesConfirmedByCode:WRITES_CONFIRMED,
    effectiveRuntimeVerified:false
  };
}

function emptyReceipt(){
  return {
    schemaVersion:VERSION,
    sourceSha:'',
    sourceTree:'',
    runId:'',
    artifactId:'',
    artifactDigest:'',
    backendSourceDigest:'',
    workflowOwnerBlob:'',
    receiptPath:'',
    readback:readback.expectedManifest()
  };
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_VERIFIED,
  DEPLOY_CONFIRMED,
  WRITES_CONFIRMED,
  validateReceipt,
  emptyReceipt
});
