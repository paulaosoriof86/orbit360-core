'use strict';

// The existing authenticated Make Firestore connection supplies only intake
// requests. It never writes canonical Leads. Each provider read and business
// write below is bounded by a reviewed server-owned grant and AuthContext.
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {onDocumentCreatedWithAuthContext}=require('firebase-functions/v2/firestore');
const {SecretManagerServiceClient}=require('@google-cloud/secret-manager');
const c=require('./product-lead-ingress-contract');
const support=require('./product-lead-ingress-owner-support');
const {__opsLeadsProductDomain:owner}=require('./product-ops-leads-domain');
const app=getApps()[0]||initializeApp(),db=getFirestore(app);
const secretManager=new SecretManagerServiceClient();
const SECRET='projects/ays-orbit-360-lab/secrets/orbit360-greenapi-gt-alianzas-soluciones/versions/1';
// Observed on both current OpsLeads functions by readonly run45352724136.
const RUNTIME='646761409743-compute@developer.gserviceaccount.com';
const MAX_PROVIDER_BYTES=262144;
const MAX_PROVIDER_ERROR_BYTES=4096;
function assertQueueRetryWindow(event,nowMs){
  const timestamp=event?.data?.createTime;
  c.need(timestamp&&typeof timestamp.toMillis==='function','INGRESS_QUEUE_CREATION_TIME_UNPROVEN');
  const created=timestamp.toMillis();
  c.need(Number.isFinite(created)&&created<=nowMs+300000&&nowMs-created<=900000,
    'INGRESS_QUEUE_RETRY_WINDOW_EXPIRED');
}

function safeProviderConfig(secret){
  c.need(secret&&secret.tenantId===c.TENANT&&secret.pais===c.COUNTRY&&secret.idInstance===c.INSTANCE,
    'INGRESS_PROVIDER_SECRET_SCOPE_MISMATCH');
  c.need(typeof secret.apiTokenInstance==='string'&&/^[A-Za-z0-9_-]{16,256}$/.test(secret.apiTokenInstance),
    'INGRESS_PROVIDER_CREDENTIAL_UNAVAILABLE');
  let url;try{url=new URL(secret.apiUrl);}catch{throw new c.IngressError('INGRESS_PROVIDER_ORIGIN_INVALID');}
  c.need(url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&
    (url.pathname==='/'||url.pathname==='')&&
    (url.hostname==='green-api.com'||url.hostname==='greenapi.com'||
     url.hostname.endsWith('.green-api.com')||url.hostname.endsWith('.greenapi.com')),
    'INGRESS_PROVIDER_ORIGIN_INVALID');
  return {origin:url.origin,token:secret.apiTokenInstance};
}
async function getSourcePacket(envelope,{readSecret,fetchImpl=fetch}={}){
  let secret;
  try{
    if(readSecret)secret=await readSecret();
    else{
      const [version]=await secretManager.accessSecretVersion({name:SECRET});
      const bytes=version?.payload?.data;
      c.need(bytes&&bytes.length<=8000,'INGRESS_PROVIDER_SECRET_SIZE');
      secret=JSON.parse(Buffer.from(bytes).toString('utf8'));
    }
  }catch(error){
    if(error instanceof c.IngressError)throw error;
    throw new c.IngressError('INGRESS_PROVIDER_SECRET_UNAVAILABLE',true);
  }
  const config=safeProviderConfig(secret);
  let response;
  try{
    response=await fetchImpl(`${config.origin}/waInstance${c.INSTANCE}/getMessage/${config.token}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chatId:envelope.chatId,idMessage:envelope.messageId}),
      redirect:'error',signal:AbortSignal.timeout(10000)});
  }catch{throw new c.IngressError('INGRESS_PROVIDER_READ_UNAVAILABLE',true);}
  if(!response.ok&&response.status!==400)throw new c.IngressError('INGRESS_PROVIDER_READ_REJECTED',response.status===429||response.status>=500);
  const byteLimit=response.ok?MAX_PROVIDER_BYTES:MAX_PROVIDER_ERROR_BYTES;
  const length=Number(response.headers?.get('content-length')||0);
  c.need(!length||length<=byteLimit,'INGRESS_PROVIDER_RESPONSE_SIZE');
  let total=0,chunks=[];
  try{
    if(response.body&&typeof response.body.getReader==='function'){
      const reader=response.body.getReader();
      while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;
        if(total>byteLimit){await reader.cancel();throw new c.IngressError('INGRESS_PROVIDER_RESPONSE_SIZE');}
        chunks.push(Buffer.from(part.value));}
    }else{const bytes=Buffer.from(await response.arrayBuffer());total=bytes.length;c.need(total<=byteLimit,'INGRESS_PROVIDER_RESPONSE_SIZE');chunks=[bytes];}
    const raw=Buffer.concat(chunks,total).toString('utf8');
    if(!response.ok){
      // GetMessage documents a temporary journal/indexing 400. Only the exact
      // requested ID qualifies; arbitrary validation errors remain terminal.
      let body;try{body=JSON.parse(raw);}catch{body=raw;}
      const messages=typeof body==='string'?[body.trim()]:
        [body?.error,body?.message].filter(v=>typeof v==='string'&&v.length>0);
      const expected=`Message not found by id '${envelope.messageId}'`;
      if(messages.length>0&&messages.every(v=>v===expected))throw new c.IngressError('INGRESS_PROVIDER_MESSAGE_NOT_INDEXED',true);
      throw new c.IngressError('INGRESS_PROVIDER_READ_REJECTED');
    }
    return JSON.parse(raw);
  }catch(error){if(error instanceof c.IngressError)throw error;throw new c.IngressError('INGRESS_PROVIDER_RESPONSE_INVALID',true);}
}
const statusRef=(db,preview,id)=>db.collection('tenants').doc(c.TENANT)
  .collection(preview?'previewLeadIngressResults':'leadIngressResults').doc(id);
async function recordPrincipalProbe(event,previewOnly,{db:dbImpl=db,nowMs=Date.now()}={}){
  // A probe observes the authenticated connection; it does not authorize it.
  // Only the later protected configuration CAS may bind this receipt.
  const gs=await support.grantRef(dbImpl,previewOnly).get();
  const plan=c.probeFor(event,gs.exists?gs.data():null,previewOnly,nowMs);
  const ref=statusRef(dbImpl,previewOnly,plan.requestId);
  const proof={schema:'GI_I66_MAKE_LEAD_PRINCIPAL_PROBE_RESULT_V1',status:'PRINCIPAL_OBSERVED_ONLY',
    tenantId:c.TENANT,country:c.COUNTRY,provider:'greenapi',instanceId:c.INSTANCE,
    scenarioId:c.SCENARIO,firestoreConnectionId:c.FIRESTORE_CONNECTION,phase:previewOnly?'preview':'live',
    requestId:plan.requestId,envelopeDigest:plan.envelopeDigest,grantDigest:plan.grantDigest,
    authType:plan.authType,principalSha256:plan.principalSha256,nonce:plan.row.nonce,
    canonicalLeadWrites:0,canonicalAuditWrites:0,notificationsCreated:0,externalMessagesSent:0,
    providerRequests:0,principalBound:false};
  proof.proofDigest=c.digest(proof);
  await dbImpl.runTransaction(async tx=>{
    const [freshGrant,queue,prior]=await Promise.all([
      tx.get(support.grantRef(dbImpl,previewOnly)),tx.get(dbImpl.doc(plan.path)),tx.get(ref)]);
    c.need(freshGrant.exists&&c.digest(freshGrant.data())===plan.grantDigest,'INGRESS_PROBE_CONFIG_CAS_CHANGED');
    c.need(queue.exists&&c.digest(queue.data())===plan.envelopeDigest,'INGRESS_PROBE_QUEUE_CAS_CHANGED');
    c.probeFor(event,freshGrant.data(),previewOnly,nowMs);
    if(prior.exists){c.need(prior.data()?.proofDigest===proof.proofDigest,'INGRESS_PROBE_RESULT_CONFLICT');return;}
    tx.create(ref,proof);
  });
  const check=await ref.get();
  c.need(check.exists&&c.digest(check.data())===c.digest(proof),'INGRESS_PROBE_READBACK_UNCONFIRMED');
  return proof;
}
async function acknowledge(event,preview,result,dbImpl=db){
  const incoming=c.envelope(event,preview),ref=statusRef(dbImpl,preview,incoming.requestId);
  return dbImpl.runTransaction(async tx=>{
    const old=await tx.get(ref),before=old.exists?old.data():null;
    if(before){
      c.need(before.envelopeDigest===incoming.envelopeDigest,'INGRESS_RESULT_ENVELOPE_MISMATCH');
      // Never rewrite a proven committed result as a later failed observation.
      if(['APPLIED_VERIFIED','REPLAY_VERIFIED'].includes(before.status))return {prior:true,status:before.status,result:before};
      // A later provider/expiry failure cannot erase an earlier known or
      // indeterminate transaction outcome and pretend that nothing happened.
      if(before.canonicalCommitState==='COMMITTED_UNVERIFIED'&&result.canonicalCommitState!=='COMMITTED_VERIFIED')
        result={...result,status:'COMMITTED_READBACK_HOLD',canonicalCommitState:'COMMITTED_UNVERIFIED',
          entityId:before.entityId,canonicalLeadWrites:before.canonicalLeadWrites,canonicalAuditWrites:before.canonicalAuditWrites};
      else if(before.canonicalCommitState==='UNKNOWN'&&result.canonicalCommitState==='NOT_ATTEMPTED'){
        result={...result,canonicalCommitState:'UNKNOWN'};delete result.canonicalLeadWrites;delete result.canonicalAuditWrites;
      }
    }
    tx.set(ref,{...result,schema:'GI_I66_MAKE_LEAD_INGRESS_RESULT_V1',tenantId:c.TENANT,country:c.COUNTRY,
      requestId:incoming.requestId,envelopeDigest:incoming.envelopeDigest,provider:'greenapi',
      authType:event.authType,transportPrincipalSha256:c.principalDigest(event),phase:preview?'preview':'live',
      recordedAt:FieldValue.serverTimestamp()},{merge:false});
    return {prior:false,status:result.status,result};
  });
}
async function handle(event,previewOnly=false,dependencies={}){
  const dbImpl=dependencies.db||db,ingest=dependencies.ingest||owner.ingestVerifiedLead;
  // The protected server grant is the runtime switch. Missing/CLOSED/BOUND
  // grants always deny ingestion. This avoids an unpublished .env mutation of
  // the certified backend artifact; tests may additionally force a local deny.
  const enabled=dependencies.enabled===undefined?true:dependencies.enabled;
  let executionStarted=false,incoming;
  try{
    if(event?.data?.data?.()?.schema===c.PROBE_SCHEMA)
      return await recordPrincipalProbe(event,previewOnly,{db:dbImpl,nowMs:dependencies.nowMs||Date.now()});
    incoming=c.envelope(event,previewOnly);
    c.need(enabled===true,'INGRESS_DEPLOYMENT_DISABLED');
    const gs=await support.grantRef(dbImpl,previewOnly).get(),grant=gs.exists?gs.data():null;
    c.grantFor(event,grant,previewOnly);
    let packet;
    if(previewOnly){
      c.need(grant.qaFixture?.nonce===incoming.row.qaNonce,'INGRESS_PREVIEW_NONCE_MISMATCH');
      packet=grant.qaFixture.packet;
      c.need(packet&&c.digest(packet)===grant.qaFixture.providerPacketSha256,'INGRESS_PREVIEW_PACKET_NOT_SERVER_APPROVED');
    }else{
      assertQueueRetryWindow(event,dependencies.nowMs||Date.now());
      packet=await (dependencies.getSourcePacket||getSourcePacket)(incoming.row);
    }
    executionStarted=true;
    const result=await ingest({event,packet,previewOnly,nowMs:dependencies.nowMs||Date.now()});
    c.need(result?.ok===true&&result.canonicalReadback===true&&result.ingressReadback?.canonicalReadback===true,
      'INGRESS_OWNER_READBACK_REQUIRED');
    const out={status:result.reused?'REPLAY_VERIFIED':'APPLIED_VERIFIED',canonicalCommitState:'COMMITTED_VERIFIED',
      entityId:result.entityId,workflowRequestId:result.requestId,eventId:result.eventId,
      ...result.ingressReadback};
    await acknowledge(event,previewOnly,out,dbImpl);
    return out;
  }catch(error){
    const code=error instanceof c.IngressError?error.code:'INGRESS_OWNER_OR_INFRASTRUCTURE_UNCONFIRMED';
    const committed=error?.ingressCommitOutcome;
    const result={status:committed?'COMMITTED_READBACK_HOLD':'HOLD',code,
      canonicalCommitState:committed?'COMMITTED_UNVERIFIED':executionStarted?'UNKNOWN':'NOT_ATTEMPTED',
      ...(committed?committed:executionStarted?{}:{canonicalLeadWrites:0,canonicalAuditWrites:0}),externalMessagesSent:0};
    // Malformed requests get no response document derived from untrusted paths.
    let recorded=result;
    if(incoming)try{const ack=await acknowledge(event,previewOnly,result,dbImpl);recorded=ack.result||result;}catch{throw new Error('INGRESS_ACK_UNCONFIRMED');}
    if(error?.retryable===true||executionStarted&&!(error instanceof c.IngressError))throw new Error('INGRESS_RETRYABLE_UNCONFIRMED');
    return recorded;
  }
}

exports.orbit360MakeLeadIngress=onDocumentCreatedWithAuthContext({
  region:'us-central1',document:`tenants/${c.TENANT}/${c.QUEUE}/{requestId}`,
  serviceAccount:RUNTIME,retry:true,timeoutSeconds:60,memory:'256MiB',maxInstances:3
},event=>handle(event,false));
exports.orbit360MakeLeadIngressPreview=onDocumentCreatedWithAuthContext({
  region:'us-east1',document:`tenants/${c.TENANT}/${c.PREVIEW_QUEUE}/{requestId}`,
  serviceAccount:RUNTIME,retry:true,timeoutSeconds:60,memory:'256MiB',maxInstances:2
},event=>handle(event,true));
exports.__makeLeadIngress=Object.freeze({handle,getSourcePacket,safeProviderConfig,acknowledge,recordPrincipalProbe,assertQueueRetryWindow,SECRET,RUNTIME});
