'use strict';

const VERSION='ays-portal-p01-readonly-contract-v0.1';
const TENANT_ID='alianzas-soluciones';

const BACKEND_CONTRACT=Object.freeze({
  transport:'firebase_callable',
  auth:'firebase_auth_external_customer',
  grantCollection:'portalCustomerAccessGrants',
  grantLookup:'server_side',
  dataAccess:'admin_sdk_server_side',
  browserFirestoreRead:false,
  browserFirestoreWrite:false,
  customerAsTenantMember:false,
  projection:'allowlisted_read_only_dto',
  failClosed:true
});

const IDENTITY_PROVIDER_GATE=Object.freeze({
  externalProviderRequired:true,
  projectProviderEnablementVerified:false,
  preferredCandidate:'email_link_or_verified_email_flow',
  passwordStorageByAys:false,
  uidContinuityRequiredForEmailChange:true,
  recreatedUidRequiresGrantReissue:true
});

const GRANT_LIFECYCLE=Object.freeze({
  statuses:Object.freeze(['active','revoked']),
  operations:Object.freeze(['issue','reissue','revoke']),
  expiryRequired:true,
  clientScopeRequired:true,
  directSelfGrantAllowed:false,
  staffMembershipMutationAllowed:false
});

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
  'grantId','tenantId','identitySubject','clientIds','status','expiresAt',
  'issuedAt','issuedByRef','issueReason','version','revokedAt','revokedByRef','revocationReason'
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

function grantDocumentId(identitySubject){
  const id=clean(identitySubject,180);
  if(!/^[A-Za-z0-9._:-]{6,180}$/.test(id))return '';
  return id;
}

function buildGrantRecord({identitySubject,clientIds,expiresAt,issuedAt,issuedByRef,issueReason,version}={}){
  const errors=[];
  const subject=grantDocumentId(identitySubject);
  const clients=Array.from(new Set([].concat(clientIds||[]).map(v=>clean(v,180)).filter(Boolean)));
  const exp=clean(expiresAt,40),issued=clean(issuedAt,40);
  const ver=Number(version||1);
  if(!subject)errors.push('GRANT_SUBJECT_INVALID');
  if(!clients.length)errors.push('GRANT_CLIENT_SCOPE_REQUIRED');
  if(!exp||!Number.isFinite(Date.parse(exp)))errors.push('GRANT_EXPIRY_REQUIRED');
  if(!issued||!Number.isFinite(Date.parse(issued)))errors.push('GRANT_ISSUED_AT_REQUIRED');
  if(exp&&issued&&Date.parse(exp)<=Date.parse(issued))errors.push('GRANT_EXPIRY_MUST_FOLLOW_ISSUE');
  if(!clean(issuedByRef,180))errors.push('GRANT_ISSUER_REF_REQUIRED');
  if(!clean(issueReason,240))errors.push('GRANT_ISSUE_REASON_REQUIRED');
  if(!Number.isInteger(ver)||ver<1)errors.push('GRANT_VERSION_INVALID');
  if(errors.length)return {ok:false,errors:Array.from(new Set(errors))};
  return {
    ok:true,
    record:Object.freeze({
      grantId:subject,
      tenantId:TENANT_ID,
      identitySubject:subject,
      clientIds:Object.freeze(clients),
      status:'active',
      expiresAt:exp,
      issuedAt:issued,
      issuedByRef:clean(issuedByRef,180),
      issueReason:clean(issueReason,240),
      version:ver,
      revokedAt:'',
      revokedByRef:'',
      revocationReason:''
    })
  };
}

function revokeGrantRecord(grant,{revokedAt,revokedByRef,revocationReason}={}){
  if(!grant||norm(grant.status)!=='active')return {ok:false,code:'GRANT_NOT_ACTIVE'};
  const at=clean(revokedAt,40),by=clean(revokedByRef,180),reason=clean(revocationReason,240);
  if(!at||!Number.isFinite(Date.parse(at)))return {ok:false,code:'REVOCATION_TIME_REQUIRED'};
  if(!by)return {ok:false,code:'REVOCATION_ACTOR_REQUIRED'};
  if(!reason)return {ok:false,code:'REVOCATION_REASON_REQUIRED'};
  return {
    ok:true,
    record:Object.freeze(Object.assign({},grant,{
      status:'revoked',
      revokedAt:at,
      revokedByRef:by,
      revocationReason:reason
    }))
  };
}

function reissueGrantRecord(grant,{clientIds,expiresAt,issuedAt,issuedByRef,issueReason}={}){
  const subject=clean(grant&&grant.identitySubject,180);
  const version=Number(grant&&grant.version||0)+1;
  return buildGrantRecord({identitySubject:subject,clientIds,expiresAt,issuedAt,issuedByRef,issueReason,version});
}

async function makeReadOnlyHandler(deps,input={}){
  const d=deps||{};
  const authUid=clean(input.authUid,180);
  if(!authUid)return {ok:false,code:'AUTH_REQUIRED'};
  if(typeof d.loadGrant!=='function'||typeof d.loadClient!=='function'||typeof d.loadPolicies!=='function'||typeof d.loadInsurers!=='function'||typeof d.loadDocuments!=='function'){
    return {ok:false,code:'BACKEND_DEPENDENCIES_REQUIRED'};
  }

  const identity={
    subject:authUid,
    provider:clean(input.provider||'firebase_auth_external_customer',80),
    emailVerified:input.emailVerified===true,
    status:clean(input.identityStatus||'active',40)
  };
  const idCheck=validatePortalIdentity(identity);
  if(!idCheck.ok)return {ok:false,code:'IDENTITY_DENY',errors:idCheck.errors};

  const grant=await d.loadGrant(authUid);
  const scope=resolveClientScope({identity,grant,requestedClientId:input.requestedClientId,nowIso:input.nowIso});
  if(!scope.ok)return scope;

  const requestedAccountRef=clean(input.accountRef,180);
  if(requestedAccountRef&&scope.clientIds.indexOf(requestedAccountRef)<0)return {ok:false,code:'ACCOUNT_SCOPE_DENY'};
  const clientId=requestedAccountRef||scope.clientIds[0];
  if(!clientId)return {ok:false,code:'ACCOUNT_SCOPE_EMPTY'};

  const [client,policies,insurers,documents]=await Promise.all([
    d.loadClient(clientId),
    d.loadPolicies(clientId),
    d.loadInsurers(),
    d.loadDocuments(clientId)
  ]);
  if(!client||clean(client.id,180)!==clientId)return {ok:false,code:'CLIENT_NOT_FOUND_OR_SCOPE_MISMATCH'};

  const insurersById={};
  for(const row of [].concat(insurers||[])){
    const id=clean(row&&row.id,180);
    if(id)insurersById[id]=row;
  }

  return {
    ok:true,
    tenantId:TENANT_ID,
    accountRef:clientId,
    allowedAccountRefs:scope.clientIds.slice(),
    projection:buildReadOnlyProjection({client,policies,insurersById,documents})
  };
}

module.exports=Object.freeze({
  VERSION,TENANT_ID,BACKEND_CONTRACT,IDENTITY_PROVIDER_GATE,GRANT_LIFECYCLE,POLICY,CUSTOMER_IDENTITY_FIELDS,ACCESS_GRANT_FIELDS,
  clean,norm,validatePortalIdentity,validateAccessGrant,resolveClientScope,
  accountProjection,policyProjection,documentProjection,buildReadOnlyProjection,grantDocumentId,buildGrantRecord,revokeGrantRecord,reissueGrantRecord,makeReadOnlyHandler
});
