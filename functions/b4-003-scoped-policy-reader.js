'use strict';
// I6.5/B4-003 staged server-owned scoped policy reader.
// Not exported by functions/bootstrap. NEVER a substitute for deployed Firestore rules.
// Every request must carry server-verified Firebase Auth context.
const {resolve,allowRow,Denied}=require('./b4-003-scoped-access-boundary');
const parseText=(v,max=160)=>String(v==null?'':v).trim().slice(0,max);
function validateArguments(input){
 const v=input||{};
 const tenantId=parseText(v.tenantId),country=parseText(v.country,8).toUpperCase();
 const activeRole=parseText(v.activeRole,100),mode=parseText(v.mode||'get');
 const policyId=parseText(v.policyId),cursor=parseText(v.cursor),rawSize=Number(v.pageSize==null?50:v.pageSize);
 if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/.test(tenantId))throw new Denied('TENANT_INVALID');
 if(!['GT','CO'].includes(country))throw new Denied('COUNTRY_DENIED');
 if(!['get','list'].includes(mode))throw new Denied('MODE_DENIED');
 if(!Number.isInteger(rawSize)||rawSize<1||rawSize>(mode==='list'?200:50))throw new Denied('PAGE_SIZE_INVALID');
 if(mode==='get'&&(!policyId||policyId.length>160))throw new Denied('POLICY_ID_REQUIRED');
 if(mode==='list'&&policyId)throw new Denied('POLICY_GET_LIST_MIXED');
 if(mode==='get'&&cursor)throw new Denied('CURSOR_UNEXPECTED');
 if((policyId&&/[/\u0000-\u001f]/.test(policyId))||(cursor&&/[/\u0000-\u001f]/.test(cursor)))
   throw new Denied('DOCUMENT_ID_INVALID');
 return {tenantId,country,activeRole,mode,policyId,cursor,pageSize:rawSize};
}
function dataCollection(db,tenantId){
 return db.collection('tenants').doc(tenantId).collection('data').doc('polizas').collection('items');
}
// Reveal only the two public display NAMES attached to an already-authorized
// policy. Never expose the underlying Equipo or Aseguradoras directory, account
// credentials, bank information, assignment eligibility, or unrelated records.
// Resolve cross-border/historical references by ID, AFTER allowRow has passed.
async function withPolicyBoundDisplayLabels(tenant,authorizedRows,tenantId){
 const adviserId=row=>parseText(row.asesorId||row.advisorId||row.ownerAdvisorId);
 const insurerId=row=>parseText(row.aseguradoraId||row.insurerId);
 async function namesFor(collection,ids){
  const unique=[...new Set(ids.filter(id=>id&&!/[/\u0000-\u001f]/.test(id)))];
  if(unique.length>200)throw new Denied('POLICY_DISPLAY_LABEL_BOUND_EXCEEDED');
  const source=tenant.collection('data').doc(collection).collection('items');
  const names=new Map();
  for(let i=0;i<unique.length;i+=20){
   const resolved=await Promise.all(unique.slice(i,i+20).map(async id=>{
    try{const snap=await source.doc(id).get();
     if(!snap.exists)return null;
     const row=snap.data()||{};
     if(row.tenantId&&parseText(row.tenantId)!==tenantId)return null;
     const name=parseText(row.nombre||row.name||row.displayName,180);
     return name?{id,name}:null;
    }catch(_){return null;} // Optional labels must not suppress authorized policies.
   }));
   resolved.forEach(x=>{if(x)names.set(x.id,x.name);});
  }
  return names;
 }
 const [advisors,insurers]=await Promise.all([
  namesFor('asesores',authorizedRows.map(adviserId)),
  namesFor('aseguradoras',authorizedRows.map(insurerId))
 ]);
 return authorizedRows.map(row=>Object.assign({},row,{
  asesorNombreVerificado:advisors.get(adviserId(row))||'',
  aseguradoraNombreVerificado:insurers.get(insurerId(row))||''
 }));
}
async function scopedPolicyRead({db,auth,request}){
 if(!db||!auth||!auth.uid)throw new Denied('AUTH_REQUIRED');
 const v=validateArguments(request);
 const tenant=db.collection('tenants').doc(v.tenantId);
 const [membership,config]=await Promise.all([
   tenant.collection('members').doc(auth.uid).get(),
   tenant.collection('config').doc('access').get()
 ]);
 if(!membership.exists)throw new Denied('MEMBERSHIP_NOT_FOUND');
 const member=membership.data()||{};
 const scope=resolve({auth,member,config:config.exists?config.data()||{}:{},
   tenantId:v.tenantId,activeRole:v.activeRole,country:v.country,collection:'polizas'});
 const collection=dataCollection(db,v.tenantId);
 if(v.mode==='get'){
   const doc=await collection.doc(v.policyId).get();
   if(!doc.exists)throw new Denied('POLICY_NOT_FOUND_OR_DENIED');
   const row=doc.data()||{};
   try{allowRow(scope,row)}catch(e){if(e instanceof Denied)throw new Denied('POLICY_NOT_FOUND_OR_DENIED');throw e;}
   const authorized=[Object.assign({},row,{id:row.id||doc.id,canonicalDocumentId:doc.id})];
   return {ok:true,collection:'polizas',country:v.country,scope:scope.scope,
     rows:await withPolicyBoundDisplayLabels(tenant,authorized,v.tenantId),
     nextCursor:null,serverScoped:true};
 }
 let query=collection.where('pais','==',v.country);
 if(scope.scope==='own')query=query.where('asesorId','==',scope.advisorId);
 if(scope.scope==='team'){
   if(scope.team.length>10)throw new Denied('TEAM_EXCEEDS_AUTHORIZED_QUERY_WINDOW');
   query=query.where('asesorId','in',scope.team);
 }
 query=query.orderBy('__name__');
 if(v.cursor){
   const cursorDoc=await collection.doc(v.cursor).get();
   if(!cursorDoc.exists)throw new Denied('CURSOR_DENIED');
   try{allowRow(scope,cursorDoc.data()||{})}catch(_){throw new Denied('CURSOR_DENIED');}
   query=query.startAfter(cursorDoc);
 }
 const result=await query.limit(v.pageSize+1).get();
 const docs=Array.isArray(result.docs)?result.docs:[];
 // Fail closed on the pagination lookahead too. The next record must not be
 // used as a continuation signal before server-side authorization has passed.
 const verified=docs.map(doc=>{
   const row=doc.data()||{};
   allowRow(scope,row);
   return Object.assign({},row,{id:row.id||doc.id,canonicalDocumentId:doc.id});
 });
 const rows=await withPolicyBoundDisplayLabels(tenant,verified.slice(0,v.pageSize),v.tenantId);
 return {ok:true,collection:'polizas',country:v.country,scope:scope.scope,
   rows,nextCursor:verified.length>v.pageSize&&rows.length?docs[v.pageSize-1].id:null,serverScoped:true};
}
module.exports=Object.freeze({validateArguments,scopedPolicyRead,version:'b4-003-policy-reader-staged-v1'});
