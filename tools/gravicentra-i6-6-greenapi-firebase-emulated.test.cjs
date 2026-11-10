'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../functions/greenapi-firebase-bridge.js'), 'utf8');
const TENANT='alianzas-soluciones', INSTANCE='710522720868';
const GROUP='120363420665870658@g.us', WID='50255550000@c.us';
const EVENT_ID='payevt_qa_001', ENTITY_ID='mgmt_qa_001';
const authToken='qa_webhook_auth_123456789012345678901';
const secret = {
  tenantId:TENANT,pais:'GT',idInstance:INSTANCE,transportEnabled:true,
  apiUrl:'https://api.green-api.com',apiTokenInstance:'qa_provider_token_1234567',
  senderWid:WID,webhookBearerToken:authToken,
  activationNotBefore:'2026-11-10T15:00:00.000Z',
  routes:{operations:{enabled:true,groupVerified:true,verificationReceipt:'qa_group_receipt_20261110',
    allowedOperations:['report_advisor_payment'],groupApproved:true,
    groupAuthorizationReceipt:'qa_staff_group_consent_20261110'}},
  templates:{operations:{approved:true,id:'ops_notice',version:'v1',
    message:'Gravicentra Insurance: gestión operativa pendiente de revisión en la plataforma.'}}
};

function fakeFirestore() {
  const docs=new Map();
  const ref = (fullPath) => ({
    path:fullPath,
    collection(name){return collection(fullPath+'/'+name);},
    async get(){return snapshot(fullPath);},
    async set(obj,opts){put(fullPath,obj,opts);}
  });
  const collection=(fullPath)=>({ doc(id){return ref(fullPath+'/'+id);} });
  const snapshot=(fullPath)=>({ exists: docs.has(fullPath), id:fullPath.split('/').pop(),
    data(){return docs.has(fullPath)?structuredClone(docs.get(fullPath)):undefined;} });
  const put=(p,v,opts={})=>docs.set(p,opts.merge?{...(docs.get(p)||{}),...v}:v);
  const db={collection,async runTransaction(f){
    const tx={
      async get(r){return snapshot(r.path);},
      create(r,v){if(docs.has(r.path))throw Error('ALREADY_EXISTS');put(r.path,v);},
      update(r,v){if(!docs.has(r.path))throw Error('NOT_FOUND');put(r.path,v,{merge:true});},
      set(r,v,o){put(r.path,v,o);},
      delete(r){docs.delete(r.path);}
    };
    return f(tx);
  }};
  return {db,docs,put};
}

function load({pais='GT', enabled=true}={}) {
  const store=fakeFirestore(), calls={ secrets:0, status:0, send:0 },
    base=`tenants/${TENANT}`;
  const outbox={tenantId:TENANT,eventId:EVENT_ID,operation:'report_advisor_payment',
    eventSource:'reconciliation',entityType:'gestiones',entityId:ENTITY_ID,pais,
    receiptId:'receipt_qa_001',
    status:'pending_connection',externalDeliveryAuthorized:true,
    externalRouteKey:'operations',externalChannelsPendingConnection:['whatsapp'],asesorId:'advisor_qa_1'};
  store.put(`${base}/notificationOutbox/${EVENT_ID}`,outbox);
  store.put(`${base}/reconciliationEvents/${EVENT_ID}`,{tenantId:TENANT,eventId:EVENT_ID,
    operation:'report_advisor_payment',managementId:ENTITY_ID,receiptId:'receipt_qa_001',
    createdAt:'2026-11-10T16:00:00.000Z'});
  store.put(`${base}/data/gestiones/items/${ENTITY_ID}`,{pais:'GT',id:ENTITY_ID});
  const stubs={
    'firebase-admin/app':{getApps:()=>[{}],initializeApp:()=>({})},
    'firebase-admin/firestore':{getFirestore:()=>store.db,FieldValue:{serverTimestamp:()=>new Date('2026-11-10T16:00:30.000Z')}},
    'firebase-functions/v2/firestore':{onDocumentUpdated:(_,fn)=>fn},
    'firebase-functions/v2/https':{onRequest:(_,fn)=>fn},
    '@google-cloud/secret-manager':{SecretManagerServiceClient:class {
      async accessSecretVersion(){calls.secrets++;return[{payload:{data:Buffer.from(JSON.stringify(secret))}}];}
    }},
    './greenapi-direct-transport':{createGreenApiTransport:()=>({
      async statusReadback(){calls.status++;return{state:'authorized',instanceId:INSTANCE,wid:WID,checkedAt:new Date().toISOString()};},
      async sendGroupMessage(){calls.send++;return{acceptedByProvider:true,idMessage:'qa_provider_id_12345678'};}
    })},
    './greenapi-outbox-core':require('../functions/greenapi-outbox-core')
  };
  const sandbox={exports:{},module:{exports:{}},process:{env:enabled?{
    ORBIT360_GREENAPI_ENABLED:'true',
    ORBIT360_GREENAPI_GT_SECRET_VERSION:'projects/ays-orbit-360-lab/secrets/qa-greenapi/versions/latest'}:{}},
    require:n=>stubs[n]||require(n),Buffer,Date,Set,Object,String,Array,RegExp,JSON,Error};
  sandbox.exports=sandbox.module.exports;
  vm.runInNewContext(source,sandbox,{filename:'greenapi-firebase-bridge.js',timeout:1000});
  const trigger=(id=EVENT_ID,row=outbox)=>sandbox.module.exports.orbit360GreenApiOutboxUpdated({params:{tenantId:TENANT,eventId:id},
    data:{before:{data:()=>({...row,status:'pending_provider'})},after:{data:()=>row}}});
  const requestWebhook=async(body)=>{
    let statusCode=0,payload='';
    const req={method:'POST',body,get:()=>`Bearer ${authToken}`};
    const res={status(n){statusCode=n;return this;},send(v){payload=v;return this;}};
    await sandbox.module.exports.orbit360GreenApiDeliveryStatus(req,res);
    return{statusCode,payload};
  };
  return{store,calls,trigger,requestWebhook,outbox};
}

test('emulated GT positive writes one claim+receipt index but never real HTTP',async()=>{
  const s=load();const first=await s.trigger();const second=await s.trigger();
  assert.equal(first.ok,true);assert.equal(first.status,'queued_provider');
  assert.equal(second.status,'reused_claim');
  assert.equal(s.calls.send,1);
  const docs=[...s.store.docs.entries()];
  assert.equal(docs.filter(([p])=>p.includes('/greenapiExternalDeliveries/')).length,1);
  assert.equal(docs.filter(([p])=>p.includes('/greenapiDeliveryReceiptIndex/')).length,1);
  assert.equal(docs.filter(([p,v])=>p.includes('/greenapiExternalDeliveries/')&&v.status==='queued_provider').length,1);
});
test('emulated CO cross-country outbox does not read secret nor send',async()=>{
  const s=load({pais:'CO'});const out=await s.trigger();
  assert.equal(out,null);assert.equal(s.calls.send,0);
});
test('reconciliation event must match management and receipt before any delivery',async()=>{
  const s=load();
  s.store.put(`tenants/${TENANT}/reconciliationEvents/${EVENT_ID}`,{
    tenantId:TENANT,eventId:EVENT_ID,operation:'report_advisor_payment',
    managementId:'mgmt_other_001',receiptId:'receipt_qa_001',
    createdAt:'2026-11-10T16:00:00.000Z'});
  const out=await s.trigger();
  assert.equal(out,null);assert.equal(s.calls.send,0);
});
test('canonical country contradiction GT entity to CO event is denied before dispatch',async()=>{
  const s=load();
  s.store.put(`tenants/${TENANT}/reconciliationEvents/${EVENT_ID}`,{
    tenantId:TENANT,eventId:EVENT_ID,operation:'report_advisor_payment',
    managementId:ENTITY_ID,receiptId:'receipt_qa_001',pais:'CO',
    createdAt:'2026-11-10T16:00:00.000Z'});
  const out=await s.trigger();
  assert.equal(out,null);assert.equal(s.calls.send,0);
});
test('emulated transport env OFF has zero side effects',async()=>{
  const s=load({enabled:false});const out=await s.trigger();
  assert.equal(out,null);assert.equal(s.calls.secrets,0);assert.equal(s.calls.send,0);
});
test('second GT event within group throttle window is recorded HOLD, no second send',async()=>{
  const s=load();await s.trigger();
  const secondId='payevt_qa_002';
  const secondRow={...s.outbox,eventId:secondId};
  s.store.put(`tenants/${TENANT}/notificationOutbox/${secondId}`,secondRow);
  s.store.put(`tenants/${TENANT}/reconciliationEvents/${secondId}`,{
    tenantId:TENANT,eventId:secondId,operation:'report_advisor_payment',
    managementId:ENTITY_ID,receiptId:'receipt_qa_001',createdAt:'2026-11-10T16:00:10.000Z'});
  const result=await s.trigger(secondId,secondRow);
  assert.equal(result.code,'GROUP_RATE_LIMIT_HOLD');assert.equal(result.sent,false);
  assert.equal(s.calls.send,1);
  assert.equal([...s.store.docs.values()].filter(v=>v.status==='held_group_rate_limit').length,1);
});
test('authorized GreenAPI delivered receipt advances existing delivery',async()=>{
  const s=load();await s.trigger();
  const webhook={typeWebhook:'outgoingMessageStatus',instanceData:{idInstance:INSTANCE,wid:WID},
    chatId:GROUP,idMessage:'qa_provider_id_12345678',status:'delivered'};
  const reply=await s.requestWebhook(webhook);
  assert.equal(reply.statusCode,200);
  const doc=[...s.store.docs.entries()].find(([p])=>p.includes('/greenapiExternalDeliveries/'))[1];
  assert.equal(doc.status,'delivered');
});
test('unmatched status is quarantined, not falsely marked delivered',async()=>{
  const s=load();const reply=await s.requestWebhook({typeWebhook:'outgoingMessageStatus',
    instanceData:{idInstance:INSTANCE,wid:WID},chatId:GROUP,
    idMessage:'unknown_api_message_1234',status:'delivered'});
  assert.equal(reply.statusCode,202);
  assert.equal([...s.store.docs.keys()].filter(p=>p.includes('/greenapiUnmatchedReceipts/')).length,1);
  assert.equal([...s.store.docs.keys()].filter(p=>p.includes('/greenapiExternalDeliveries/')).length,0);
});
