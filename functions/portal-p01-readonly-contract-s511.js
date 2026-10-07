'use strict';

const VERSION='ays-portal-p01-readonly-contract-v0.1';
const TENANT_ID='alianzas-soluciones';

const POLICY=Object.freeze({
  version:VERSION,
  sourceOnly:true,
  externalCustomerIdentityRequired:true,
  staffSessionReuseAllowed:false,
  directBrowserClientIdAllowed:false,
  writeOperationsAllowed:false,
  paymentsAllowed:false,
  paymentReportingAllowed:false,
  uploadsAllowed:false,
  claimsTransactionsAllowed:false,
  policyChangesAllowed:false,
  bidirectionalMessagingAllowed:false,
  aiAllowed:false,
  rawStorageUrlsAllowed:false
});

const CUSTOMER_IDENTITY_FIELDS=Object.freeze([
  'subject','provider','emailVerified','status'
]);

const ACCESS_GRANT_FIELDS=Object.freeze([
  'grantId','tenantId','identitySubject','clientIds','status','expiresAt'
]);

function clean(v,m=300){return String(v==null?'':v).trim().slice(0,m);}
function norm(v){return clean(v,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}

function validatePortalIdentity(input={}){
  const errors=[];
  const unknown=Object.keys(input||{}).filter(k=>!CUSTOMER_IDENTITY_FIELDS.includes(k));
  if(unknown.length)errors.push('UNKNOWN_IDENTITY_FIELDS');
  if(!clean(input.subject,180))errors.push('IDENTITY_SUBJECT_REQUIRED');
  if(!clean(input.provider,80))errors.push('IDENTITY_PROVIDER_REQUIRED');
  if(input.emailVerified!==true)errors.push('IDENTITY_EMAIL_NOT_VERIFIED');
  if(norm(input.status||'active')!=='active')errors.push('IDENTITY_INACTIVE');
  return {ok:errors.length===0,errors:Array.from(new Set(errors))};
}

function validateAccessGrant(grant={},identitySubject,nowIso){
  const errors=[];
  const unknown=Object.keys(grant||{}).filter(k=>!ACCESS_GRANT_FIELDS.includes(k));
  if(unknown.length)errors.push('UNKNOWN_GRANT_FIELDS');
  if(clean(grant.tenantId,180)!==TENANT_ID)errors.push('GRANT_TENANT_DENY');
  if(clean(grant.identitySubject,180)!==clean(identitySubject,180))errors.push('GRANT_SUBJECT_DENY');
  if(norm(grant.status)!=='active')errors.push('GRANT_INACTIVE');
  const clients=Array.from(new Set([].concat(grant.clientIds||[]).map(v=>clean(v,180)).filter(Boolean)));
  if(!clients.length)errors.push('GRANT_CLIENT_SCOPE_REQUIRED');
  if(grant.expiresAt&&Date.parse(grant.expiresAt)<=Date.parse(nowIso||new Date().toISOString()))errors.push('GRANT_EXPIRED');
  return {ok:errors.length===0,errors:Array.from(new Set(errors)),clientIds:clients};
}

function resolveClientScope({identity,grant,requestedClientId,nowIso}={}){
  const i=validatePortalIdentity(identity||{});
  if(!i.ok)return {ok:false,code:'IDENTITY_DENY',errors:i.errors};
  const g=validateAccessGrant(grant||{},identity.subject,nowIso);
  if(!g.ok)return {ok:false,code:'GRANT_DENY',errors:g.errors};
  if(requestedClientId)return {ok:false,code:'BROWSER_CLIENT_ID_DENY'};
  return {ok:true,tenantId:TENANT_ID,clientIds:g.clientIds.slice()};
}

function accountProjection(client={}){
  return Object.freeze({
    clientRef:clean(client.id,180),
    displayName:clean(client.nombre||client.name,180),
    country:clean(client.pais||client.country,8).toUpperCase(),
    type:clean(client.tipo||client.type,80)
  });
}

function policyProjection(policy={},insurer={}){
  return Object.freeze({
    policyRef:clean(policy.id,180),
    policyNumber:clean(policy.numero||policy.number,120),
    product:clean(policy.producto||policy.ramo||policy.product||policy.line,180),
    line:clean(policy.ramo||policy.line,140),
    status:clean(policy.estado||policy.status,80),
    effectiveFrom:clean(policy.inicio||policy.desde||policy.effectiveFrom,40),
    effectiveTo:clean(policy.vence||policy.hasta||policy.effectiveTo,40),
    insurerName:clean(insurer.nombre||insurer.name,180)
  });
}

function documentProjection(doc={}){
  return Object.freeze({
    documentRef:clean(doc.id,180),
    title:clean(doc.nombre||doc.tipo||doc.title,220),
    type:clean(doc.tipo||doc.type,120),
    date:clean(doc.fecha||doc.date,40),
    secureViewerEligible:!!clean(doc.storagePath||doc.driveFileId||doc.fileRef,500)
  });
}

function buildReadOnlyProjection({client,policies,insurersById,documents}={}){
  const safePolicies=[].concat(policies||[]).filter(p=>p&&['Vigente','Por renovar'].includes(p.estado)).map(p=>{
    const insurer=(insurersById&&insurersById[p.aseguradoraId])||{};
    return policyProjection(p,insurer);
  });
  const safeDocs=[].concat(documents||[]).filter(d=>d&&clean(d.clienteId,180)===clean(client&&client.id,180)).map(documentProjection);
  return Object.freeze({
    schemaVersion:VERSION,
    readOnly:true,
    account:accountProjection(client||{}),
    policies:Object.freeze(safePolicies),
    documents:Object.freeze(safeDocs),
    excluded:Object.freeze({
      payments:true,
      claimsTransactions:true,
      uploads:true,
      policyChanges:true,
      messaging:true,
      ai:true
    })
  });
}

module.exports=Object.freeze({
  VERSION,TENANT_ID,POLICY,CUSTOMER_IDENTITY_FIELDS,ACCESS_GRANT_FIELDS,
  clean,norm,validatePortalIdentity,validateAccessGrant,resolveClientScope,
  accountProjection,policyProjection,documentProjection,buildReadOnlyProjection
});
