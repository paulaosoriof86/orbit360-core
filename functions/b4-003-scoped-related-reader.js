'use strict';
// B4-003 staged protected document-read owner for related operational collections.
// Read-only. Preview-only candidate; NO Firebase export or rule deploy.
const {resolve,allowRow,Denied}=require('./b4-003-scoped-access-boundary');
const collections=new Set(['clientes','vehiculos','recibosEsperados','carteraPrimas','cobros']);
const clean=v=>String(v==null?'':v).trim();
const safeId=(id,label)=>{
 const value=clean(id);
 if(!value||value.length>180||/[\/\u0000-\u001f]/.test(value))throw new Denied(label+'_INVALID');
 return value;
};
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
 if(collection!=='clientes'&&!client&&!policy)throw new Denied('RELATION_NOT_VERIFIABLE');
 try{allowRow(ctx,row,[policy,client].filter(Boolean));}
 catch(e){if(e instanceof Denied)throw new Denied('RECORD_NOT_FOUND_OR_DENIED');throw e;}
 return {ok:true,serverScoped:true,collection,country,scope:ctx.scope,
   row:Object.assign({},row,{id:row.id||documentId,canonicalDocumentId:documentId})};
}

async function readScopedRelatedList({db,auth,request}){
 if(!db||!auth?.uid)throw new Denied('AUTH_REQUIRED');
 const q=request||{},tenantId=safeId(q.tenantId,'TENANT'),coll=clean(q.collection);
 const country=clean(q.country).toUpperCase(),role=clean(q.activeRole);
 const policyId=clean(q.policyId),cursor=clean(q.cursor);
 const pageSize=Number(q.pageSize==null?20:q.pageSize);
 if(!collections.has(coll))throw new Denied('COLLECTION_DENIED');
 if(!['GT','CO'].includes(country))throw new Denied('COUNTRY_DENIED');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>50)throw new Denied('PAGE_SIZE_INVALID');
 if(policyId)safeId(policyId,'POLICY');
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
 if(coll==='clientes'){
   if(policyId)throw new Denied('POLICY_ANCHOR_UNEXPECTED');
   query=target.where('pais','==',country);
   if(ctx.scope==='own')query=query.where('asesorId','==',ctx.advisorId);
   else if(ctx.scope==='team'){
     if(ctx.team.length>10)throw new Denied('TEAM_QUERY_BOUND_EXCEEDED');
     query=query.where('asesorId','in',ctx.team);
   }
 }else{
   if(!policyId)throw new Denied('POLICY_ANCHOR_REQUIRED');
   // Parent and client verified once; all returned rows must match this exact parent.
   const ps=await docRef(tenant,'polizas',policyId).get();
   if(!ps.exists)throw new Denied('POLICY_NOT_FOUND_OR_DENIED');
   policy=ps.data()||{};
   const clientId=clean(policy.clienteId);
   if(!clientId)throw new Denied('POLICY_CLIENT_UNKNOWN');
   const csnap=await docRef(tenant,'clientes',safeId(clientId,'CLIENT')).get();
   if(!csnap.exists)throw new Denied('RELATION_CLIENT_NOT_FOUND');
   client=csnap.data()||{};
   try{allowRow(ctx,policy,[client]);}
   catch(e){if(e instanceof Denied)throw new Denied('POLICY_NOT_FOUND_OR_DENIED');throw e;}
   query=target.where('polizaId','==',policyId);
 }
 function checkedRow(row,documentId){
   if(coll!=='clientes'){
     const linked=clean(row.polizaId||row.policyId);
     if(linked!==policyId)throw new Denied('RELATION_POLICY_MISMATCH');
     const inputClientId=clean(row.clienteId||row.clientId);
     if(inputClientId&&inputClientId!==clean(policy.clienteId))
       throw new Denied('RELATION_CLIENT_MISMATCH');
   }
   allowRow(ctx,row,policy?[policy,client]:[]);
   return Object.assign({},row,{id:row.id||documentId,canonicalDocumentId:documentId});
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
   anchoring:coll==='clientes'?'country_scope':'authorized_policy'};
}

module.exports=Object.freeze({readScopedRelatedDocument,readScopedRelatedList,collections,version:'b4-003-related-server-list-stage-v2'});
