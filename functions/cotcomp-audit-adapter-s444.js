'use strict';

const crypto=require('node:crypto');
const security=require('./cotcomp-negative-security-contract');

const VERSION='ays-cotcomp-audit-adapter-s444-v1.0';
const EXECUTION_ENABLED=false;
const WRITE_CALLS_ALLOWED=false;

function clean(v,max=240){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function stable(v){
  if(v==null) return v;
  if(Array.isArray(v)) return v.map(stable);
  if(typeof v==='object') return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function digest(v){
  return crypto.createHash('sha256').update(JSON.stringify(stable(v)),'utf8').digest('hex');
}
function auditId({tenantId,caseId,correlationId,type,status,digest:requestDigest}={}){
  const seed=[tenantId,caseId,correlationId,type,status,requestDigest].map(x=>clean(x,300)).join('|');
  return 'aud_'+crypto.createHash('sha256').update(seed,'utf8').digest('hex').slice(0,24);
}
function pathFor(tenantId,id){
  const t=clean(tenantId,180);
  const a=clean(id,180);
  if(t!=='alianzas-soluciones') throw new Error('AUDIT_TENANT_NOT_ALLOWED');
  if(!/^aud_[a-f0-9]{24}$/.test(a)) throw new Error('AUDIT_ID_INVALID');
  return 'tenants/'+t+'/cotcomp/events/items/'+a;
}
function buildAuditRecord(input={}){
  const required=['tenantId','caseId','correlationId','type','status','digest'];
  const missing=required.filter(k=>!clean(input[k],300));
  if(missing.length) return {ok:false,code:'AUDIT_REQUIRED_FIELDS',missing};

  const record={
    schemaVersion:VERSION,
    eventClass:'COTCOMP_AUDIT',
    tenantId:clean(input.tenantId,180),
    caseId:clean(input.caseId,180),
    correlationId:clean(input.correlationId,180),
    type:clean(input.type,120),
    status:clean(input.status,100),
    digest:clean(input.digest,128),
    proofRunId:clean(input.proofRunId,180),
    synthetic:input.synthetic===true,
    actorType:clean(input.actorType||'SERVER_COTCOMP_WRITER',120),
    createdAt:input.createdAt||null
  };
  const safety=security.validatePublicPayload(record);
  if(!safety.ok) return {ok:false,code:'AUDIT_PAYLOAD_UNSAFE',safety};
  const id=auditId(record);
  return {
    ok:true,
    id,
    path:pathFor(record.tenantId,id),
    record,
    recordDigest:digest(record),
    executable:false
  };
}
function assertExecutionClosed(){
  const error=new Error('COTCOMP_S444_AUDIT_EXECUTION_DISABLED');
  error.code='COTCOMP_S444_AUDIT_EXECUTION_DISABLED';
  throw error;
}
function createAdapter(){
  return Object.freeze({
    VERSION,EXECUTION_ENABLED,WRITE_CALLS_ALLOWED,
    preview:buildAuditRecord,
    async record(){assertExecutionClosed();}
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,WRITE_CALLS_ALLOWED,
  clean,digest,auditId,pathFor,buildAuditRecord,assertExecutionClosed,createAdapter
});
