'use strict';
// B4-003 staged protected document-read owner for related operational collections.
// Read-only. Preview-only candidate; NO Firebase export or rule deploy.
const {resolve,allowRow,Denied}=require('./b4-003-scoped-access-boundary');
const collections=new Set(['clientes','vehiculos','recibosEsperados','carteraPrimas','cobros','negocios','gestiones']);
const workflowCollections=new Set(['negocios','gestiones']);
const clean=v=>String(v==null?'':v).trim();
const safeId=(id,label)=>{
 const value=clean(id);
 if(!value||value.length>180||/[\/\u0000-\u001f]/.test(value))throw new Denied(label+'_INVALID');
 return value;
};
function verifiedLinkedClient(ctx,client){
 if(!client)return;
 if(client.tenantId&&client.tenantId!==ctx.tenantId)throw new Denied('RELATION_CLIENT_TENANT_DENIED');
 const country=clean(client.pais||client.country).toUpperCase();
 if(!country||country!==ctx.country)throw new Denied('RELATION_CLIENT_COUNTRY_DENIED');
 // Advisor ownership of the client may differ after a legitimate reassignment.
 // It must not override policy ownership for historical policy-linked rows.
}
function docRef(tenant,collection,id){
 return tenant.collection('data').doc(collection).collection('items').doc(id);
}
async function readScopedRelatedDocument({db,auth,request}){
 if(!db||!auth||!auth.uid)throw new Denied('AUTH_REQUIRED');
 const q=request||{},tenantId=safeId(q.tenantId,'TENANT');
 const collection=clean(q.collection),documentId=safeId(q.documentId,'DOCUMENT');
 const country=clean(q.country).toUpperCase(),role=clean(q.activeRole);
 if(!collections.has(collection))throw new Denied('COLLECTION_DENIED');
 if(!['GT','CO'].includes(country))throw new Denied('COUNTRY_DENIED');
 const tenant=db.collection('tenants').doc(tenantId);
 const [ms,cs]=await Promise.all([
   tenant.collection('members').doc(auth.uid).get(),
   tenant.collection('config').doc('access').get()
 ]);
 if(!ms.exists)throw new Denied('MEMBERSHIP_DENIED');
 const ctx=resolve({auth,member:ms.data()||{},config:cs.exists?cs.data()||{}:{},
   tenantId,activeRole:role,country,collection});
 const snap=await docRef(tenant,collection,documentId).get();
 if(!snap.exists)throw new Denied('RECORD_NOT_FOUND_OR_DENIED');
 const row=snap.data()||{},policyId=clean(row.polizaId||row.policyId);
 const inputClientId=clean(row.clienteId||row.clientId);
 let policy=null,client=null;
 if(policyId){
   const p=await docRef(tenant,'polizas',safeId(policyId,'POLICY')).get();
   if(!p.exists)throw new Denied('RELATION_POLICY_NOT_FOUND');
   policy=p.data()||{};
 }
 const linkedClient=clean(policy&&policy.clienteId);
 if(linkedClient && inputClientId && linkedClient!==inputClientId)
   throw new Denied('RELATION_CLIENT_MISMATCH');
 const clientId=collection==='clientes'?documentId:(inputClientId||linkedClient);
 if(clientId&&collection!=='clientes'){
   const c=await docRef(tenant,'clientes',safeId(clientId,'CLIENT')).get();
   if(!c.exists)throw new Denied('RELATION_CLIENT_NOT_FOUND');
   client=c.data()||{};
 }
 if(collection!=='clientes'&&!workflowCollections.has(collection)&&!client&&!policy)throw new Denied('RELATION_NOT_VERIFIABLE');
 try{verifiedLinkedClient(ctx,client);allowRow(ctx,row,policy?[policy]:client?[client]:[]);}
 catch(e){if(e instanceof Denied)throw new Denied('RECORD_NOT_FOUND_OR_DENIED');throw e;}
 return {ok:true,serverScoped:true,collection,country,scope:ctx.scope,
   row:Object.assign({},row,{id:row.id||documentId,canonicalDocumentId:documentId,
     pais:clean(row.pais||row.country||policy?.pais||policy?.country||client?.pais||client?.country),
     tenantId:row.tenantId||tenantId})};
}

async function readScopedRelatedList({db,auth,request}){
 if(!db||!auth?.uid)throw new Denied('AUTH_REQUIRED');
 const q=request||{},tenantId=safeId(q.tenantId,'TENANT'),coll=clean(q.collection);
 const country=clean(q.country).toUpperCase(),role=clean(q.activeRole);
 const policyId=clean(q.policyId),cursor=clean(q.cursor);
 const hasBatch=Object.prototype.hasOwnProperty.call(q,'policyIds');
 const policyIds=hasBatch&&Array.isArray(q.policyIds)?q.policyIds.map(x=>safeId(x,'POLICY')):[];
 const pageSize=Number(q.pageSize==null?20:q.pageSize);
 if(!collections.has(coll))throw new Denied('COLLECTION_DENIED');
 if(!['GT','CO'].includes(country))throw new Denied('COUNTRY_DENIED');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>50)throw new Denied('PAGE_SIZE_INVALID');
 if(policyId)safeId(policyId,'POLICY');
 if(hasBatch&&(!Array.isArray(q.policyIds)||policyIds.length<1||policyIds.length>10||
    new Set(policyIds).size!==policyIds.length||policyId))
   throw new Denied('POLICY_BATCH_INVALID');
 if(cursor)safeId(cursor,'CURSOR');
 const tenant=db.collection('tenants').doc(tenantId);
 // Resolve membership and role exactly once per page, not once per child document.
 const [ms,cs]=await Promise.all([
   tenant.collection('members').doc(auth.uid).get(),
   tenant.collection('config').doc('access').get()
 ]);
 if(!ms.exists)throw new Denied('MEMBERSHIP_DENIED');
 const ctx=resolve({auth,member:ms.data()||{},config:cs.exists?cs.data()||{}:{},
   tenantId,activeRole:role,country,collection:coll});
 const target=tenant.collection('data').doc(coll).collection('items');
 let query,policy=null,client=null;
 const verifiedParents=new Map();
 if(coll==='clientes'||workflowCollections.has(coll)){
   if(policyId||hasBatch)throw new Denied('POLICY_ANCHOR_UNEXPECTED');
   query=target.where('pais','==',country);
   if(ctx.scope==='own')query=query.where('asesorId','==',ctx.advisorId);
   else if(ctx.scope==='team'){
     if(ctx.team.length>10)throw new Denied('TEAM_QUERY_BOUND_EXCEEDED');
     query=query.where('asesorId','in',ctx.team);
   }
 }else{
   if(!policyId&&!hasBatch)throw new Denied('POLICY_ANCHOR_REQUIRED');
   // A batch is authorized server-side per policy and per client; a caller's
   // policyIds are only lookup hints and never confer read permission.
   const anchors=policyId?[policyId]:policyIds;
   // Limit: at most ten policy anchors. Read their verified relationships
   // concurrently rather than serially to avoid N*20 round trips per page.
   const parents=await Promise.all(anchors.map(async pid=>{
     const ps=await docRef(tenant,'polizas',pid).get();
     if(!ps.exists)throw new Denied('POLICY_NOT_FOUND_OR_DENIED');
     const verifiedPolicy=ps.data()||{},clientId=clean(verifiedPolicy.clienteId);
     if(!clientId)throw new Denied('POLICY_CLIENT_UNKNOWN');
     const csnap=await docRef(tenant,'clientes',safeId(clientId,'CLIENT')).get();
     if(!csnap.exists)throw new Denied('RELATION_CLIENT_NOT_FOUND');
     const verifiedClient=csnap.data()||{};
     try{verifiedLinkedClient(ctx,verifiedClient);allowRow(ctx,verifiedPolicy);}
     catch(e){if(e instanceof Denied)throw new Denied('POLICY_NOT_FOUND_OR_DENIED');throw e;}
     return [pid,{policy:verifiedPolicy,client:verifiedClient}];
   }));
   parents.forEach(([pid,verified])=>verifiedParents.set(pid,verified));
   query=hasBatch?target.where('polizaId','in',policyIds):target.where('polizaId','==',policyId);
 }
 function checkedRow(row,documentId){
   let parent=null,relatedClient=null;
   if(coll!=='clientes'&&!workflowCollections.has(coll)){
     const linked=clean(row.polizaId||row.policyId);
     const found=verifiedParents.get(linked);
     if(!found)throw new Denied('RELATION_POLICY_MISMATCH');
     parent=found.policy;relatedClient=found.client;
     const inputClientId=clean(row.clienteId||row.clientId);
     if(inputClientId&&inputClientId!==clean(parent.clienteId))
       throw new Denied('RELATION_CLIENT_MISMATCH');
   }
   allowRow(ctx,row,parent?[parent]:[]);
   return Object.assign({},row,{id:row.id||documentId,canonicalDocumentId:documentId,
     pais:clean(row.pais||row.country||parent?.pais||parent?.country||relatedClient?.pais||relatedClient?.country),
     tenantId:row.tenantId||tenantId});
 }
 query=query.orderBy('__name__');
 if(cursor){
   const csnap=await target.doc(cursor).get();
   if(!csnap.exists)throw new Denied('CURSOR_DENIED');
   try{checkedRow(csnap.data()||{},csnap.id||cursor);}
   catch(_){throw new Denied('CURSOR_DENIED');}
   query=query.startAfter(csnap);
 }
 const result=await query.limit(pageSize+1).get(),docs=Array.isArray(result.docs)?result.docs:[];
 // Validate the lookahead record as well: no partial, filtered or optimistic results.
 const verified=docs.map(d=>checkedRow(d.data()||{},d.id));
 return {ok:true,serverScoped:true,collection:coll,country,scope:ctx.scope,
   rows:verified.slice(0,pageSize),
   nextCursor:verified.length>pageSize?docs[pageSize-1].id:null,
   anchoring:coll==='clientes'||workflowCollections.has(coll)?'authorized_country_and_advisor_scope':hasBatch?'authorized_policy_batch':'authorized_policy'};
}

module.exports=Object.freeze({readScopedRelatedDocument,readScopedRelatedList,collections,version:'b4-003-related-server-list-stage-v3'});
