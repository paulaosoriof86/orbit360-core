'use strict';

const crypto=require('node:crypto');
const portal=require('./portal-p01-readonly-contract-s511');

const VERSION='ays-portal-p01-grant-admin-s511b-v0.1';
const MANAGE_ROLES=Object.freeze(['SuperAdmin','AdminTenant']);

function clean(v,m=300){return String(v==null?'':v).trim().slice(0,m);}
function norm(v){return clean(v,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function sha(v){return crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');}
function stable(v){
  if(v==null)return v;
  if(Array.isArray(v))return v.map(stable);
  if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function digest(v){return sha(JSON.stringify(stable(v)));}

function rolesFrom(member={}){
  return Array.from(new Set([].concat(member.roles||[],member.activeRole||[],member.defaultRole||[],member.rol||[]).map(v=>clean(v,120)).filter(Boolean)));
}
function canManage(member={}){
  if(member.active===false||member.activo===false)return false;
  const status=norm(member.status||member.estado||'active');
  if(['blocked','bloqueado','inactive','inactivo','suspended','suspendido'].includes(status))return false;
  const roles=rolesFrom(member);
  if(roles.some(r=>MANAGE_ROLES.includes(r)))return true;
  const permissions=[].concat(member.permissions||[],member.permisos||[]).map(norm);
  return permissions.includes('portal_grants_manage')||permissions.includes('manage_portal_grants');
}
function actorRef(member={}){
  const uid=clean(member.uid||member.id,180);
  return uid?'actor:'+sha(uid).slice(0,24):'';
}
function validateCommand(input={}){
  const operation=norm(input.operation);
  const errors=[];
  if(!['issue','reissue','revoke'].includes(operation))errors.push('OPERATION_INVALID');
  if(!clean(input.identitySubject,180))errors.push('IDENTITY_SUBJECT_REQUIRED');
  if(!clean(input.reason,240))errors.push('REASON_REQUIRED');
  if(!clean(input.requestId,180))errors.push('REQUEST_ID_REQUIRED');
  return {ok:errors.length===0,errors,operation};
}
function buildCommandPlan({member,input,existingGrant,nowIso}={}){
  if(!canManage(member||{}))return {ok:false,code:'GRANT_ADMIN_DENY'};
  const v=validateCommand(input||{});
  if(!v.ok)return {ok:false,code:'COMMAND_INVALID',errors:v.errors};

  const actor=actorRef(member);
  if(!actor)return {ok:false,code:'ACTOR_REF_REQUIRED'};
  const operation=v.operation;
  let grantResult;

  if(operation==='issue'){
    if(existingGrant&&norm(existingGrant.status)==='active')return {ok:false,code:'ACTIVE_GRANT_ALREADY_EXISTS'};
    grantResult=portal.buildGrantRecord({
      identitySubject:input.identitySubject,
      clientIds:input.clientIds,
      issuedAt:nowIso,
      expiresAt:input.expiresAt,
      issuedByRef:actor,
      issueReason:input.reason,
      version:Number(input.version||1)
    });
  }else if(operation==='reissue'){
    if(!existingGrant)return {ok:false,code:'EXISTING_GRANT_REQUIRED'};
    grantResult=portal.reissueGrantRecord(existingGrant,{
      clientIds:input.clientIds,
      issuedAt:nowIso,
      expiresAt:input.expiresAt,
      issuedByRef:actor,
      issueReason:input.reason
    });
  }else{
    if(!existingGrant)return {ok:false,code:'EXISTING_GRANT_REQUIRED'};
    grantResult=portal.revokeGrantRecord(existingGrant,{
      revokedAt:nowIso,
      revokedByRef:actor,
      revocationReason:input.reason
    });
  }

  if(!grantResult||grantResult.ok!==true)return {ok:false,code:'GRANT_RECORD_INVALID',errors:grantResult&&grantResult.errors||[],detail:grantResult&&grantResult.code||''};

  const payloadDigest=digest({operation,grant:grantResult.record});
  return {
    ok:true,
    executionAllowed:false,
    schemaVersion:VERSION,
    operation,
    requestId:clean(input.requestId,180),
    actorRef:actor,
    grantDocumentId:portal.grantDocumentId(input.identitySubject),
    grant:grantResult.record,
    payloadDigest,
    audit:Object.freeze({
      eventType:'PORTAL_ACCESS_GRANT_'+operation.toUpperCase(),
      identitySubjectCommitment:sha(clean(input.identitySubject,180)),
      clientScopeCount:[].concat(grantResult.record.clientIds||[]).length,
      grantVersion:Number(grantResult.record.version||0),
      reason:clean(input.reason,240)
    })
  };
}

function idempotencyDecision(existingReceipt={},plan={}){
  if(!plan||plan.ok!==true)return {decision:'DENY_INVALID_PLAN'};
  if(!existingReceipt||!existingReceipt.requestId)return {decision:'CREATE_PROPOSED',payloadDigest:plan.payloadDigest};
  if(clean(existingReceipt.requestId,180)!==clean(plan.requestId,180))return {decision:'CREATE_PROPOSED',payloadDigest:plan.payloadDigest};
  if(clean(existingReceipt.payloadDigest,64)===clean(plan.payloadDigest,64))return {decision:'REUSE',payloadDigest:plan.payloadDigest};
  return {decision:'DENY_CONFLICT',payloadDigest:plan.payloadDigest};
}

module.exports=Object.freeze({
  VERSION,MANAGE_ROLES,clean,norm,sha,digest,rolesFrom,canManage,actorRef,
  validateCommand,buildCommandPlan,idempotencyDecision
});
