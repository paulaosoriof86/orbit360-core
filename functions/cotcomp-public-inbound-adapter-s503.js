'use strict';

const H=require('./cotcomp-gravicentra-handoff-contract-s502');

const VERSION='ays-cotcomp-s503-public-inbound-adapter-v0.1-source-only';
const RUNTIME_EXPORT_ALLOWED=false;
const EXECUTION_ENABLED=false;
const WRITES_ENABLED=false;
const PRODUCTION=false;

const POLICY=Object.freeze({
  channel:'PUBLIC_WEB',
  tenantId:'alianzas-soluciones',
  enforceAppCheck:true,
  consumeAppCheckToken:true,
  authenticatedUserRequired:false,
  allowedCountries:Object.freeze(['GT','CO']),
  writesAllowed:false,
  runtimeExportAllowed:false,
  maxPayloadBytes:24*1024,
  requestManagementConsentRequired:true,
  directFirestoreFromBrowser:false,
  internalCallableExposedToPublic:false
});

function text(v,max=300){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function byteLength(v){return Buffer.byteLength(JSON.stringify(v==null?{}:v),'utf8');}
function country(v){
  const n=text(v,40).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  if(n==='GT'||n==='GUATEMALA')return 'GT';
  if(n==='CO'||n==='COLOMBIA')return 'CO';
  return '';
}
function safeContext(data={}){
  const allowed={};
  const fields=['country','pais','family','need','necesidad','mode','modalidad','summary','contextSummary','handoffId'];
  for(const k of fields) if(data[k]!==undefined) allowed[k]=data[k];
  if(data.contact&&typeof data.contact==='object'){
    allowed.contact={
      name:text(data.contact.name||data.contact.nombre,180),
      whatsapp:text(data.contact.whatsapp||data.contact.phone||data.contact.telefono,40),
      email:text(data.contact.email,180),
      requestManagementConsent:data.contact.requestManagementConsent===true||data.contact.consent===true
    };
  }
  if(data.cotcompRef&&typeof data.cotcompRef==='object'){
    allowed.cotcompRef={
      caseId:text(data.cotcompRef.caseId,180),
      journeyId:text(data.cotcompRef.journeyId,180),
      correlationId:text(data.cotcompRef.correlationId,180),
      quoteCasePath:text(data.cotcompRef.quoteCasePath,500),
      selectedProposalId:text(data.cotcompRef.selectedProposalId,180)
    };
  }
  return allowed;
}
function validateRequest(request={}){
  const errors=[];
  const data=request.data&&typeof request.data==='object'?request.data:{};
  if(!request.app)errors.push('APP_CHECK_REQUIRED');
  if(byteLength(data)>POLICY.maxPayloadBytes)errors.push('PAYLOAD_TOO_LARGE');
  const c=country(data.country||data.pais);
  if(!c)errors.push('COUNTRY_REQUIRED');
  if(c&&!POLICY.allowedCountries.includes(c))errors.push('COUNTRY_NOT_ALLOWED');

  const sanitized=safeContext(data);
  const contract=H.buildSourceOnlyHandoff(sanitized);
  errors.push(...contract.blockers);

  return {
    version:VERSION,
    ok:errors.length===0,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    production:PRODUCTION,
    policy:POLICY,
    country:c,
    sanitized,
    handoffContract:contract,
    errors:[...new Set(errors)]
  };
}
function buildServerPlan(request={},deps={}){
  const validation=validateRequest(request);
  const routing=typeof deps.resolveAdvisor==='function'
    ? deps.resolveAdvisor({tenantId:POLICY.tenantId,country:validation.country,family:validation.handoffContract.family})
    : null;

  const routingState=routing&&routing.advisorId
    ? {ok:true,advisorId:text(routing.advisorId,180),strategy:text(routing.strategy||'configured',100)}
    : {ok:false,code:'ADVISOR_ROUTING_REQUIRED'};

  const serverPlan={
    version:VERSION,
    ok:validation.ok&&routingState.ok,
    executionEnabled:false,
    writesEnabled:false,
    production:false,
    validation,
    routing:routingState,
    nextServerOperation:validation.ok&&routingState.ok?'CREATE_BUSINESS_VIA_INTERNAL_DOMAIN':'BLOCKED',
    proposedCommand:validation.ok&&routingState.ok
      ? Object.assign({},validation.handoffContract.proposedCommand,{
          payload:Object.assign({},validation.handoffContract.proposedCommand.payload,{asesorId:routingState.advisorId})
        })
      : null,
    requiredReadback:['entityId','eventId','advisorVisible','notificationOutbox'],
    userSuccessCopyAllowed:false
  };
  return serverPlan;
}
function assertExecutionClosed(){
  const e=new Error('COTCOMP_PUBLIC_INBOUND_EXECUTION_DISABLED');
  e.code='COTCOMP_PUBLIC_INBOUND_EXECUTION_DISABLED';
  throw e;
}

module.exports=Object.freeze({
  VERSION,RUNTIME_EXPORT_ALLOWED,EXECUTION_ENABLED,WRITES_ENABLED,PRODUCTION,POLICY,
  safeContext,validateRequest,buildServerPlan,assertExecutionClosed
});
