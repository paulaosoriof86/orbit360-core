'use strict';

const VERSION = 'ays-cotcomp-workflow-extension-contract-s417-v0.1';
const RUNTIME_ENABLED = false;
const APPLY_TO_OWNER_SOURCE_ALLOWED = false;
const WRITES_ENABLED = false;

const TARGET_OWNER = Object.freeze({
  repository: 'paulaosoriof86/orbit360-core',
  branch: 'recovery/fase-a-clean-20260831',
  path: 'functions/ops-leads-domain.js',
  reviewedBlobSha: '73e09a4404cb4298dc34c9c38e26ad1f960d3170'
});

const REQUIRED_SCHEMA_DELTA = Object.freeze({
  business: ['cotcompRef'],
  management: ['cotcompRef'],
  updateAllowLists: ['cotcompRef'],
  authChanges: false,
  storagePathChanges: false,
  workflowStageChanges: false,
  collectionChanges: false
});

const DEFAULTS = Object.freeze({
  opsList: 'Cotizaciones',
  workflowStage: 'cotizando',
  businessType: 'Cotización',
  managementType: 'Cotización',
  managementStatus: 'Pendiente',
  notificationChannels: Object.freeze(['in_app','whatsapp','email'])
});

function clean(v,max=220){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}

function runtimeConfigPath(tenantId){
  return `tenants/${clean(tenantId,180)}/config/cotcomp`;
}

function validateRuntimeConfig(config = {}) {
  const missing = [];
  if (!clean(config.ownerAdvisorId,180)) missing.push('ownerAdvisorId');
  if (!clean(config.ownerUserUid,180)) missing.push('ownerUserUid');
  if (!Array.isArray(config.notificationChannels) || !config.notificationChannels.length) missing.push('notificationChannels');
  return {
    ok: missing.length === 0,
    missing,
    value: missing.length ? null : {
      ownerAdvisorId: clean(config.ownerAdvisorId,180),
      ownerUserUid: clean(config.ownerUserUid,180),
      opsList: clean(config.opsList || DEFAULTS.opsList,120),
      workflowStage: clean(config.workflowStage || DEFAULTS.workflowStage,100),
      notificationChannels: config.notificationChannels.slice(),
      advisorSelectorSource: 'TENANT_TEAM_ROLES_CONFIG',
      hardcodedAdvisorListAllowed: false
    }
  };
}

function cotcompRef(input = {}, role) {
  const required = ['caseId','journeyId','correlationId'];
  const missing = required.filter(k => !clean(input[k],180));
  if (missing.length) return {ok:false,code:'COTCOMP_REF_REQUIRED_FIELDS',missing};
  return {
    ok:true,
    value:{
      schemaVersion:VERSION,
      role,
      caseId:clean(input.caseId,180),
      journeyId:clean(input.journeyId,180),
      correlationId:clean(input.correlationId,180),
      quoteCasePath:clean(input.quoteCasePath,500),
      selectedProposalId:clean(input.selectedProposalId,180),
      intakeStatus:clean(input.intakeStatus || 'lead_recibido',100)
    }
  };
}

function buildProjectionPayloads(input = {}) {
  const cfg = validateRuntimeConfig(input.runtimeConfig || {});
  if (!cfg.ok) return {ok:false,code:'COTCOMP_RUNTIME_CONFIG_INVALID',missing:cfg.missing};
  const leadRef = cotcompRef(input,'LEAD_PROJECTION');
  const opsRef = cotcompRef(input,'OPS_QUOTATION_PROJECTION');
  if (!leadRef.ok || !opsRef.ok) return leadRef.ok ? opsRef : leadRef;

  const leadBusinessId = clean(input.leadBusinessId,180);
  const opsManagementId = clean(input.opsManagementId,180);
  if (!leadBusinessId || !opsManagementId) return {ok:false,code:'PROJECTION_IDS_REQUIRED'};

  return {
    ok:true,
    runtimeEnabled:RUNTIME_ENABLED,
    writesEnabled:WRITES_ENABLED,
    business:{
      id:leadBusinessId,
      nombre:clean(input.contactName,220) || 'Oportunidad CotComp',
      tipo:DEFAULTS.businessType,
      etapa:cfg.value.workflowStage,
      asesorId:cfg.value.ownerAdvisorId,
      pais:clean(input.country,8).toUpperCase(),
      canal:'Web pública A&S',
      producto:clean(input.product,180),
      origen:'CotComp',
      cotcompRef:leadRef.value
    },
    management:{
      id:opsManagementId,
      lista:cfg.value.opsList,
      tipo:DEFAULTS.managementType,
      titulo:clean(input.title,240) || `Cotización web · ${clean(input.product,120)}`,
      negocioId:leadBusinessId,
      asesorId:cfg.value.ownerAdvisorId,
      estado:DEFAULTS.managementStatus,
      origen:'CotComp',
      cotcompRef:opsRef.value
    },
    assignment:{
      initialAdvisorId:cfg.value.ownerAdvisorId,
      assignmentStatus:'PENDING_OWNER_DECISION',
      ownerActionRequired:true,
      options:['WORK_MYSELF','ASSIGN_ANOTHER_ADVISOR'],
      advisorSelectorSource:'TENANT_TEAM_ROLES_CONFIG',
      reassignmentCreatesNewBusiness:false,
      reassignmentCreatesNewManagement:false
    },
    notifications:{
      firstRecipientUserUid:cfg.value.ownerUserUid,
      channels:cfg.value.notificationChannels,
      deliveryIsReleaseGated:true
    }
  };
}

function ownerPatchPlan(){
  return Object.freeze({
    target:TARGET_OWNER,
    requiredDelta:REQUIRED_SCHEMA_DELTA,
    exactIntent:[
      'sanitizeBusiness preserves validated cotcompRef',
      'sanitizeManagement preserves validated cotcompRef',
      'update allow-lists may preserve cotcompRef',
      'no auth behavior change',
      'no storage path change',
      'no default workflow transition change',
      'no unrelated module change'
    ],
    applyNow:false
  });
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  APPLY_TO_OWNER_SOURCE_ALLOWED,
  WRITES_ENABLED,
  TARGET_OWNER,
  REQUIRED_SCHEMA_DELTA,
  DEFAULTS,
  runtimeConfigPath,
  validateRuntimeConfig,
  cotcompRef,
  buildProjectionPayloads,
  ownerPatchPlan
});
