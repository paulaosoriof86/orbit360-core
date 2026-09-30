'use strict';

const crypto=require('node:crypto');
const workflow=require('./cotcomp-workflow-extension-contract');

const VERSION='ays-cotcomp-w2-workflow-projection-candidate-s446-v1.1';
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

const EXPECTED_OWNER_SIDE_EFFECTS=Object.freeze({
  businessDocuments:4,
  managementDocuments:4,
  totalCreatedDocuments:8,
  components:Object.freeze([
    'workflow_entity',
    'workflow_event',
    'workflow_request',
    'notification_outbox'
  ]),
  portalNotificationExpected:false,
  providerDeliveryAllowed:false,
  cleanupRequired:true,
  finalAbsenceRequired:true
});

function sha(v){
  return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
}
function clean(v,max=220){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function stable(v){
  if(v==null) return v;
  if(Array.isArray(v)) return v.map(stable);
  if(typeof v==='object') return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function requestIdentity(operation,entityId,payload){
  const seed=JSON.stringify(stable({
    tenantId:TARGET.tenantId,
    operation,
    entityId,
    payload
  }));
  return 'wf_'+sha(seed).slice(0,28);
}

function deriveEntityIds({caseId,correlationId}={}){
  const caseValue=clean(caseId,180);
  const correlationValue=clean(correlationId,180);
  if(!caseValue||!correlationValue) return {ok:false,code:'CASE_AND_CORRELATION_REQUIRED'};
  const seed=[TARGET.tenantId,caseValue,correlationValue,'W2'].join('|');
  const h=sha(seed);
  return Object.freeze({
    ok:true,
    businessId:'cotbiz_'+h.slice(0,24),
    managementId:'cotmgmt_'+h.slice(24,48)
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
  if(!clean(input.journeyId,180)) reasons.push('JOURNEY_ID_REQUIRED');
  if(!clean(input.correlationId,180)) reasons.push('CORRELATION_ID_REQUIRED');
  if(input.realData===true) reasons.push('REAL_DATA_FORBIDDEN');
  if(input.production===true) reasons.push('PRODUCTION_FORBIDDEN');

  const ids=deriveEntityIds(input);
  if(!ids.ok) reasons.push(ids.code);

  const businessCotcompRef=buildCotcompRef(input,'LEAD_PROJECTION');
  const managementCotcompRef=buildCotcompRef(input,'OPS_QUOTATION_PROJECTION');
  if(!businessCotcompRef||!managementCotcompRef) reasons.push('COTCOMP_REF_INVALID');

  const businessPayload={
    id:ids.businessId,
    nombre:'CotComp W2 Synthetic Business',
    tipo:'Cotización',
    etapa:'cotizando',
    pais:clean(input.country||'GT',8).toUpperCase(),
    moneda:clean(input.currency||'GTQ',8).toUpperCase(),
    canal:'Web pública A&S',
    producto:clean(input.product||'SYNTHETIC',180),
    ramo:clean(input.line||'SYNTHETIC',140),
    prioridad:'Media',
    origen:'CotComp',
    cotcompRef:businessCotcompRef
  };

  const managementPayload={
    id:ids.managementId,
    lista:'Cotizaciones',
    tipo:'Cotización',
    titulo:'CotComp W2 Synthetic Management',
    negocioId:ids.businessId,
    estado:'Pendiente',
    prioridad:'Media',
    origen:'CotComp',
    nota:'Synthetic W2 workflow-projection proof only',
    cotcompRef:managementCotcompRef
  };

  const businessRequestId=requestIdentity('create_business',ids.businessId,businessPayload);
  const managementRequestId=requestIdentity('create_management',ids.managementId,managementPayload);

  return Object.freeze({
    version:VERSION,
    ok:reasons.length===0,
    reasons,
    target:TARGET,
    ids:Object.freeze({
      businessId:ids.businessId,
      managementId:ids.managementId,
      businessRequestId,
      managementRequestId
    }),
    cotcompRefs:Object.freeze({
      business:businessCotcompRef,
      management:managementCotcompRef
    }),
    commands:Object.freeze([
      Object.freeze({
        operation:'create_business',
        entityId:ids.businessId,
        requestId:businessRequestId,
        requestIdentityPolicy:'PAYLOAD_BOUND_MIRRORS_OWNER_REQUEST_IDENTITY',
        reason:'CotComp W2 synthetic projection proof',
        payload:Object.freeze(businessPayload)
      }),
      Object.freeze({
        operation:'create_management',
        entityId:ids.managementId,
        requestId:managementRequestId,
        requestIdentityPolicy:'PAYLOAD_BOUND_MIRRORS_OWNER_REQUEST_IDENTITY',
        reason:'CotComp W2 synthetic projection proof',
        payload:Object.freeze(managementPayload)
      })
    ]),
    notificationIsolation:Object.freeze({
      successfulOwnerCreateRequiresAdvisorId:true,
      advisorTargetThereforeExpected:true,
      notificationOutboxExpected:true,
      portalNotificationExpected:false,
      providerDeliveryAllowed:false,
      providerDeliveryIsolationRequired:true,
      outboxMustBeJournaledAndCleaned:true,
      directOwnerExecutionAllowed:false
    }),
    cleanupRequirement:Object.freeze({
      exactEntityIds:[ids.businessId,ids.managementId],
      requestIds:[businessRequestId,managementRequestId],
      workflowEventsMustBeJournaled:true,
      notificationOutboxMustBeJournaled:true,
      expectedCreatedDocuments:EXPECTED_OWNER_SIDE_EFFECTS.totalCreatedDocuments,
      cleanupRequired:true,
      finalAbsenceRequired:true
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
  if(input.runtimeConfigReadbackVerified!==true) blockers.push('W2_RUNTIME_CONFIG_READBACK_REQUIRED');
  if(input.providerDeliveryIsolationVerified!==true) blockers.push('PROVIDER_DELIVERY_ISOLATION_REQUIRED');
  if(input.outboxCleanupHarnessReady!==true) blockers.push('W2_OUTBOX_CLEANUP_HARNESS_REQUIRED');
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
  VERSION,
  EXECUTION_ENABLED,
  CALLS_ALLOWED,
  WRITE_ALLOWED,
  TARGET,
  EXPECTED_OWNER_SIDE_EFFECTS,
  sha,
  stable,
  requestIdentity,
  deriveEntityIds,
  buildCotcompRef,
  buildSyntheticProjection,
  evaluateW2Gate
});
