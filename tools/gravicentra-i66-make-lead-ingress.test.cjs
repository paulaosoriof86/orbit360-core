'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const c=require('../functions/product-lead-ingress-contract');
const support=require('../functions/product-lead-ingress-owner-support');
const NOW=Date.parse('2026-11-24T12:00:00Z'),ROOT='tenants/'+c.TENANT;
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
class Database {
  constructor(){this.documents=new Map();this.versions=new Map();this.writes=[];this.beforeTransaction=null;this.beforeCommit=null;this.afterCommit=null;}
  seed(p,v){if(v===undefined)this.documents.delete(p);else this.documents.set(p,clone(v));this.versions.set(p,(this.versions.get(p)||0)+1);}
  collection(p){return new Reference(this,p,true);} doc(p){return new Reference(this,p,false);}
  snap(p){const value=clone(this.documents.get(p));return{id:p.split('/').at(-1),ref:this.doc(p),exists:value!==undefined,data:()=>clone(value)};}
  query(p,limit=Infinity){return [...this.documents].filter(([k])=>k.startsWith(p+'/')&&!k.slice(p.length+1).includes('/')).slice(0,limit).map(([k])=>this.snap(k));}
  async runTransaction(fn){
    if(this.beforeTransaction){const hook=this.beforeTransaction;this.beforeTransaction=null;hook(this);}
    for(let attempt=0;attempt<3;attempt++){
      const reads=new Map(),queries=new Map(),changes=[];
      const tx={get:async ref=>{
        assert.equal(changes.length,0,'Firestore forbids reads after transaction writes');
        if(ref.isCollection){const docs=this.query(ref.path,ref.bound);queries.set(ref.path,JSON.stringify([...this.versions].filter(([k])=>k.startsWith(ref.path+'/'))));return{docs,size:docs.length,empty:docs.length===0};}
        reads.set(ref.path,this.versions.get(ref.path)||0);return this.snap(ref.path);
      },set:(ref,value,options={})=>changes.push({ref,value:clone(value),merge:options.merge===true}),
      create:(ref,value)=>changes.push({ref,value:clone(value),create:true})};
      const result=await fn(tx);
      if(this.beforeCommit){const hook=this.beforeCommit;this.beforeCommit=null;hook(this);}
      if([...reads].some(([p,v])=>(this.versions.get(p)||0)!==v)||[...queries].some(([p,v])=>JSON.stringify([...this.versions].filter(([k])=>k.startsWith(p+'/')))!==v))continue;
      for(const ch of changes)if(ch.create&&this.documents.has(ch.ref.path))throw Error('ALREADY_EXISTS');
      for(const ch of changes){this.seed(ch.ref.path,ch.merge?{...this.documents.get(ch.ref.path),...ch.value}:ch.value);this.writes.push(ch.ref.path);}
      if(this.afterCommit){const hook=this.afterCommit;this.afterCommit=null;hook(this);}
      return result;
    }
    throw Error('TRANSACTION_RETRY_EXHAUSTED');
  }
}
class Reference{
  constructor(db,p,isCollection,bound=Infinity){this.db=db;this.path=p;this.isCollection=isCollection;this.bound=bound;this.id=p.split('/').at(-1);}
  collection(n){return new Reference(this.db,this.path+'/'+n,true);}doc(n){return new Reference(this.db,this.path+'/'+n,false);}
  get parent(){return new Reference(this.db,this.path.split('/').slice(0,-1).join('/'),true);}
  limit(n){return new Reference(this.db,this.path,true,n);}
  async get(){if(this.isCollection){const docs=this.db.query(this.path,this.bound);return{docs,size:docs.length,empty:!docs.length};}return this.db.snap(this.path);}
}
function loadOwner(db){
  const exports={},source=fs.readFileSync(path.join(__dirname,'../functions/product-ops-leads-domain.js'),'utf8');
  const req=name=>{
    if(name==='firebase-admin/app')return{getApps:()=>[],initializeApp:()=>({})};
    if(name==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>new Date(NOW).toISOString()},FieldPath:{documentId:()=> '__name__'}};
    if(name==='firebase-functions/v2/https')return{HttpsError,onCall:(_options,fn)=>fn};
    if(name==='firebase-functions/v2/scheduler')return{onSchedule:(_options,fn)=>fn};
    return name.startsWith('./')?require(path.join(__dirname,'../functions',name)):require(name);
  };
  vm.runInNewContext(source,{exports,require:req,process:{env:{}},Buffer,URL,console},{timeout:1000});
  return exports;
}
function loadBridge(db,owner){
  const exports={},source=fs.readFileSync(path.join(__dirname,'../functions/make-lead-ingress-bridge.js'),'utf8');
  const req=name=>{
    if(name==='firebase-admin/app')return{getApps:()=>[],initializeApp:()=>({})};
    if(name==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>new Date(NOW).toISOString()}};
    if(name==='firebase-functions/v2/firestore')return{onDocumentCreatedWithAuthContext:(options,fn)=>({options,fn})};
    if(name==='@google-cloud/secret-manager')return{SecretManagerServiceClient:class{async accessSecretVersion(){throw Error('NO_NETWORK_IN_TEST');}}};
    if(name==='./product-ops-leads-domain')return owner;
    return name.startsWith('./')?require(path.join(__dirname,'../functions',name)):require(name);
  };
  vm.runInNewContext(source,{exports,require:req,process:{env:{}},Buffer,URL,JSON,AbortSignal,fetch:()=>{throw Error('UNEXPECTED_NETWORK');}},{timeout:1000});
  return exports;
}
function fixtures({preview=false,message='MESSAGE_000001',phone='50255550000',sourceId='AD_SYNTHETIC_001',request='queue-request-001'}={}){
  const packet={type:'incoming',typeMessage:'extendedTextMessage',idMessage:message,chatId:phone+'@c.us',senderId:phone+'@c.us',
    timestamp:Math.floor(NOW/1000)-30,senderContactName:'Persona sintética',isRead:false,isDeleted:false,isEdited:false,
    extendedTextMessage:{text:'Solicito información de cobertura para mi negocio.',sourceType:'ad',sourceId,ctwaClid:'SYNTHETIC_CTWA'}};
  const row={schema:c.SCHEMA,provider:'greenapi',tenantId:c.TENANT,country:c.COUNTRY,instanceId:c.INSTANCE,scenarioId:c.SCENARIO,
    messageId:message,chatId:packet.chatId,sourceType:'ad',sourceId,ctwaClid:'SYNTHETIC_CTWA',...(preview?{qaNonce:'a'.repeat(64)}:{})};
  const event={authType:'unknown',authId:'make-connection-synthetic@example.invalid',params:{requestId:request},
    data:{ref:{path:ROOT+'/'+(preview?c.PREVIEW_QUEUE:c.QUEUE)+'/'+request},createTime:{toMillis:()=>NOW},data:()=>clone(row)}};
  const grant={schema:c.GRANT_SCHEMA,enabled:true,state:'ACTIVE',tenantId:c.TENANT,country:c.COUNTRY,provider:'greenapi',instanceId:c.INSTANCE,
    scenarioId:c.SCENARIO,firestoreConnectionId:c.FIRESTORE_CONNECTION,integrationId:c.INTEGRATION,phase:preview?'preview':'live',
    operation:'create_business',module:'leads',sourceType:'ad',externalSendAllowed:false,policyWritesAllowed:false,membershipWritesAllowed:false,
    authType:event.authType,principalSha256:c.principalDigest(event),assignment:'pending_operations',maxSourceAgeSeconds:900,
    activationNotBefore:new Date(NOW-60000).toISOString(),probe:{enabled:false},
    authority:{scopeContractBlob:c.SCOPE_CONTRACT_BLOB,receiptBlobSha:'b'.repeat(40),sourceSha:'c'.repeat(40),principalObserved:true,principalProbeDigest:'d'.repeat(64)},
    ...(preview?{qaFixture:{nonce:row.qaNonce,packet,providerPacketSha256:c.digest(packet)}}:{})};
  return{packet,row,event,grant,preview,nowMs:NOW};
}
function setup(options={}){
  const f=fixtures(options),db=new Database(),grantPath=ROOT+'/config/'+(f.preview?'makeLeadIngressPreview':'makeLeadIngress');
  db.seed(grantPath,f.grant);db.seed(f.event.data.ref.path,f.row);
  db.seed(ROOT+'/config/workflow',{version:'synthetic'});
  const owner=loadOwner(db),bridge=loadBridge(db,owner);
  return{...f,db,grantPath,owner,bridge,ingest:()=>owner.__opsLeadsProductDomain.ingestVerifiedLead({event:f.event,packet:f.packet,previewOnly:f.preview,nowMs:NOW})};
}
const rejectsCode=async(fn,code)=>assert.rejects(fn,e=>e.code===code||e.message===code);
const canonicalRows=db=>[...db.documents].filter(([p])=>p.startsWith(ROOT+'/data/negocios/items/'));
const canonicalWrites=db=>db.writes.filter(p=>!p.includes('IngressResults'));

test('bridge response preserves its queue envelope schema and identity for real owner create and replay',async()=>{
  const s=setup(),api=s.bridge.__makeLeadIngress;
  await api.handle(s.event,false,{db:s.db,getSourcePacket:async()=>s.packet,nowMs:NOW});
  const resultPath=ROOT+'/leadIngressResults/'+s.event.params.requestId,first=s.db.documents.get(resultPath);
  assert.equal(first.schema,'GI_I66_MAKE_LEAD_INGRESS_RESULT_V1');assert.equal(first.status,'APPLIED_VERIFIED');
  assert.equal(first.requestId,s.event.params.requestId);assert.equal(first.envelopeDigest,c.digest(s.row));
  assert.equal(first.transportPrincipalSha256,c.principalDigest(s.event));assert.equal(first.phase,'live');
  const id='queue-replay-envelope',event={...s.event,params:{requestId:id},data:{...s.event.data,ref:{path:ROOT+'/'+c.QUEUE+'/'+id}}};
  s.db.seed(event.data.ref.path,s.row);
  await api.handle(event,false,{db:s.db,getSourcePacket:async()=>s.packet,nowMs:NOW});
  const replay=s.db.documents.get(ROOT+'/leadIngressResults/'+id);
  assert.equal(replay.schema,'GI_I66_MAKE_LEAD_INGRESS_RESULT_V1');assert.equal(replay.status,'REPLAY_VERIFIED');
  assert.equal(replay.requestId,id);assert.equal(replay.canonicalLeadWrites,0);assert.equal(replay.canonicalAuditWrites,0);
});

test('canonical owner creates one unassigned Lead and Operations-only internal notice, then exact replay writes zero',async()=>{
  const s=setup(),first=await s.ingest();
  assert.equal(first.ok,true);assert.equal(first.canonicalReadback,true);assert.equal(first.ingressReadback.internalNoticeVerified,true);
  assert.equal(first.canonicalLeadWrites,1);assert.equal(first.canonicalAuditWrites,4);assert.equal(canonicalWrites(s.db).length,5);
  const [[,lead]]=canonicalRows(s.db);assert.equal(lead.asesorId,'');assert.equal(lead.assignmentState,'pending_operations');
  assert.equal(lead.etapa,'nuevo');assert.equal(lead.createdByUid,'integration:'+c.INTEGRATION);
  assert.equal(lead.ingressProvenance.synthetic,false);assert.equal(lead.descripcion,s.packet.extendedTextMessage.text);
  assert.equal(lead.ingressProvenance.initialRequest.text,s.packet.extendedTextMessage.text);
  assert.equal(lead.ingressProvenance.initialRequest.textSha256,c.sha(s.packet.extendedTextMessage.text));
  const before=c.digest([...s.db.documents]),count=s.db.writes.length;
  s.packet.isRead=true;s.packet.senderContactName='Nombre cambiado por el proveedor';
  const replay=await s.ingest();assert.equal(replay.reused,true);assert.equal(replay.canonicalLeadWrites,0);assert.equal(replay.canonicalAuditWrites,0);
  assert.equal(s.db.writes.length,count);assert.equal(c.digest([...s.db.documents]),before);
});
test('optional Meta attribution is bound to the exact published source observation and never invents a product',async()=>{
  const bytes=fs.readFileSync(path.join(__dirname,'..',c.META_RECEIPT_PATH)),observed=JSON.parse(bytes);
  const gitBlob=require('node:crypto').createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(gitBlob,c.META_RECEIPT_BLOB);
  const s=setup({sourceId:observed.ad.ad_id}),r=await s.ingest(),[[leadPath,lead]]=canonicalRows(s.db),meta=lead.ingressProvenance.metaAttribution;
  assert.equal(meta.accountId,observed.accountId);assert.equal(meta.adId,observed.ad.ad_id);
  assert.equal(meta.adsetId,observed.ad.adset_id);assert.equal(meta.campaignId,observed.ad.campaign_id);
  assert.equal(meta.creativeId,observed.creative.id);assert.equal(meta.effectiveObjectStoryId,observed.ad.effective_object_story_id);
  assert.equal(meta.observedOn,observed.dateGuatemala);assert.deepEqual(meta.dateRange,observed.dateRange);
  assert.equal(meta.authority.receiptGitBlobSha,gitBlob);
  assert.equal(meta.authority.inventoryCanonicalJsonSha256,observed.sourceProof.inventoryCanonicalJsonSha256);
  assert.equal(meta.authority.creativeCanonicalJsonSha256,observed.sourceProof.creativeCanonicalJsonSha256);
  assert.equal(meta.specificProductVerified,false);assert.equal(meta.approvedCatalogProductId,null);
  assert.equal(lead.producto,'');assert.equal(lead.ramo,'');assert.equal(lead.descripcion,s.packet.extendedTextMessage.text);
  assert.equal(r.ingressReadback.metaAttributionObserved,true);assert.equal(r.ingressReadback.externalMessagesSent,0);
  const prior=clone(s.db.documents.get(leadPath)),before=s.db.writes.length;
  s.packet.extendedTextMessage.title='Provider ad title may change';s.packet.extendedTextMessage.description='Later ad copy';
  const replay=await s.ingest();assert.equal(replay.canonicalLeadWrites,0);assert.equal(replay.canonicalAuditWrites,0);
  assert.deepEqual(s.db.documents.get(leadPath),prior);assert.equal(s.db.writes.length,before);
});
test('missing or near-match Meta catalog entries never block an independently verified inbound Lead or manufacture attribution',async()=>{
  for(const sourceId of ['1202499697037202520','UNKNOWN_AD_001']){
    const s=setup({sourceId}),r=await s.ingest(),[[,lead]]=canonicalRows(s.db);
    assert.equal(r.canonicalLeadWrites,1);assert.equal(lead.ingressProvenance.metaAttribution,null);
    assert.equal(r.ingressReadback.metaAttributionObserved,false);assert.equal(lead.producto,'');
  }
  const s=setup({sourceId:'120249969703720252'});s.packet.extendedTextMessage.sourceType='unknown';
  await rejectsCode(s.ingest,'INGRESS_PROVIDER_AD_PROOF_MISMATCH');assert.equal(s.db.writes.length,0);
});
test('changed persisted Meta attribution is detected before replay can certify the canonical Lead',async()=>{
  const s=setup({sourceId:'120249969703720252'});await s.ingest();const [[p,lead]]=canonicalRows(s.db),count=s.db.writes.length;
  lead.ingressProvenance.metaAttribution.campaignId='999999';s.db.seed(p,lead);
  await rejectsCode(s.ingest,'INGRESS_META_ATTRIBUTION_PROVENANCE_CHANGED');assert.equal(s.db.writes.length,count);
});
test('verified customer request stays distinct from ad copy and automated greeting, with no invented product or raw text in acknowledgement',async()=>{
  const s=setup();s.packet.textMessage='Solicito cotización para mi empresa.\nTengo 8 empleados.';
  Object.assign(s.packet.extendedTextMessage,{text:s.packet.textMessage,title:'Empresas de Guatemala',description:'Texto del anuncio',
    greetingMessageBody:'¡Hola! Gracias por escribirnos.',sourceApp:'facebook',sourceUrl:'https://www.facebook.com/123/posts/456'});
  const out=await s.bridge.__makeLeadIngress.handle(s.event,false,{db:s.db,getSourcePacket:async()=>s.packet,nowMs:NOW});
  assert.equal(out.status,'APPLIED_VERIFIED');const [[,lead]]=canonicalRows(s.db);
  assert.equal(lead.descripcion,s.packet.textMessage);assert.equal(lead.producto,'');assert.equal(lead.ramo,'');
  assert.equal(lead.ingressProvenance.initialRequest.text,s.packet.textMessage);
  assert.equal(lead.ingressProvenance.initialRequest.providerTextField,'textMessage');
  assert.equal(lead.ingressProvenance.adContext.title,s.packet.extendedTextMessage.title);
  assert.equal(lead.ingressProvenance.adContext.automaticGreetingPresent,true);
  assert.equal(JSON.stringify(lead).includes(s.packet.extendedTextMessage.greetingMessageBody),false);
  const ack=s.db.documents.get(ROOT+'/leadIngressResults/'+s.event.params.requestId);
  assert.equal(ack.initialRequestPreserved,true);assert.equal(ack.requestTextSha256,c.sha(s.packet.textMessage));
  assert.equal(JSON.stringify(ack).includes(s.packet.textMessage),false);
  assert.equal(JSON.stringify(ack).includes(s.packet.extendedTextMessage.description),false);
});
test('provider request aliases may be individually present but conflicting text and missing customer text fail closed',()=>{
  for(const field of ['top','extended']){const f=fixtures();if(field==='top'){f.packet.textMessage=f.packet.extendedTextMessage.text;delete f.packet.extendedTextMessage.text;}
    assert.ok(c.plan(f).payload.descripcion);}
  const mutations=[f=>f.packet.textMessage='Different request',f=>{delete f.packet.extendedTextMessage.text;f.packet.extendedTextMessage.greetingMessageBody='Automatic greeting';},
    f=>f.packet.extendedTextMessage.text=' ',f=>f.packet.extendedTextMessage.text='a'.repeat(8193),
    f=>f.packet.extendedTextMessage.text='invalid\u0000content',f=>f.packet.extendedTextMessage.text={text:'wrong type'},
    f=>f.packet.extendedTextMessage.sourceUrl='javascript:alert(1)'];
  for(const mutate of mutations){const f=fixtures();mutate(f);assert.throws(()=>c.plan(f));}
});
test('initial request remains immutable across human detail edits, later messages, and zero-write replay',async()=>{
  const s=setup(),first=await s.ingest(),leadPath=ROOT+'/data/negocios/items/'+first.entityId;
  const initial=clone(s.db.documents.get(leadPath).ingressProvenance.initialRequest);
  s.db.seed(leadPath,{...s.db.documents.get(leadPath),descripcion:'Detalle actualizado por Operaciones'});
  const next=fixtures({message:'MESSAGE_000002',request:'queue-request-002'});next.packet.extendedTextMessage.text='Mi segunda consulta';
  s.db.seed(next.event.data.ref.path,next.row);
  const linked=await s.owner.__opsLeadsProductDomain.ingestVerifiedLead({event:next.event,packet:next.packet,nowMs:NOW});
  assert.equal(linked.canonicalLeadWrites,0);assert.deepEqual(s.db.documents.get(leadPath).ingressProvenance.initialRequest,initial);
  assert.equal(s.db.documents.get(leadPath).descripcion,'Detalle actualizado por Operaciones');
  const before=s.db.writes.length,replay=await s.ingest();assert.equal(replay.canonicalLeadWrites,0);assert.equal(s.db.writes.length,before);
  s.packet.extendedTextMessage.text='Changed original request';
  await assert.rejects(s.ingest(),/INGRESS_MESSAGE_REPLAY_BINDING_MISMATCH|INGRESS_INITIAL_REQUEST_SOURCE_CHANGED/);
  assert.equal(s.db.writes.length,before);
});
test('another incoming message for the same ad identity links audit only and preserves a human assignment',async()=>{
  const s=setup(),first=await s.ingest(),leadPath=ROOT+'/data/negocios/items/'+first.entityId;
  s.db.seed(leadPath,{...s.db.documents.get(leadPath),asesorId:'assigned-by-operations',nombre:'Nombre corregido'});
  const next=fixtures({message:'MESSAGE_000002',request:'queue-request-002'});s.db.seed(next.event.data.ref.path,next.row);
  const count=s.db.writes.length,result=await s.owner.__opsLeadsProductDomain.ingestVerifiedLead({event:next.event,packet:next.packet,nowMs:NOW});
  assert.equal(result.canonicalLeadWrites,0);assert.equal(result.canonicalAuditWrites,3);assert.equal(s.db.writes.length-count,3);
  assert.equal(canonicalRows(s.db).length,1);assert.equal(s.db.documents.get(leadPath).nombre,'Nombre corregido');
  assert.equal(s.db.documents.get(leadPath).asesorId,'assigned-by-operations');assert.equal(result.ingressReadback.assignment,'assigned_by_operations');
  assert.equal(result.ingressReadback.internalNoticeVerified,false);
});
test('concurrent duplicate phone insertion invalidates census and commits nothing',async()=>{
  const s=setup();s.db.beforeCommit=db=>db.seed(ROOT+'/data/negocios/items/competing-id',{id:'competing-id',tenantId:c.TENANT,pais:'GT',celular:'+502 5555-0000'});
  await rejectsCode(s.ingest,'INGRESS_EXISTING_PHONE_REQUIRES_IDENTITY_REVIEW');assert.equal(s.db.writes.length,0);assert.equal(canonicalRows(s.db).length,1);
});
for(const field of ['telefono','phone','celular','movil','telefonoPrincipal','telefonoMovil'])test('existing phone alias '+field+' prevents a duplicate Lead',async()=>{
  const s=setup();s.db.seed(ROOT+'/data/negocios/items/legacy-id',{id:'legacy-id',[field]:'+502 5555-0000'});
  await rejectsCode(s.ingest,'INGRESS_EXISTING_PHONE_REQUIRES_IDENTITY_REVIEW');assert.equal(s.db.writes.length,0);
});
test('incomplete census cannot certify absence',()=>{
  const f=fixtures(),p=c.plan({...f,previewOnly:false});assert.throws(()=>c.assertNoCompetingLead(Array(c.MAX_CENSUS+1).fill({}),p),/INGRESS_CENSUS_INCOMPLETE/);
});
for(const kind of ['grant','queue'])test(kind+' CAS drift before commit rejects without canonical writes',async()=>{
  const s=setup();s.db.beforeCommit=db=>kind==='grant'?db.seed(s.grantPath,{...s.grant,enabled:false}):db.seed(s.event.data.ref.path,{...s.row,sourceId:'DIFFERENT_AD'});
  await rejectsCode(s.ingest,kind==='grant'?'INGRESS_GRANT_CHANGED_BEFORE_COMMIT':'INGRESS_QUEUE_CHANGED_BEFORE_COMMIT');assert.equal(s.db.writes.length,0);
});
test('corrupt post-commit audit is HOLD with honest committed counts',async()=>{
  const s=setup();s.db.afterCommit=db=>{const eventPath=db.writes.find(p=>p.includes('/workflowEvents/'));db.seed(eventPath,{...db.documents.get(eventPath),entityId:'wrong-id'});};
  let caught;try{await s.ingest();}catch(error){caught=error;}
  assert.equal(caught.code,'INGRESS_CANONICAL_READBACK_INCOMPLETE');assert.equal(caught.ingressCommitOutcome.committed,true);
  assert.equal(caught.ingressCommitOutcome.canonicalLeadWrites,1);assert.equal(caught.ingressCommitOutcome.canonicalAuditWrites,4);assert.equal(canonicalRows(s.db).length,1);
});
test('missing creation notice cannot produce a verified acceptance',async()=>{
  const s=setup();s.db.afterCommit=db=>db.seed(db.writes.find(p=>p.includes('/notificationOutbox/')),undefined);
  await assert.rejects(s.ingest,e=>e.code==='INGRESS_INTERNAL_NOTICE_READBACK_INCOMPLETE'&&e.ingressCommitOutcome.canonicalLeadWrites===1);
});
test('changed replay message audit and competing later Lead fail closed',async()=>{
  const s=setup(),first=await s.ingest(),p=c.plan({...s,previewOnly:false});
  const mp=support.messageRef(s.db,p).path,original=clone(s.db.documents.get(mp));
  s.db.seed(mp,{...original,attributionSha256:'f'.repeat(64)});const count=s.db.writes.length;
  await rejectsCode(s.ingest,'INGRESS_MESSAGE_REPLAY_BINDING_MISMATCH');assert.equal(s.db.writes.length,count);
  s.db.seed(mp,original);s.db.seed(ROOT+'/data/negocios/items/later-duplicate',{id:'later-duplicate',phone:s.row.chatId.split('@')[0]});
  await rejectsCode(s.ingest,'INGRESS_EXISTING_PHONE_REQUIRES_IDENTITY_REVIEW');assert.equal(s.db.writes.length,count);assert.ok(first.entityId);
});
test('human callable still requires a human advisor and cannot forge integration capability',async()=>{
  const s=setup(),uid='human-operator';s.db.seed(ROOT+'/members/'+uid,{tenantId:c.TENANT,uid,status:'active',roles:['operativo'],activeRole:'operativo',
    countries:['GT'],nombre:'Operador sintético',dataScopes:{modules:{leads:'all'}}});
  const request={auth:{uid,token:{}},data:{tenantId:c.TENANT,activeRole:'operativo',operation:'create_business',entityId:'human-lead-001',requestId:'human-request-001',
    reason:'Prueba de contrato humano',ingressContext:{capability:true},payload:{id:'human-lead-001',nombre:'Consulta',pais:'GT',etapa:'nuevo',asesorId:'',actor:{type:'integration'}}}};
  await assert.rejects(()=>s.owner.orbit360OpsLeadsCommand(request),e=>e.code==='invalid-argument'&&e.message.includes('advisorId'));
  assert.equal(s.db.writes.length,0);
});
test('preview uses the same owner, a synthetic ID and separate audit/outbox namespaces',async()=>{
  const s=setup({preview:true}),r=await s.ingest();assert.ok(r.entityId.startsWith('b4003qa_'));assert.equal(canonicalRows(s.db)[0][1].previewWrite,true);
  assert.equal(canonicalRows(s.db)[0][1].ingressProvenance.synthetic,true);assert.ok(s.db.writes.some(p=>p.includes('/previewWorkflowEvents/')));
  assert.ok(s.db.writes.some(p=>p.includes('/previewNotificationOutbox/')));assert.equal(s.db.writes.some(p=>p.includes('/workflowEvents/')),false);
});

const pureCases={
  'wrong principal':f=>{f.event.authId='unapproved@example.invalid';},
  'anonymous principal':f=>{f.event.authType='unauthenticated';},
  'wrong tenant':f=>{f.row.tenantId='foreign';},
  'wrong instance':f=>{f.row.instanceId='9999999999';},
  'wrong scenario':f=>{f.row.scenarioId=10221181;},
  'group chat':f=>{f.row.chatId='12345678@g.us';},
  'missing attribution':f=>{delete f.row.sourceId;},
  'unapproved body':f=>{f.row.text='private conversation';},
  'outgoing packet':f=>{f.packet.type='outgoing';},
  'packet id mismatch':f=>{f.packet.idMessage='DIFFERENT_MESSAGE';},
  'packet source mismatch':f=>{f.packet.extendedTextMessage.sourceId='OTHER_AD';},
  'forward':f=>{f.packet.extendedTextMessage.isForwarded=true;},
  'forward score':f=>{f.packet.extendedTextMessage.forwardingScore=1;},
  'deleted':f=>{f.packet.isDeleted=true;},
  'edited':f=>{f.packet.isEdited=true;},
  'before activation':f=>{f.packet.timestamp=Math.floor(NOW/1000)-61;},
  'old source outside poll bound':f=>{f.grant.activationNotBefore=new Date(NOW-3600000).toISOString();f.packet.timestamp=Math.floor(NOW/1000)-901;},
  'future source':f=>{f.packet.timestamp=Math.floor(NOW/1000)+301;},
  'wrong scope authority':f=>{f.grant.authority.scopeContractBlob='1'.repeat(40);},
  'forged advisor assignment':f=>{f.grant.advisorId='invented-advisor';},
  'outbound enabled':f=>{f.grant.externalSendAllowed=true;},
  'no proof binding':f=>{delete f.grant.authority.principalProbeDigest;},
  'QA nonce in live':f=>{f.row.qaNonce='a'.repeat(64);}
};
for(const [label,mutate] of Object.entries(pureCases))test('source and authorization reject: '+label,()=>{const f=fixtures();mutate(f);assert.throws(()=>c.plan({...f,previewOnly:false}),c.IngressError);});
test('optional ctwaClid empty mapping is accepted only when provider attribution is also absent',()=>{
  const f=fixtures();f.row.ctwaClid='';delete f.packet.extendedTextMessage.ctwaClid;
  assert.equal(c.plan({...f,previewOnly:false}).proof.ctwaClid,'');
  f.packet.extendedTextMessage.ctwaClid='PROVIDER_HAS_CTWA';assert.throws(()=>c.plan({...f,previewOnly:false}),/INGRESS_PROVIDER_CTWA_MISMATCH/);
});

function probeSetup(options={}){
  const s=setup(options),row={schema:c.PROBE_SCHEMA,provider:'greenapi',tenantId:c.TENANT,country:c.COUNTRY,instanceId:c.INSTANCE,scenarioId:c.SCENARIO,nonce:'e'.repeat(64)};
  const grant={...s.grant,enabled:false,state:'CLOSED',principalSha256:'',authType:'',
    authority:{...s.grant.authority,principalObserved:false},probe:{enabled:true,nonce:row.nonce,expiresAt:new Date(NOW+300000).toISOString()}};
  s.event.data.data=()=>clone(row);s.db.seed(s.event.data.ref.path,row);s.db.seed(s.grantPath,grant);
  return{...s,row,grant,run:()=>s.bridge.__makeLeadIngress.handle(s.event,s.preview,{db:s.db,nowMs:NOW,
    ingest:()=>{throw Error('PROBE_MUST_NOT_CALL_OWNER');},getSourcePacket:()=>{throw Error('PROBE_MUST_NOT_CALL_PROVIDER');}})};
}
test('CLOSED principal probe records hash/type only and creates no Lead, workflow, notice or provider request',async()=>{
  const s=probeSetup(),r=await s.run();assert.equal(r.status,'PRINCIPAL_OBSERVED_ONLY');assert.equal(r.authType,'unknown');assert.equal(r.principalSha256,c.principalDigest(s.event));
  assert.equal(r.canonicalLeadWrites,0);assert.equal(r.notificationsCreated,0);assert.equal(r.externalMessagesSent,0);assert.equal(r.providerRequests,0);assert.equal(r.principalBound,false);
  assert.equal(JSON.stringify(r).includes(s.event.authId),false);assert.equal(s.db.writes.length,1);assert.ok(s.db.writes[0].includes('/leadIngressResults/'));
  const count=s.db.writes.length,again=await s.run();assert.equal(again.proofDigest,r.proofDigest);assert.equal(s.db.writes.length,count);
});
for(const kind of ['nonce','expired','anonymous','active','config drift','queue drift'])test('principal probe rejects '+kind+' with zero canonical mutations',async()=>{
  const s=probeSetup();
  if(kind==='nonce')s.grant.probe.nonce='f'.repeat(64);
  if(kind==='expired')s.grant.probe.expiresAt=new Date(NOW-1).toISOString();
  if(kind==='anonymous')s.event.authType='unauthenticated';
  if(kind==='active'){s.grant.enabled=true;s.grant.state='ACTIVE';}
  s.db.seed(s.grantPath,s.grant);
  if(kind==='config drift')s.db.beforeCommit=db=>db.seed(s.grantPath,{...s.grant,state:'BOUND'});
  if(kind==='queue drift')s.db.beforeCommit=db=>db.seed(s.event.data.ref.path,{...s.row,nonce:'f'.repeat(64)});
  const r=await s.run();assert.equal(r.status,'HOLD');assert.equal(r.canonicalLeadWrites,0);assert.equal(s.db.writes.length,0);
});
for(const state of ['ABSENT','CLOSED','BOUND'])test('normal deployment denies '+state+' grant before provider or canonical writes',async()=>{
  const s=setup();let reads=0;
  s.db.seed(s.grantPath,state==='ABSENT'?undefined:{...s.grant,state,enabled:false});
  const result=await s.bridge.__makeLeadIngress.handle(s.event,false,{db:s.db,getSourcePacket:async()=>{reads++;return s.packet;},nowMs:NOW});
  assert.equal(result.code,'INGRESS_GRANT_DISABLED_OR_MISSING');assert.equal(reads,0);assert.equal(canonicalRows(s.db).length,0);assert.equal(canonicalWrites(s.db).length,0);
});
test('additional local deny and wrong authenticated principal prevent a provider request',async()=>{
  const s=setup();let reads=0;const getSourcePacket=async()=>{reads++;return s.packet;};
  const closed=await s.bridge.__makeLeadIngress.handle(s.event,false,{db:s.db,getSourcePacket,enabled:false,nowMs:NOW});assert.equal(closed.code,'INGRESS_DEPLOYMENT_DISABLED');assert.equal(reads,0);
  s.event.authId='wrong-principal';const wrong=await s.bridge.__makeLeadIngress.handle(s.event,false,{db:s.db,getSourcePacket,nowMs:NOW});
  assert.equal(wrong.code,'INGRESS_TRANSPORT_PRINCIPAL_MISMATCH');assert.equal(reads,0);assert.equal(canonicalRows(s.db).length,0);
});
test('verified ACTIVE server grant enables the immutable deployment without an injected env file',async()=>{
  const s=setup();let reads=0;
  assert.equal(s.bridge.orbit360MakeLeadIngress.options.serviceAccount,'646761409743-compute@developer.gserviceaccount.com');
  const result=await s.bridge.__makeLeadIngress.handle(s.event,false,{db:s.db,getSourcePacket:async()=>{reads++;return s.packet;},nowMs:NOW});
  assert.equal(result.status,'APPLIED_VERIFIED');assert.equal(reads,1);assert.equal(result.canonicalLeadWrites,1);assert.equal(canonicalRows(s.db).length,1);
});
test('bridge calls real canonical owner, reports committed readback and never downgrades a proven result',async()=>{
  const s=setup();const r=await s.bridge.__makeLeadIngress.handle(s.event,false,{db:s.db,getSourcePacket:async()=>s.packet,enabled:true,nowMs:NOW});
  assert.equal(r.status,'APPLIED_VERIFIED');assert.equal(r.canonicalLeadWrites,1);assert.equal(r.externalMessagesSent,0);
  await s.bridge.__makeLeadIngress.acknowledge(s.event,false,{status:'HOLD',canonicalLeadWrites:0},s.db);
  const results=[...s.db.documents].filter(([p])=>p.includes('/leadIngressResults/'));assert.equal(results[0][1].status,'APPLIED_VERIFIED');
});
test('bridge postcommit failure preserves known writes and unknown transaction outcome never says zero',async()=>{
  const s=setup();s.db.afterCommit=db=>db.seed(db.writes.find(p=>p.includes('/workflowEvents/')),undefined);
  const first=await s.bridge.__makeLeadIngress.handle(s.event,false,{db:s.db,getSourcePacket:async()=>s.packet,enabled:true,nowMs:NOW});
  assert.equal(first.status,'COMMITTED_READBACK_HOLD');assert.equal(first.canonicalLeadWrites,1);
  const t=setup();await assert.rejects(()=>t.bridge.__makeLeadIngress.handle(t.event,false,{db:t.db,getSourcePacket:async()=>t.packet,enabled:true,nowMs:NOW,ingest:async()=>{throw Error('network lost after commit');}}),/INGRESS_RETRYABLE_UNCONFIRMED/);
  const result=[...t.db.documents].find(([p])=>p.includes('/leadIngressResults/'))[1];assert.equal(result.canonicalCommitState,'UNKNOWN');assert.equal(Object.hasOwn(result,'canonicalLeadWrites'),false);
});
test('provider request is getMessage only, follows no redirects and never returns credentials in errors',async()=>{
  const s=setup(),api=s.bridge.__makeLeadIngress,token='SYNTHETIC_TOKEN_DO_NOT_PRINT_12345';
  const secret={tenantId:c.TENANT,pais:c.COUNTRY,idInstance:c.INSTANCE,apiTokenInstance:token,apiUrl:'https://api.green-api.com'};
  let seen;const packet=await api.getSourcePacket(s.row,{readSecret:async()=>secret,fetchImpl:async(url,options)=>{
    seen={url,options};const data=Buffer.from(JSON.stringify(s.packet));return{ok:true,headers:{get:()=>String(data.length)},arrayBuffer:async()=>data};}});
  assert.equal(packet.idMessage,s.packet.idMessage);assert.ok(seen.url.endsWith('/getMessage/'+token));assert.equal(seen.options.redirect,'error');
  assert.deepEqual(JSON.parse(seen.options.body),{chatId:s.row.chatId,idMessage:s.row.messageId});
  for(const apiUrl of ['http://api.green-api.com','https://api.green-api.com.evil.test','https://u:p@api.green-api.com','https://api.green-api.com/path']){
    assert.throws(()=>api.safeProviderConfig({...secret,apiUrl}),/INGRESS_PROVIDER_ORIGIN_INVALID/);
  }
  await assert.rejects(()=>api.getSourcePacket(s.row,{readSecret:async()=>secret,fetchImpl:async()=>{throw Error('secret '+token);}}),e=>e.code==='INGRESS_PROVIDER_READ_UNAVAILABLE'&&!String(e.stack).includes(token));
  await assert.rejects(()=>api.getSourcePacket(s.row,{readSecret:async()=>secret,fetchImpl:async()=>({ok:true,headers:{get:()=>String(262145)}})}),/INGRESS_PROVIDER_RESPONSE_SIZE/);
});
test('only exact GetMessage indexing 400 is retried; second actual invocation creates once and replay remains zero',async()=>{
  const s=setup(),api=s.bridge.__makeLeadIngress;
  const secret={tenantId:c.TENANT,pais:c.COUNTRY,idInstance:c.INSTANCE,apiTokenInstance:'SYNTHETIC_TOKEN_123456789',apiUrl:'https://api.green-api.com'};
  let requestCount=0;
  const getSourcePacket=async row=>api.getSourcePacket(row,{readSecret:async()=>secret,fetchImpl:async()=>{
    requestCount++;const status=requestCount===1?400:200;
    const body=Buffer.from(JSON.stringify(status===400?{error:`Message not found by id '${s.row.messageId}'`}:s.packet));
    return{ok:status===200,status,headers:{get:()=>String(body.length)},arrayBuffer:async()=>body};}});
  await assert.rejects(()=>api.handle(s.event,false,{db:s.db,getSourcePacket,enabled:true,nowMs:NOW}),/INGRESS_RETRYABLE_UNCONFIRMED/);
  assert.equal(canonicalRows(s.db).length,0);
  const applied=await api.handle(s.event,false,{db:s.db,getSourcePacket,enabled:true,nowMs:NOW+120000});assert.equal(applied.status,'APPLIED_VERIFIED');assert.equal(applied.canonicalLeadWrites,1);
  const count=canonicalWrites(s.db).length,replay=await api.handle(s.event,false,{db:s.db,getSourcePacket,enabled:true,nowMs:NOW+120001});
  assert.equal(replay.canonicalLeadWrites,0);assert.equal(canonicalWrites(s.db).length,count);assert.equal(canonicalRows(s.db).length,1);
});
for(const errorText of ['Validation failed',"Message not found by id 'DIFFERENT_MESSAGE_ID'"])
test('400 '+errorText+' is terminal, with no leaked provider body',async()=>{
  const s=setup(),api=s.bridge.__makeLeadIngress;
  const secret={tenantId:c.TENANT,pais:c.COUNTRY,idInstance:c.INSTANCE,apiTokenInstance:'SYNTHETIC_TOKEN_123456789',apiUrl:'https://api.green-api.com'};
  const body=Buffer.from(JSON.stringify({error:errorText}));
  const r=await api.handle(s.event,false,{db:s.db,enabled:true,nowMs:NOW,getSourcePacket:row=>api.getSourcePacket(row,{readSecret:async()=>secret,
    fetchImpl:async()=>({ok:false,status:400,headers:{get:()=>String(body.length)},arrayBuffer:async()=>body})})});
  assert.equal(r.status,'HOLD');assert.equal(r.code,'INGRESS_PROVIDER_READ_REJECTED');assert.equal(r.canonicalLeadWrites,0);
  assert.equal(JSON.stringify(r).includes(errorText),false);
});
for(const kind of ['missing','expired'])test(kind+' authentic queue createTime prevents unbounded provider retries',async()=>{
  const s=setup();if(kind==='missing')delete s.event.data.createTime;else s.event.data.createTime={toMillis:()=>NOW-900001};
  let calls=0;const r=await s.bridge.__makeLeadIngress.handle(s.event,false,{db:s.db,enabled:true,nowMs:NOW,getSourcePacket:async()=>{calls++;throw new c.IngressError('INGRESS_PROVIDER_MESSAGE_NOT_INDEXED',true);}});
  assert.equal(r.status,'HOLD');assert.equal(r.code,kind==='missing'?'INGRESS_QUEUE_CREATION_TIME_UNPROVEN':'INGRESS_QUEUE_RETRY_WINDOW_EXPIRED');assert.equal(calls,0);assert.equal(r.canonicalLeadWrites,0);
});
test('expiry cannot rewrite a known committed or unknown earlier outcome to zero writes',async()=>{
  for(const state of ['COMMITTED_UNVERIFIED','UNKNOWN']){
    const s=setup(),api=s.bridge.__makeLeadIngress;
    await api.acknowledge(s.event,false,{status:'HOLD',canonicalCommitState:state,...(state==='COMMITTED_UNVERIFIED'?{entityId:'known-lead',canonicalLeadWrites:1,canonicalAuditWrites:4}:{})},s.db);
    s.event.data.createTime={toMillis:()=>NOW-900001};
    const r=await api.handle(s.event,false,{db:s.db,enabled:true,nowMs:NOW});assert.equal(r.canonicalCommitState,state);
    if(state==='COMMITTED_UNVERIFIED')assert.equal(r.canonicalLeadWrites,1);else assert.equal(Object.hasOwn(r,'canonicalLeadWrites'),false);
  }
});

const configOwner=require('./gravicentra-i66-make-lead-ingress-config.cjs');
const deploymentAuthority=(preview=false)=>({scopeContractBlob:c.SCOPE_CONTRACT_BLOB,receiptBlobSha:'2'.repeat(40),sourceSha:'c'.repeat(40),
  phase:preview?'preview':'live',functionName:preview?'orbit360MakeLeadIngressPreview':'orbit360MakeLeadIngress',region:preview?'us-east1':'us-central1',
  authContextEventType:'google.cloud.firestore.document.v1.created.withAuthContext',functionRevision:'synthetic-revision-001',
  runtimeIdentityVerified:true,queueRulesDenyClient:true,sourceAndArtifactVerified:true});
async function configurationFixture(preview=false){
  const db=new Database(),authority=deploymentAuthority(preview),nonce='e'.repeat(64);
  const init={db,action:'INITIALIZE_CLOSED',previewOnly:preview,expectedDigest:'ABSENT',authority,nonce,nowMs:NOW};
  const initial=await configOwner.transition(init),ref=support.grantRef(db,preview),before=db.documents.get(ref.path);
  const f=fixtures({preview}),row={schema:c.PROBE_SCHEMA,provider:'greenapi',tenantId:c.TENANT,country:c.COUNTRY,instanceId:c.INSTANCE,scenarioId:c.SCENARIO,nonce};
  f.event.data.data=()=>clone(row);db.seed(f.event.data.ref.path,row);
  const bridge=loadBridge(db,loadOwner(db)),proof=await bridge.__makeLeadIngress.recordPrincipalProbe(f.event,preview,{db,nowMs:NOW});
  const makeExecution={status:'success',scenarioId:c.SCENARIO,connectionId:c.FIRESTORE_CONNECTION,module:'google-cloud-firestore:createDocument',
    documentName:'projects/ays-orbit-360-lab/databases/(default)/documents/'+f.event.data.ref.path,executionId:'SYNTHETIC_EXECUTION_001',receiptBlobSha:'3'.repeat(40)};
  const bind={db,action:'BIND_PRINCIPAL',previewOnly:preview,expectedDigest:c.digest(before),authority,probeRequestId:f.event.params.requestId,makeExecution,nowMs:NOW};
  return{db,authority,nonce,init,initial,ref,before,proof,bind,event:f.event,preview};
}
test('protected configuration initializes CLOSED, binds only real probe/Make correlation, and closes with exact audit snapshots',async()=>{
  const s=await configurationFixture(),bound=await configOwner.transition(s.bind);
  assert.equal(bound.state,'BOUND');assert.equal(bound.enabled,false);assert.equal(bound.canonicalLeadWrites,0);assert.equal(bound.configReadback,true);
  let grant=s.db.documents.get(s.ref.path);assert.equal(grant.principalSha256,s.proof.principalSha256);assert.equal(grant.authority.principalProbeDigest,s.proof.proofDigest);
  const count=s.db.writes.length,replay=await configOwner.transition(s.bind);assert.equal(replay.reused,true);assert.equal(replay.configurationWrites,0);assert.equal(s.db.writes.length,count);
  const closed=await configOwner.transition({...s.bind,action:'CLOSE',expectedDigest:c.digest(grant)});assert.equal(closed.enabled,false);assert.equal(closed.state,'CLOSED');
  const audit=[...s.db.documents].filter(([p])=>p.includes('/leadIngressConfigurationAudit/')).at(-1)[1];
  assert.equal(audit.beforeSnapshot.state,'BOUND');assert.equal(audit.afterSnapshot.state,'CLOSED');assert.equal(JSON.stringify(closed).includes('beforeSnapshot'),false);
  assert.equal(canonicalRows(s.db).length,0);
});
for(const kind of ['changed config','changed queue','different execution path','different scenario','corrupt proof'])test('configuration binding refuses '+kind,async()=>{
  const s=await configurationFixture(),count=s.db.writes.length;
  if(kind==='changed config')s.db.beforeCommit=db=>db.seed(s.ref.path,{...s.before,probe:{...s.before.probe,enabled:false}});
  if(kind==='changed queue')s.db.seed(s.event.data.ref.path,{...s.event.data.data(),nonce:'f'.repeat(64)});
  if(kind==='different execution path')s.bind.makeExecution.documentName+='_wrong';
  if(kind==='different scenario')s.bind.makeExecution.scenarioId=10195867;
  if(kind==='corrupt proof'){const p=ROOT+'/leadIngressResults/'+s.event.params.requestId;s.db.seed(p,{...s.proof,principalSha256:'f'.repeat(64)});}
  await assert.rejects(()=>configOwner.transition(s.bind));assert.equal(s.db.writes.length,count);assert.equal(s.db.documents.get(s.ref.path).enabled,false);
});
test('activation never copies an old source date and requires Preview plus exact provider readiness for live',async()=>{
  const s=await configurationFixture();await configOwner.transition(s.bind);const bound=s.db.documents.get(s.ref.path);
  const request={...s.bind,action:'ACTIVATE',expectedDigest:c.digest(bound),nowMs:NOW+120000};
  await assert.rejects(()=>configOwner.transition(request),/INGRESS_CONFIG_SIGNED_PREVIEW_PROOF_REQUIRED/);
  request.previewProof={schema:'GI_I66_MAKE_LEAD_INGRESS_PREVIEW_PROOF_V1',sourceSha:s.authority.sourceSha,
    artifactSha256:'a'.repeat(64),reportSha256:'b'.repeat(64),reportBlobSha:'4'.repeat(40),authenticatedMakeQueue:true,
    providerFixtureIsSynthetic:true,pendingOperationsCanonicalLead:true,canonicalReadback:true,replayCanonicalWrites:0,
    rejectCanonicalWrites:0,externalMessagesSent:0,noOtherOperationalMutations:true};
  await assert.rejects(()=>configOwner.transition(request),/INGRESS_CONFIG_PROVIDER_READINESS_REQUIRED/);
  request.providerReadiness={secretVersionAccessible:true,rootTenantCountryInstanceMatch:true,apiTokenFormatUsable:true,apiOriginAllowed:true,
    runtimeSecretAccessVerified:true,providerAuthorized:true,settingsIdentityMatches:true};
  const done=await configOwner.transition(request);assert.equal(done.enabled,true);
  const active=s.db.documents.get(s.ref.path);assert.equal(active.activationNotBefore,new Date(NOW+120000).toISOString());
  const f=fixtures();f.grant=active;f.nowMs=NOW+120000;
  assert.throws(()=>c.plan({...f,previewOnly:false}),/INGRESS_PROVIDER_TIMESTAMP_OUT_OF_SCOPE/);assert.equal(canonicalRows(s.db).length,0);
});
test('preview activation requires the server-approved fresh synthetic fixture and cannot enter LIVE',async()=>{
  const s=await configurationFixture(true);await configOwner.transition(s.bind);const before=s.db.documents.get(s.ref.path);
  const fixture=fixtures({preview:true});fixture.packet.timestamp=NOW/1000;
  const qaFixture={nonce:fixture.row.qaNonce,packet:fixture.packet,providerPacketSha256:c.digest(fixture.packet)};
  const activation={...s.bind,action:'ACTIVATE',expectedDigest:c.digest(before),qaFixture};
  const done=await configOwner.transition(activation);assert.equal(done.enabled,true);assert.equal(s.db.documents.get(s.ref.path).phase,'preview');
  assert.equal(s.db.documents.has(ROOT+'/config/makeLeadIngress'),false);assert.equal(canonicalRows(s.db).length,0);
});
test('configuration successor requires prior CLOSED state; retains prior evidence and cannot silently change replay intent',async()=>{
  const s=await configurationFixture();await assert.rejects(()=>configOwner.transition({...s.init,nonce:'f'.repeat(64)}),/INGRESS_CONFIG_REPLAY_INTENT_CHANGED/);
  const nextAuthority={...s.authority,sourceSha:'9'.repeat(40),functionRevision:'synthetic-revision-002',receiptBlobSha:'8'.repeat(40)};
  const next=await configOwner.transition({...s.init,action:'PREPARE_CLOSED',authority:nextAuthority,expectedDigest:c.digest(s.before)});
  assert.equal(next.enabled,false);assert.equal(s.db.documents.get(s.ref.path).authority.sourceSha,nextAuthority.sourceSha);
  const audit=[...s.db.documents].filter(([p])=>p.includes('/leadIngressConfigurationAudit/')).at(-1)[1];assert.equal(audit.beforeSnapshot.authority.sourceSha,s.authority.sourceSha);
});
