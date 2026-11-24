'use strict';

// Only transaction support for the existing Ops/Leads owner. This module never
// writes a negocio; product-ops-leads-domain.execute remains that write owner.
const c=require('./product-lead-ingress-contract');
const root=(db)=>db.collection('tenants').doc(c.TENANT);
const grantRef=(db,preview)=>root(db).collection('config').doc(preview?'makeLeadIngressPreview':'makeLeadIngress');
const messageRef=(db,ctx)=>root(db).collection(ctx.previewOnly?'previewLeadIngressMessages':'leadIngressMessages').doc(ctx.messageKey);
const row=(snap)=>snap&&snap.exists?snap.data()||{}:null;

async function prepare({db,event,packet,previewOnly,nowMs}) {
  const gs=await grantRef(db,previewOnly).get(),grant=row(gs);
  return c.plan({event,grant,packet,previewOnly,nowMs});
}
async function fresh(tx,{db,dataRef,ctx}) {
  const [gs,qs,ms,all]=await Promise.all([
    tx.get(grantRef(db,ctx.previewOnly)),tx.get(db.doc(ctx.path)),tx.get(messageRef(db,ctx)),
    tx.get(dataRef(c.TENANT,'negocios','_').parent.limit(c.MAX_CENSUS+1))
  ]);
  c.need(gs.exists&&c.digest(gs.data())===ctx.grantDigest,'INGRESS_GRANT_CHANGED_BEFORE_COMMIT');
  c.need(qs.exists&&c.digest(qs.data())===ctx.envelopeDigest,'INGRESS_QUEUE_CHANGED_BEFORE_COMMIT');
  c.need(Array.isArray(all.docs)&&all.docs.length<=c.MAX_CENSUS,'INGRESS_CENSUS_INCOMPLETE');
  const rows=all.docs.map(d=>{
    const value=d.data()||{};
    c.need(!value.id||value.id===d.id,'INGRESS_CENSUS_DOCUMENT_ID_MISMATCH');
    return {...value,id:d.id};
  });
  c.assertNoCompetingLead(rows,ctx);
  const prior=row(ms);
  if(prior)c.need(prior.schema==='GI_I66_CANONICAL_LEAD_INGRESS_MESSAGE_V1'&&prior.tenantId===c.TENANT&&
    prior.messageKey===ctx.messageKey&&prior.identityKey===ctx.identityKey&&prior.businessId===ctx.businessId&&
    prior.requestId===ctx.workflowRequestId&&prior.attributionSha256===ctx.proof.attributionSha256&&
    prior.requestText===ctx.proof.requestText&&prior.requestTextSha256===ctx.proof.requestTextSha256&&
    prior.synthetic===ctx.previewOnly,'INGRESS_MESSAGE_REPLAY_BINDING_MISMATCH');
  return {message:prior};
}
function messageRecord(ctx,result,created,now){
  return {schema:'GI_I66_CANONICAL_LEAD_INGRESS_MESSAGE_V1',tenantId:c.TENANT,country:c.COUNTRY,
    integrationId:c.INTEGRATION,messageKey:ctx.messageKey,identityKey:ctx.identityKey,
    businessId:ctx.businessId,requestId:ctx.workflowRequestId,eventId:result.eventId,
    sourceId:ctx.proof.sourceId,attributionSha256:ctx.proof.attributionSha256,
    providerPacketSha256:ctx.proof.providerPacketSha256,sourceTimestamp:ctx.proof.timestamp,
    requestText:ctx.proof.requestText,requestTextSha256:ctx.proof.requestTextSha256,adContext:ctx.proof.adContext,
    metaAttribution:ctx.proof.metaAttribution,
    principalSha256:ctx.actor.transportPrincipalSha256,authorityReceiptBlob:ctx.provenance.authorityReceiptBlob,
    canonicalLeadCreated:created,synthetic:ctx.previewOnly,committedAt:now()};
}
function recordNew(tx,{db,ctx,result,now}) {
  tx.create(messageRef(db,ctx),messageRecord(ctx,result,true,now));
}
function replayExisting(priorRequest,existing,freshState,ctx){
  c.need(freshState.message&&priorRequest&&priorRequest.status==='committed','INGRESS_REPLAY_AUDIT_INCOMPLETE');
  const result=priorRequest.result;
  c.need(result?.entityId===ctx.businessId&&result.requestId===ctx.workflowRequestId&&
    result.ingressIdentityKey===ctx.identityKey&&result.ingressMessageKey===ctx.messageKey,
    'INGRESS_REPLAY_WORKFLOW_BINDING_MISMATCH');
  c.assertReplayLead(existing,ctx);
  return {...result,reused:true,canonicalLeadWrites:0,canonicalAuditWrites:0};
}
function attachMessage(tx,{db,ctx,before,freshState,req,event,result,now}){
  c.need(!freshState.message,'INGRESS_MESSAGE_WITHOUT_WORKFLOW_REQUEST');
  c.assertReplayLead(before,ctx);
  const out={...result,reused:true,canonicalLeadWrites:0,canonicalAuditWrites:3};
  tx.create(messageRef(db,ctx),messageRecord(ctx,out,false,now));
  tx.set(event,{schemaVersion:'GI_I66_CANONICAL_LEAD_INGRESS_EVENT_V1',tenantId:c.TENANT,
    operation:'create_business',action:'LINK_EXISTING_INGRESS_IDENTITY',entityType:'negocios',entityId:ctx.businessId,
    requestId:ctx.workflowRequestId,actor:ctx.actor,reason:'Nuevo mensaje de anuncio verificado para el mismo Lead',
    ingressIdentityKey:ctx.identityKey,ingressMessageKey:ctx.messageKey,sourceDigest:ctx.proof.attributionSha256,
    beforeDigest:c.digest(before),afterDigest:c.digest(before),previewWrite:ctx.previewOnly,createdAt:now()},{merge:false});
  tx.set(req,{status:'committed',operation:'create_business',entityType:'negocios',entityId:ctx.businessId,
    eventId:out.eventId,result:out,committedAt:now()},{merge:false});
  return out;
}
async function readback({db,dataRef,requestRef,eventRef,outboxRef,ctx,result}){
  const [lead,receipt,request,event,notice]=await Promise.all([
    dataRef(c.TENANT,'negocios',ctx.businessId).get(),messageRef(db,ctx).get(),
    requestRef(c.TENANT,ctx.workflowRequestId,ctx.previewOnly).get(),
    eventRef(c.TENANT,result.eventId,ctx.previewOnly).get(),
    outboxRef(c.TENANT,result.eventId,ctx.previewOnly).get()
  ]);
  c.assertReplayLead(row(lead),ctx);
  const m=row(receipt),r=row(request),e=row(event);
  c.need(m&&r&&e&&m.businessId===ctx.businessId&&m.messageKey===ctx.messageKey&&
    m.identityKey===ctx.identityKey&&m.attributionSha256===ctx.proof.attributionSha256&&
    m.requestText===ctx.proof.requestText&&m.requestTextSha256===ctx.proof.requestTextSha256&&
    m.requestId===ctx.workflowRequestId&&m.eventId===result.eventId&&
    r.status==='committed'&&r.result?.entityId===ctx.businessId&&r.result?.eventId===result.eventId&&
    r.result?.ingressMessageKey===ctx.messageKey&&e.entityId===ctx.businessId&&
    e.requestId===ctx.workflowRequestId&&e.actor?.uid===ctx.actor.uid,
    'INGRESS_CANONICAL_READBACK_INCOMPLETE');
  if(m.canonicalLeadCreated){
    c.need(c.digest(m.metaAttribution||null)===c.digest(row(lead).ingressProvenance.metaAttribution||null),
      'INGRESS_INITIAL_META_ATTRIBUTION_READBACK_MISMATCH');
    const n=row(notice);
    c.need(n&&n.entityId===ctx.businessId&&n.actorUid===ctx.actor.uid&&n.eventId===result.eventId&&
      n.targets?.length===1&&n.targets[0].type==='role'&&n.targets[0].id==='operations'&&
      c.digest(n.channels)===c.digest(['in_app','topbar']), 'INGRESS_INTERNAL_NOTICE_READBACK_INCOMPLETE');
  }else c.need(!notice.exists,'INGRESS_UNEXPECTED_REPEAT_NOTIFICATION');
  if(m.metaAttribution)c.need(m.metaAttribution.adId===ctx.proof.sourceId&&
    c.digest(m.metaAttribution)===c.digest(c.metaAttributionFor(ctx.proof.sourceId)),
    'INGRESS_MESSAGE_META_ATTRIBUTION_READBACK_MISMATCH');
  return {schema:'GI_I66_CANONICAL_LEAD_INGRESS_READBACK_V1',canonicalReadback:true,
    businessId:ctx.businessId,messageKey:ctx.messageKey,identityKey:ctx.identityKey,
    machineActor:true,transportPrincipalVerified:true,assignment:str(row(lead).asesorId)?'assigned_by_operations':'pending_operations',
    initialRequestPreserved:true,currentMessagePreserved:true,requestTextSha256:ctx.proof.requestTextSha256,
    metaAttributionObserved:row(lead).ingressProvenance.metaAttribution!==null&&row(lead).ingressProvenance.metaAttribution!==undefined,
    canonicalLeadWrites:result.canonicalLeadWrites,canonicalAuditWrites:result.canonicalAuditWrites,
    reused:result.reused===true,externalMessagesSent:0,internalNoticeVerified:m.canonicalLeadCreated===true,
    canonicalDocuments:['negocios',ctx.previewOnly?'previewWorkflowRequests':'workflowRequests',
      ctx.previewOnly?'previewWorkflowEvents':'workflowEvents',ctx.previewOnly?'previewLeadIngressMessages':'leadIngressMessages',
      ...(m.canonicalLeadCreated?[ctx.previewOnly?'previewNotificationOutbox':'notificationOutbox']:[])]};
}
const str=v=>typeof v==='string'?v:'';
module.exports={prepare,fresh,recordNew,replayExisting,attachMessage,readback,grantRef,messageRef};
