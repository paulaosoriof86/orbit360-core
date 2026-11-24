'use strict';

// Authenticated intake contract. This module performs no network request and no
// write. The only operational writer remains product-ops-leads-domain.execute.
const crypto = require('node:crypto');
const TENANT = 'alianzas-soluciones', COUNTRY = 'GT', INSTANCE = '710522720868';
const SCENARIO = 10196136, FIRESTORE_CONNECTION = 14756714;
const INTEGRATION = 'make_ays_ad_leads';
const SCHEMA = 'GI_I66_MAKE_LEAD_INGRESS_V1';
const GRANT_SCHEMA = 'GI_I66_MAKE_LEAD_INGRESS_GRANT_V1';
const PROBE_SCHEMA = 'GI_I66_MAKE_LEAD_PRINCIPAL_PROBE_V1';
const SCOPE_CONTRACT_BLOB = '7ce546736ac8d08b8ac922d19f3e6e4c2bac0021';
const META_RECEIPT_PATH='artifacts/orbit360-recovery/release-control/I6_6_META_WHATSAPP_ATTRIBUTION_READONLY_20261124.json';
const META_RECEIPT_BLOB='ca24ec3265bc3b1b6c77a8ff63f37b9be913abbd';
const QUEUE = 'leadIngressRequests', PREVIEW_QUEUE = 'previewLeadIngressRequests';
const MAX_CENSUS = 10000;
class IngressError extends Error { constructor(code, retryable=false) { super(code); this.code=code; this.retryable=retryable; } }
const need = (ok,code) => { if(!ok) throw new IngressError(code); };
const str = v => typeof v === 'string' ? v : '';
const sha = v => crypto.createHash('sha256').update(String(v),'utf8').digest('hex');
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v==='object' ?
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])) : v;
const digest = v => sha(JSON.stringify(stable(v)));
const phone = v => str(v).replace(/[^0-9]/g,'');
const plain = v => !!v && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype;
const id = v => /^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(str(v));
const principalDigest = event => sha(str(event.authType)+'\n'+str(event.authId));
function requestDocument(event, previewOnly=false) {
  const queue = previewOnly ? PREVIEW_QUEUE : QUEUE;
  need(event && event.data && typeof event.data.data==='function','INGRESS_EVENT_REQUIRED');
  const requestId = event.params && event.params.requestId;
  need(id(requestId),'INGRESS_REQUEST_ID_INVALID');
  need(event.data.ref && event.data.ref.path===`tenants/${TENANT}/${queue}/${requestId}`,'INGRESS_QUEUE_SCOPE_MISMATCH');
  const row = event.data.data();
  need(plain(row) && Buffer.byteLength(JSON.stringify(row),'utf8')<=4000,'INGRESS_ENVELOPE_SIZE_OR_TYPE');
  return {row,requestId,queue,path:event.data.ref.path,envelopeDigest:digest(row)};
}
function envelope(event, previewOnly=false) {
  const incoming=requestDocument(event,previewOnly),row=incoming.row;
  const fields=['schema','provider','tenantId','country','instanceId','scenarioId','messageId','chatId','sourceType','sourceId','ctwaClid','qaNonce'];
  need(Object.keys(row).every(k=>fields.includes(k)),'INGRESS_UNAPPROVED_FIELD');
  need(row.schema===SCHEMA && row.provider==='greenapi','INGRESS_PROVIDER_SCHEMA_MISMATCH');
  need(row.tenantId===TENANT && row.country===COUNTRY && row.instanceId===INSTANCE && row.scenarioId===SCENARIO,'INGRESS_FIXED_SCOPE_MISMATCH');
  need(/^[A-Za-z0-9_-]{8,160}$/.test(str(row.messageId)),'INGRESS_MESSAGE_ID_INVALID');
  need(/^[1-9][0-9]{7,14}@c\.us$/.test(str(row.chatId)),'INGRESS_INDIVIDUAL_CHAT_REQUIRED');
  need(row.sourceType==='ad' && /^[A-Za-z0-9_-]{1,180}$/.test(str(row.sourceId)),'INGRESS_AD_ATTRIBUTION_REQUIRED');
  need(row.ctwaClid===undefined || row.ctwaClid==='' || /^[A-Za-z0-9._:-]{1,512}$/.test(str(row.ctwaClid)),'INGRESS_CTWA_INVALID');
  need(previewOnly ? /^[a-f0-9]{64}$/.test(str(row.qaNonce)) : row.qaNonce===undefined,'INGRESS_PREVIEW_BOUNDARY');
  return incoming;
}
function fixedGrant(grant,previewOnly){
  need(plain(grant)&&grant.schema===GRANT_SCHEMA,'INGRESS_GRANT_DISABLED_OR_MISSING');
  need(grant.tenantId===TENANT&&grant.country===COUNTRY&&grant.provider==='greenapi'&&
    grant.instanceId===INSTANCE&&grant.scenarioId===SCENARIO&&grant.firestoreConnectionId===FIRESTORE_CONNECTION&&
    grant.integrationId===INTEGRATION,'INGRESS_GRANT_SCOPE_MISMATCH');
  need(grant.phase===(previewOnly?'preview':'live'),'INGRESS_GRANT_PHASE_MISMATCH');
  need(plain(grant.authority)&&grant.authority.scopeContractBlob===SCOPE_CONTRACT_BLOB&&
    /^[a-f0-9]{40}$/.test(str(grant.authority.receiptBlobSha))&&
    /^[a-f0-9]{40}$/.test(str(grant.authority.sourceSha)),'INGRESS_REVIEWED_AUTHORITY_REQUIRED');
}
function probeEnvelope(event,previewOnly=false){
  const incoming=requestDocument(event,previewOnly),row=incoming.row;
  need(Object.keys(row).every(k=>['schema','provider','tenantId','country','instanceId','scenarioId','nonce'].includes(k)),
    'INGRESS_PROBE_UNAPPROVED_FIELD');
  need(row.schema===PROBE_SCHEMA&&row.provider==='greenapi'&&row.tenantId===TENANT&&row.country===COUNTRY&&
    row.instanceId===INSTANCE&&row.scenarioId===SCENARIO&&/^[a-f0-9]{64}$/.test(str(row.nonce)),
    'INGRESS_PROBE_ENVELOPE_INVALID');
  return incoming;
}
function probeFor(event,grant,previewOnly=false,nowMs=Date.now()){
  const incoming=probeEnvelope(event,previewOnly);fixedGrant(grant,previewOnly);
  need(grant.enabled===false&&grant.state==='CLOSED'&&!grant.principalSha256&&
    grant.authority.principalObserved===false,'INGRESS_PROBE_REQUIRES_CLOSED_UNBOUND_CONFIG');
  need(plain(grant.probe)&&grant.probe.enabled===true&&grant.probe.nonce===incoming.row.nonce&&
    Number.isFinite(Date.parse(grant.probe.expiresAt))&&Date.parse(grant.probe.expiresAt)>nowMs&&
    Date.parse(grant.probe.expiresAt)<=nowMs+900000,'INGRESS_PROBE_NONCE_OR_EXPIRY_INVALID');
  need(['service_account','unknown'].includes(event.authType)&&str(event.authId).length>=3,
    'INGRESS_PROBE_AUTH_CONTEXT_REQUIRED');
  return {...incoming,grantDigest:digest(grant),authType:event.authType,principalSha256:principalDigest(event)};
}

function grantFor(event, grant, previewOnly=false) {
  fixedGrant(grant,previewOnly);
  need(grant.enabled===true&&grant.state==='ACTIVE'&&grant.probe?.enabled===false,'INGRESS_GRANT_DISABLED_OR_MISSING');
  need(grant.operation==='create_business' && grant.module==='leads' && grant.sourceType==='ad' &&
    grant.externalSendAllowed===false && grant.policyWritesAllowed===false && grant.membershipWritesAllowed===false,'INGRESS_GRANT_CAPABILITY_MISMATCH');
  need(['service_account','unknown'].includes(grant.authType) && event.authType===grant.authType &&
    str(event.authId).length>=3 && /^[a-f0-9]{64}$/.test(str(grant.principalSha256)) &&
    principalDigest(event)===grant.principalSha256,'INGRESS_TRANSPORT_PRINCIPAL_MISMATCH');
  need(grant.authority.principalObserved===true&&/^[a-f0-9]{64}$/.test(str(grant.authority.principalProbeDigest)),
    'INGRESS_REVIEWED_AUTHORITY_REQUIRED');
  need(grant.assignment==='pending_operations' && !grant.advisorId,'INGRESS_PENDING_OPERATIONS_REQUIRED');
  need(Number.isInteger(grant.maxSourceAgeSeconds) && grant.maxSourceAgeSeconds>=900 && grant.maxSourceAgeSeconds<=3600,
    'INGRESS_SOURCE_AGE_BOUND_REQUIRED');
  need(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(str(grant.activationNotBefore))&&
    Number.isFinite(Date.parse(grant.activationNotBefore)),'INGRESS_SOURCE_START_REQUIRED');
  if(previewOnly) need(plain(grant.qaFixture) && /^[a-f0-9]{64}$/.test(str(grant.qaFixture.nonce)), 'INGRESS_PREVIEW_FIXTURE_REQUIRED');
  return grant;
}

function providerText(value,max,code,required=false){
  need(value===undefined||typeof value==='string',code);
  const text=value===undefined?'':value;
  need(text.length<=max&&Buffer.byteLength(text,'utf8')<=max*4&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text),code);
  if(required)need(text.trim().length>0,code);
  return text;
}

// Optional, immutable observation of the connected account. Only the message
// independently verified with GreenAPI can select this exact ad ID. Missing
// catalog entries need no API call and do not block an otherwise valid Lead.
function metaAttributionFor(sourceId){
  if(sourceId!=='120249969703720252')return null;
  return {schema:'GI_I66_VERIFIED_META_AD_ATTRIBUTION_V1',provider:'windsor.ai/facebook',
    accountId:'2031445257682103',adId:sourceId,adsetId:'120249969703750252',campaignId:'120249859829250252',
    creativeId:'1304182775173871',effectiveObjectStoryId:'887584361095288_122150716857063843',
    observedOn:'2026-11-24',observationDateBasis:'dateGuatemala',dateRange:{from:'2026-11-17',through:'2026-11-24'},
    authority:{receiptPath:META_RECEIPT_PATH,receiptGitBlobSha:META_RECEIPT_BLOB,
      inventoryCanonicalJsonSha256:'1704db03b2f69b425abce2a9b8d145a234b3c46d84c1ff105947d9f80f014751',
      creativeCanonicalJsonSha256:'16f6cc13ce855bcf7b4a4317069d46c7bf9a59c9f0555f64216cbce7b605349e'},
    specificProductVerified:false,approvedCatalogProductId:null};
}
function initialRequest(packet,ad){
  // GreenAPI GetMessage documents both aliases for the customer's text. The
  // ad title/description and automatic greeting are separate provider fields.
  // https://green-api.com/en/docs/api/journals/GetMessage/
  const top=providerText(packet.textMessage,8192,'INGRESS_CUSTOMER_TEXT_INVALID');
  const extended=providerText(ad.text,8192,'INGRESS_CUSTOMER_TEXT_INVALID');
  if(top&&extended)need(top===extended,'INGRESS_CUSTOMER_TEXT_ALIASES_CONFLICT');
  const text=top||extended;need(text.trim().length>0,'INGRESS_CUSTOMER_TEXT_REQUIRED');
  const context={title:providerText(ad.title,512,'INGRESS_AD_CONTEXT_INVALID'),
    description:providerText(ad.description,4096,'INGRESS_AD_CONTEXT_INVALID'),
    sourceApp:providerText(ad.sourceApp,80,'INGRESS_AD_CONTEXT_INVALID'),
    sourceUrl:providerText(ad.sourceUrl,2048,'INGRESS_AD_CONTEXT_INVALID'),
    automaticGreetingPresent:typeof ad.greetingMessageBody==='string'&&ad.greetingMessageBody.length>0};
  if(context.sourceUrl){let url;try{url=new URL(context.sourceUrl);}catch{need(false,'INGRESS_AD_CONTEXT_URL_INVALID');}
    need(['https:','http:'].includes(url.protocol)&&!url.username&&!url.password,'INGRESS_AD_CONTEXT_URL_INVALID');}
  return{text,textSha256:sha(text),providerTextField:top?'textMessage':'extendedTextMessage.text',adContext:context};
}
function providerProof(packet, row, grant, nowMs, previewOnly=false) {
  need(plain(packet),'INGRESS_PROVIDER_READBACK_REQUIRED');
  need(packet.type==='incoming' && packet.typeMessage==='extendedTextMessage' && packet.idMessage===row.messageId &&
    packet.chatId===row.chatId && packet.senderId===row.chatId,'INGRESS_PROVIDER_MESSAGE_IDENTITY_MISMATCH');
  const ad=packet.extendedTextMessage;
  need(plain(ad) && ad.sourceType==='ad' && ad.sourceId===row.sourceId,'INGRESS_PROVIDER_AD_PROOF_MISMATCH');
  need(packet.isDeleted!==true && packet.isEdited!==true && ad.isForwarded!==true && packet.isForwarded!==true &&
    !(Number(ad.forwardingScore)>0) && !(Number(packet.forwardingScore)>0),'INGRESS_FORWARD_EDIT_DELETE_DENIED');
  need((row.ctwaClid||'')===(ad.ctwaClid||''),'INGRESS_PROVIDER_CTWA_MISMATCH');
  const timestamp=packet.timestamp;
  need(Number.isInteger(timestamp) && timestamp>0 && Number.isFinite(nowMs),'INGRESS_PROVIDER_TIMESTAMP_INVALID');
  const time=timestamp*1000;
  need(time>=Date.parse(grant.activationNotBefore) && time<=nowMs+300000 && nowMs-time<=grant.maxSourceAgeSeconds*1000,
    'INGRESS_PROVIDER_TIMESTAMP_OUT_OF_SCOPE');
  if(previewOnly) need(row.qaNonce===grant.qaFixture.nonce && digest(packet)===grant.qaFixture.providerPacketSha256,
    'INGRESS_PREVIEW_FIXTURE_MISMATCH');
  const request=initialRequest(packet,ad);
  const attribution={type:packet.type,typeMessage:packet.typeMessage,messageId:packet.idMessage,
    chatId:packet.chatId,senderId:packet.senderId,timestamp,sourceType:'ad',sourceId:ad.sourceId,ctwaClid:ad.ctwaClid||'',requestTextSha256:request.textSha256};
  return {provider:'greenapi',instanceId:INSTANCE,sourceType:'ad',sourceId:ad.sourceId,ctwaClid:ad.ctwaClid||'',
    messageId:packet.idMessage,chatId:packet.chatId,phone:phone(packet.chatId),timestamp,
    requestText:request.text,requestTextSha256:request.textSha256,providerTextField:request.providerTextField,adContext:request.adContext,
    metaAttribution:metaAttributionFor(ad.sourceId),
    contactName:str(packet.senderContactName||packet.senderName).replace(/\u0000/g,'').trim().slice(0,220),
    providerPacketSha256:digest(packet),attributionSha256:digest(attribution),synthetic:previewOnly===true};
}

function plan({event,grant,packet,nowMs=Date.now(),previewOnly=false}) {
  const incoming=envelope(event,previewOnly);
  grantFor(event,grant,previewOnly);
  const proof=providerProof(packet,incoming.row,grant,nowMs,previewOnly);
  const identityKey=digest({tenantId:TENANT,provider:'greenapi',instanceId:INSTANCE,phone:proof.phone,sourceId:proof.sourceId});
  const messageKey=digest({tenantId:TENANT,provider:'greenapi',instanceId:INSTANCE,messageId:proof.messageId});
  const prefix=previewOnly?'b4003qa_':'',businessId=prefix+'neg_make_'+identityKey.slice(0,24);
  const workflowRequestId=prefix+'wf_make_'+messageKey.slice(0,28);
  const provenance={schema:SCHEMA,integrationId:INTEGRATION,provider:proof.provider,instanceId:INSTANCE,
    sourceType:'ad',sourceId:proof.sourceId,identityKey,firstMessageKey:messageKey,
    providerPacketSha256:proof.providerPacketSha256,attributionSha256:proof.attributionSha256,sourceTimestamp:proof.timestamp,
    initialRequest:{messageKey,text:proof.requestText,textSha256:proof.requestTextSha256,providerTextField:proof.providerTextField,
      sourceTimestamp:proof.timestamp},adContext:proof.adContext,metaAttribution:proof.metaAttribution,
    productClassification:'PENDING_VERIFIED_SOURCE_OR_OPERATIONS',
    transportPrincipalSha256:principalDigest(event),authorityReceiptBlob:grant.authority.receiptBlobSha,
    grantDigest:digest(grant),synthetic:previewOnly===true};
  const payload={id:businessId,nombre:proof.contactName||'Consulta de WhatsApp',tipo:'Persona',telefono:'+'+proof.phone,
    email:'',asesorId:'',etapa:'nuevo',pais:COUNTRY,moneda:'GTQ',canal:'WhatsApp',origen:'Leads',
    piezaOrigen:proof.sourceId,puntoIngreso:'Make · AyS anuncios',sourceOpportunityId:identityKey,
    descripcion:proof.requestText};
  // The canonical owner retains the approved creation cadence. Its pending
  // provider outbox is preparation, never evidence or authorization of a send.
  const actor={uid:'integration:'+INTEGRATION,email:'',name:'Ingreso de anuncios de AyS',advisorId:'',
    activeRole:'integration',roles:['integration'],type:'integration',integrationId:INTEGRATION,
    transportPrincipalSha256:principalDigest(event)};
  return {...incoming,previewOnly,proof,identityKey,messageKey,businessId,workflowRequestId,provenance,payload,actor,
    grantDigest:digest(grant),
    authz:{tenantId:TENANT,actor,accessConfig:{},member:{tenantId:TENANT,countries:[COUNTRY],advisorId:'',
      dataScopes:{modules:{leads:'none',ops:'none'}}}}};
}

function assertNoCompetingLead(rows, candidate) {
  need(Array.isArray(rows) && rows.length<=MAX_CENSUS,'INGRESS_CENSUS_INCOMPLETE');
  const phoneFields=['telefono','phone','celular','movil','telefonoPrincipal','telefonoMovil'];
  const matches=rows.filter(x=>x.id!==candidate.businessId &&
    (phoneFields.some(k=>phone(x[k])===candidate.proof.phone) ||
     x.sourceOpportunityId===candidate.identityKey || x.ingressProvenance?.identityKey===candidate.identityKey));
  // An older lead with the same phone but no trustworthy source identity cannot
  // prove absence. Never silently create a second commercial identity beside it.
  need(matches.length===0,'INGRESS_EXISTING_PHONE_REQUIRES_IDENTITY_REVIEW');
}
function assertReplayLead(row,candidate) {
  need(row && row.id===candidate.businessId && row.tenantId===TENANT && row.pais===COUNTRY &&
    row.ingressProvenance && row.ingressProvenance.identityKey===candidate.identityKey &&
    row.ingressProvenance.sourceId===candidate.proof.sourceId &&
    row.ingressProvenance.integrationId===INTEGRATION && row.ingressProvenance.synthetic===candidate.previewOnly &&
    row.archivado!==true && row.eliminado!==true,
    'INGRESS_CANONICAL_REPLAY_IDENTITY_MISMATCH');
  const initial=row.ingressProvenance.initialRequest;
  need(initial&&typeof initial.text==='string'&&initial.textSha256===sha(initial.text)&&
    initial.messageKey===row.ingressProvenance.firstMessageKey,'INGRESS_INITIAL_REQUEST_PROVENANCE_MISMATCH');
  if(initial.messageKey===candidate.messageKey)need(initial.textSha256===candidate.proof.requestTextSha256,
    'INGRESS_INITIAL_REQUEST_SOURCE_CHANGED');
  if(row.ingressProvenance.metaAttribution){
    const meta=row.ingressProvenance.metaAttribution;
    need(meta.adId===row.ingressProvenance.sourceId&&digest(meta)===digest(metaAttributionFor(meta.adId)),
      'INGRESS_META_ATTRIBUTION_PROVENANCE_CHANGED');
  }
}

module.exports={TENANT,COUNTRY,INSTANCE,SCENARIO,FIRESTORE_CONNECTION,INTEGRATION,SCHEMA,GRANT_SCHEMA,
  PROBE_SCHEMA,SCOPE_CONTRACT_BLOB,QUEUE,PREVIEW_QUEUE,MAX_CENSUS,IngressError,need,sha,stable,digest,phone,principalDigest,
  META_RECEIPT_PATH,META_RECEIPT_BLOB,metaAttributionFor,
  envelope,probeEnvelope,probeFor,grantFor,providerText,initialRequest,providerProof,plan,assertNoCompetingLead,assertReplayLead};
