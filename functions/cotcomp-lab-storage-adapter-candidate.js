'use strict';

const VERSION = 'ays-cotcomp-lab-storage-adapter-candidate-s423-v0.1';
const READY = false;
const EXECUTION_ENABLED = false;
const WRITES_ENABLED = false;
const DRIVER_CALLS_ALLOWED = false;
const SERVER_SIDE_ONLY = true;

const EXPECTED = Object.freeze({
  projectId: 'ays-orbit-360-lab',
  environment: 'LAB',
  tenantId: 'alianzas-soluciones',
  workflowStorageMode: 'canonicalV2',
  workflowOwnerBlob: '73e09a4404cb4298dc34c9c38e26ad1f960d3170'
});

const COTCOMP_ENTITIES = Object.freeze([
  'quoteCases','proposals','comparisonSets','selections','caseAccess','idempotency','events'
]);
const WORKFLOW_COLLECTIONS = Object.freeze(['negocios','gestiones']);

function clean(v,max=500){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}

function classifyPath(path){
  path=clean(path,800);
  const cotcompPrefix='tenants/'+EXPECTED.tenantId+'/cotcomp/';
  const workflowPrefix='tenants/'+EXPECTED.tenantId+'/workflow/';
  const outboxPrefix='tenants/'+EXPECTED.tenantId+'/notificationOutbox/';

  if(path.startsWith(cotcompPrefix)){
    const rest=path.slice(cotcompPrefix.length).split('/');
    if(rest.length===3 && COTCOMP_ENTITIES.includes(rest[0]) && rest[1]==='items' && /^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(rest[2])){
      return {ok:true,kind:'COTCOMP_ENTITY',entity:rest[0],id:rest[2],path};
    }
  }

  if(path.startsWith(workflowPrefix)){
    const rest=path.slice(workflowPrefix.length).split('/');
    if(rest.length===3 && WORKFLOW_COLLECTIONS.includes(rest[0]) && rest[1]==='items' && /^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(rest[2])){
      return {ok:true,kind:'WORKFLOW_PROJECTION',entity:rest[0],id:rest[2],path};
    }
  }

  if(path.startsWith(outboxPrefix)){
    const id=path.slice(outboxPrefix.length);
    if(/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(id)){
      return {ok:true,kind:'NOTIFICATION_OUTBOX',entity:'notificationOutbox',id,path};
    }
  }

  return {ok:false,code:'STORAGE_PATH_NOT_ALLOWED',path};
}

function evaluateReadiness(input = {}){
  const reasons=[];
  if(input.projectId!==EXPECTED.projectId) reasons.push('PROJECT_NOT_LAB');
  if(input.environment!==EXPECTED.environment) reasons.push('ENVIRONMENT_NOT_LAB');
  if(input.tenantId!==EXPECTED.tenantId) reasons.push('TENANT_NOT_ALLOWED');
  if(input.workflowStorageMode!==EXPECTED.workflowStorageMode) reasons.push('WORKFLOW_CANONICAL_V2_REQUIRED');
  if(input.workflowOwnerBlobDeployed!==EXPECTED.workflowOwnerBlob) reasons.push('WORKFLOW_SCHEMA_NOT_DEPLOYED');
  if(input.retentionPolicyApproved!==true) reasons.push('RETENTION_POLICY_REQUIRED');
  if(input.caseAccessPersistenceApproved!==true) reasons.push('CASE_ACCESS_PERSISTENCE_APPROVAL_REQUIRED');
  if(input.negativeSecurityQaPass!==true) reasons.push('NEGATIVE_SECURITY_QA_REQUIRED');
  if(input.ownerWriteAuthorization!==true) reasons.push('OWNER_WRITE_AUTHORIZATION_REQUIRED');
  if(input.deployAuthorization!==true) reasons.push('DEPLOY_AUTHORIZATION_REQUIRED');

  return {
    ok:reasons.length===0,
    reasons,
    readyByCode:READY,
    executionEnabledByCode:EXECUTION_ENABLED,
    writesEnabledByCode:WRITES_ENABLED,
    driverCallsAllowedByCode:DRIVER_CALLS_ALLOWED,
    effectiveReady:false
  };
}

function validateServerContext(context = {}){
  const reasons=[];
  if(context.actorType!=='SERVER_COTCOMP_WRITER') reasons.push('SERVER_WRITER_CONTEXT_REQUIRED');
  if(context.tenantId!==EXPECTED.tenantId) reasons.push('TENANT_NOT_ALLOWED');
  if(context.publicBrowser===true) reasons.push('PUBLIC_BROWSER_FORBIDDEN');
  return {ok:reasons.length===0,reasons};
}

function validateDriver(driver = {}){
  const required=['get','runAtomicGroup','patch'];
  const missing=required.filter(name=>typeof driver[name]!=='function');
  return {ok:missing.length===0,missing};
}

function validateCommand(command = {}){
  const pathState=classifyPath(command.path);
  if(!pathState.ok) return pathState;

  const type=clean(command.type,100);
  const allowed=new Set([
    'CREATE_IF_ABSENT',
    'UPSERT_DETERMINISTIC',
    'UPSERT_VERSIONED_PROPOSAL',
    'CREATE_IDEMPOTENT_SELECTION',
    'PATCH'
  ]);
  if(!allowed.has(type)) return {ok:false,code:'STORAGE_OPERATION_NOT_ALLOWED',type};

  if(pathState.kind==='WORKFLOW_PROJECTION' && command.serverProjection!==true){
    return {ok:false,code:'WORKFLOW_SERVER_PROJECTION_REQUIRED'};
  }

  if(command.blocked===true){
    return {ok:false,code:clean(command.blockReason,180)||'COMMAND_BLOCKED'};
  }

  return {ok:true,pathState,type};
}

function previewRead({path,context} = {}){
  const ctx=validateServerContext(context);
  const p=classifyPath(path);
  return {ok:ctx.ok && p.ok,context:ctx,path:p,executable:false,readOnly:true};
}

function previewAtomicGroup({group,commands,context} = {}){
  const ctx=validateServerContext(context);
  const list=Array.isArray(commands)?commands:[];
  const validations=list.map(validateCommand);
  const invalid=validations.filter(x=>!x.ok);
  return {
    ok:ctx.ok && list.length>0 && invalid.length===0,
    group:clean(group,80),
    commandCount:list.length,
    context:ctx,
    invalid,
    executable:false,
    atomicity:'DRIVER_CONTRACT_ONLY'
  };
}

function previewPatch({path,patch,context} = {}){
  const ctx=validateServerContext(context);
  const p=classifyPath(path);
  const hasPatch=patch && typeof patch==='object' && !Array.isArray(patch) && Object.keys(patch).length>0;
  return {
    ok:ctx.ok && p.ok && hasPatch,
    context:ctx,
    path:p,
    patchKeys:hasPatch?Object.keys(patch).sort():[],
    executable:false
  };
}

function assertClosed(){
  const error=new Error('COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY');
  error.code='COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY';
  throw error;
}

function createLabStorageAdapter({driver,context} = {}){
  const driverState=validateDriver(driver);
  const contextState=validateServerContext(context);

  return Object.freeze({
    VERSION,READY,EXECUTION_ENABLED,WRITES_ENABLED,DRIVER_CALLS_ALLOWED,SERVER_SIDE_ONLY,
    driverState,contextState,
    previewRead(args={}){ return previewRead({...args,context}); },
    previewAtomicGroup(args={}){ return previewAtomicGroup({...args,context}); },
    previewPatch(args={}){ return previewPatch({...args,context}); },
    async read(){ assertClosed(); },
    async runAtomicGroup(){ assertClosed(); },
    async patch(){ assertClosed(); }
  });
}

module.exports=Object.freeze({
  VERSION,READY,EXECUTION_ENABLED,WRITES_ENABLED,DRIVER_CALLS_ALLOWED,SERVER_SIDE_ONLY,
  EXPECTED,COTCOMP_ENTITIES,WORKFLOW_COLLECTIONS,
  classifyPath,evaluateReadiness,validateServerContext,validateDriver,validateCommand,
  previewRead,previewAtomicGroup,previewPatch,assertClosed,createLabStorageAdapter
});
