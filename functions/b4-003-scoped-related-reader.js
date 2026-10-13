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
module.exports=Object.freeze({readScopedRelatedDocument,collections,version:'b4-003-related-document-read-stage-v1'});
