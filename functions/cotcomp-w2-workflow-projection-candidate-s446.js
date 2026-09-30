'use strict';

const crypto=require('node:crypto');
const workflow=require('./cotcomp-workflow-extension-contract');

const VERSION='ays-cotcomp-w2-workflow-projection-candidate-s446-v1.0';
const EXECUTION_ENABLED=false;
const CALLS_ALLOWED=false;
const WRITE_ALLOWED=false;

const TARGET=Object.freeze({
  projectId:'ays-orbit-360-lab',
  environment:'LAB',
  tenantId:'alianzas-soluciones',
  callable:'orbit360OpsLeadsCommand',
  ownerBlob:workflow.TARGET_OWNER.reviewedBlobSha
});

function sha(v){
  return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
}
function clean(v,max=220){return String(v==null?'':v).trim().slice(0,max);}

function deriveIds({caseId,correlationId}={}){
  const seed=[TARGET.tenantId,clean(caseId,180),clean(correlationId,180),'W2'].join('|');
  const h=sha(seed);
  return Object.freeze({
    businessId:'cotbiz_'+h.slice(0,24),
    managementId:'cotmgmt_'+h.slice(24,48),
    businessRequestId:'cotreq_b_'+h.slice(0,24),
    managementRequestId:'cotreq_m_'+h.slice(24,48)
  });
}

function buildCotcompRef(input={},role){
  const ref=workflow.cotcompRef({
    caseId:clean(input.caseId,180),
    journeyId:clean(input.journeyId,180),
    correlationId:clean(input.correlationId,180),
    quoteCasePath:clean(input.quoteCasePath,500),
    selectedProposalId:clean(input.selectedProposalId||input.proposalId,180),
    intakeStatus:clean(input.intakeStatus||'lead_recibido',100)
  },role);
  return ref.ok ? Object.freeze(ref.value) : null;
}

function buildSyntheticProjection(input={}){
  const reasons=[];
  if(input.synthetic!==true) reasons.push('SYNTHETIC_ONLY_REQUIRED');
  if(input.projectId!==TARGET.projectId) reasons.push('PROJECT_NOT_LAB');
  if(input.environment!==TARGET.environment) reasons.push('ENVIRONMENT_NOT_LAB');
  if(input.tenantId!==TARGET.tenantId) reasons.push('TENANT_NOT_ALLOWED');
  if(!clean(input.caseId,180)) reasons.push('CASE_ID_REQUIRED');
  if(!clean(input.journeyId,160)) reasons.push('JOURNEY_ID_REQUIRED');
  if(!clean(input.correlationId,180)) reasons.push('CORRELATION_ID_REQUIRED');
  if(input.realData===true) reasons.push('REAL_DATA_FORBIDDEN');
  if(input.production===true) reasons.push('PRODUCTION_FORBIDDEN');

  const ids=deriveIds(input);
  const businessCotcompRef=buildCotcompRef(input,'LEAD_PROJECTION');
  const managementCotcompRef=buildCotcompRef(input,'OPS_QUOTATION_PROJECTION');
  if(!businessCotcompRef||!managementCotcompRef) reasons.push('COTCOMP_REF_INVALID');

  const businessPayload={
    id:ids.businessId,
    nombre:'CotComp W2 Synthetic Business',
    tipo:'CotComp',
    pais:clean(input.country||'GT',8),
    moneda:clean(input.currency||'GTQ',8),
    canal:'CotComp',
    producto:clean(input.product||'SYNTHETIC',120),
    ramo:clean(input.line||'SYNTHETIC',120),
    prioridad:'Media',
    descripcion:'Synthetic W2 workflow-projection proof only',
    cotcompRef:businessCotcompRef
  };

  const managementPayload={
    id:ids.managementId,
    lista:'CotComp',
    tipo:'CotComp',
    titulo:'CotComp W2 Synthetic Management',
    negocioId:ids.businessId,
    estado:'Pendiente',
    prioridad:'Media',
    origen:'CotComp',
    nota:'Synthetic W2 workflow-projection proof only',
    cotcompRef:managementCotcompRef
  };

  return Object.freeze({
    version:VERSION,
    ok:reasons.length===0,
    reasons,
    target:TARGET,
    ids,
    cotcompRefs:Object.freeze({business:businessCotcompRef,management:managementCotcompRef}),
    commands:Object.freeze([
      Object.freeze({
        operation:'create_business',
        entityId:ids.businessId,
        requestId:ids.businessRequestId,
        reason:'CotComp W2 synthetic projection proof',
        payload:Object.freeze(businessPayload)
      }),
      Object.freeze({
        operation:'create_management',
        entityId:ids.managementId,
        requestId:ids.managementRequestId,
        reason:'CotComp W2 synthetic projection proof',
        payload:Object.freeze(managementPayload)
      })
    ]),
    notificationIsolation:Object.freeze({
      payloadAdvisorIdOmitted:true,
      payloadClientIdOmitted:true,
      providerDeliveryMustRemainUnprovenUntilRuntimeIdentityAndTenantConfigAreVerified:true,
      executionGate:'NOTIFICATION_SIDE_EFFECTS_ZERO_PROOF_REQUIRED'
    }),
    executionEnabled:EXECUTION_ENABLED,
    callsAllowed:CALLS_ALLOWED,
    writeAllowed:WRITE_ALLOWED,
    executable:false
  });
}

function evaluateW2Gate(input={}){
  const blockers=[];
  if(input.workflowOwnerRuntimeVerified!==true) blockers.push('WORKFLOW_OWNER_RUNTIME_PROOF_REQUIRED');
  if(input.notificationSideEffectsZeroVerified!==true) blockers.push('NOTIFICATION_SIDE_EFFECTS_ZERO_PROOF_REQUIRED');
  if(input.syntheticCleanupHarnessReady!==true) blockers.push('W2_CLEANUP_HARNESS_REQUIRED');
  if(input.ownerW2Authorization!==true) blockers.push('OWNER_W2_AUTHORIZATION_REQUIRED');
  if(input.deployAuthorization!==true) blockers.push('W2_DEPLOY_AUTHORIZATION_REQUIRED');
  return Object.freeze({
    version:VERSION,
    logicalReady:blockers.length===0,
    blockers,
    effectiveCallAllowed:false,
    effectiveWriteAllowed:false,
    realDataAllowed:false,
    productionAllowed:false
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,CALLS_ALLOWED,WRITE_ALLOWED,TARGET,
  deriveIds,buildCotcompRef,buildSyntheticProjection,evaluateW2Gate
});
