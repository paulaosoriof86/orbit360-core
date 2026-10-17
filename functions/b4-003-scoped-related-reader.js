'use strict';
// B4-003 staged protected document-read owner for related operational collections.
// Read-only. Preview-only candidate; NO Firebase export or rule deploy.
const {resolve,allowRow,Denied}=require('./b4-003-scoped-access-boundary');
const collections=new Set(['clientes','vehiculos','recibosEsperados','carteraPrimas','cobros','negocios','gestiones','actividades','metas','cancelaciones','auditoria']);
const workflowCollections=new Set(['negocios','gestiones','actividades']);
const financeCollections=new Set(['vehiculos','recibosEsperados','carteraPrimas','cobros']);
const clean=v=>String(v==null?'':v).trim();
const safeId=(id,label)=>{
 const value=clean(id);
 if(!value||value.length>180||/[\/\u0000-\u001f]/.test(value))throw new Denied(label+'_INVALID');
 return value;
};
function verifiedLinkedClient(ctx,client,policy){
 if(!client)return;
 if(client.tenantId&&client.tenantId!==ctx.tenantId)throw new Denied('RELATION_CLIENT_TENANT_DENIED');
 // B3-003 ACCEPTED: the country of a policy-linked financial record is
 // anchored to the policy, NOT to the client's current domicile.
 // For client-only reads, the actual client country remains compulsory.
 if(!policy){
   const country=clean(client.pais||client.country).toUpperCase();
   if(!country||country!==ctx.country)throw new Denied('RELATION_CLIENT_COUNTRY_DENIED');
 }
 // Ownership for a policy-linked historical item is checked against the policy.
}
function docRef(tenant,collection,id){
 return tenant.collection('data').doc(collection).collection('items').doc(id);
}
// Enforce authorization on the verified canonical parent; historical child
// country/advisor fields are not an independent grant or veto of that scope.
function financialView(ctx,row,policy,client,tenantId,id){
 if(row.tenantId&&row.tenantId!==tenantId)throw new Denied('TENANT_DENIED');
 const parent=policy||client;
 if(!parent)throw new Denied('RELATION_NOT_VERIFIABLE');
 allowRow(ctx,parent);
 const country=clean(parent.pais||parent.country).toUpperCase();
 if(!country||country!==ctx.country)throw new Denied('COUNTRY_DENIED');
 const advisor=clean(parent.asesorId||parent.advisorId||parent.ownerAdvisorId);
 return Object.assign({},row,{id:row.id||id,canonicalDocumentId:id,
   tenantId,pais:country,asesorId:advisor||clean(row.asesorId||row.advisorId||row.ownerAdvisorId)});
}

async function verifiedCancellationView(ctx,tenant,row,id,lookup){
 if(row.tenantId&&row.tenantId!==ctx.tenantId)throw new Denied('TENANT_DENIED');
 const pid=clean(row.polizaId||row.policyId),inputCid=clean(row.clienteId||row.clientId);
 if(!pid&&!inputCid)throw new Denied('CANCELLATION_PARENT_REQUIRED');
 async function parent(kind,key){
  const k=kind+':'+key;
  if(!lookup.has(k))lookup.set(k,docRef(tenant,kind,safeId(key,'RELATION')).get());
  const snap=await lookup.get(k);
  return snap.exists?snap.data()||{}:null;
 }
 const policy=pid?await parent('polizas',pid):null;
 if(pid&&!policy)throw new Denied('RELATION_POLICY_NOT_FOUND');
 const cid=policy?clean(policy.clienteId):inputCid;
 if(!cid||(inputCid&&inputCid!==cid))throw new Denied('RELATION_CLIENT_MISMATCH');
 const client=await parent('clientes',cid);
 if(!client)throw new Denied('RELATION_CLIENT_NOT_FOUND');
 verifiedLinkedClient(ctx,client,policy);
 const canonical=policy||client;
 allowRow(ctx,canonical);
 const country=clean(canonical.pais||canonical.country).toUpperCase();
 if(country!==ctx.country)throw new Denied('COUNTRY_DENIED');
 const advisor=clean(canonical.asesorId||canonical.advisorId||canonical.ownerAdvisorId);
 return Object.assign({},row,{id:row.id||id,canonicalDocumentId:id,
  tenantId:ctx.tenantId,pais:country,asesorId:advisor,clienteId:cid,polizaId:pid||clean(row.polizaId)});
}
function verifiedAuditView(ctx,row,id){
 if(ctx.collection!=='auditoria'||ctx.scope!=='all')throw new Denied('AUDIT_SCOPE_DENIED');
 if(row.tenantId&&row.tenantId!==ctx.tenantId)throw new Denied('TENANT_DENIED');
 const stated=clean(row.pais||row.country).toUpperCase();
 if(stated&&stated!==ctx.country)throw new Denied('COUNTRY_DENIED');
 const scalar=(field,max=240)=>typeof row[field]==='string'?row[field].slice(0,max):'';
 return {id,canonicalDocumentId:id,tenantId:ctx.tenantId,pais:ctx.country,
  fecha:scalar('fecha',64),modulo:scalar('modulo',100),accion:scalar('accion',120),
  fase:scalar('fase',80),usuario:scalar('usuario',120),motivo:scalar('motivo',500)};
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

 const record=snap.data()||{};
 if(collection==='auditoria'||collection==='cancelaciones'){
  let projected;
  try{projected=collection==='auditoria'
   ?verifiedAuditView(ctx,record,documentId)
   :await verifiedCancellationView(ctx,tenant,record,documentId,new Map());}
  catch(e){if(e instanceof Denied)throw new Denied('RECORD_NOT_FOUND_OR_DENIED');throw e;}
  return {ok:true,serverScoped:true,collection,country,scope:ctx.scope,row:projected};
 }
 const row=record,policyId=clean(row.polizaId||row.policyId);
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
 let projected;
 try{
   verifiedLinkedClient(ctx,client,policy);
   if(financeCollections.has(collection))projected=financialView(ctx,row,policy,client,tenantId,documentId);
   else{
     allowRow(ctx,row,policy?[policy]:client?[client]:[]);
     projected=Object.assign({},row,{id:row.id||documentId,canonicalDocumentId:documentId,
       pais:clean(row.pais||row.country||policy?.pais||policy?.country||client?.pais||client?.country),
       tenantId:row.tenantId||tenantId});
   }
 }catch(e){if(e instanceof Denied)throw new Denied('RECORD_NOT_FOUND_OR_DENIED');throw e;}
 return {ok:true,serverScoped:true,collection,country,scope:ctx.scope,row:projected};
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


 if(coll==='auditoria'||coll==='cancelaciones'){
  if(policyId||hasBatch)throw new Denied('POLICY_ANCHOR_UNEXPECTED');
  const MAX_ROWS=500,ss=await target.orderBy('__name__').limit(MAX_ROWS+1).get();
  const docs=Array.isArray(ss.docs)?ss.docs:[];
  if(docs.length>MAX_ROWS)throw new Denied('RESTRICTED_COLLECTION_SCAN_BOUND');
  const verified=[],parentCache=new Map(),batchSize=8;
  for(let i=0;i<docs.length;i+=batchSize){
   const batch=await Promise.all(docs.slice(i,i+batchSize).map(async d=>{
    try{return coll==='auditoria'
     ?verifiedAuditView(ctx,d.data()||{},d.id)
     :await verifiedCancellationView(ctx,tenant,d.data()||{},d.id,parentCache);}
    catch(e){if(e instanceof Denied)return null;throw e;}
   }));
   verified.push(...batch.filter(Boolean));
  }
  const at=cursor?verified.findIndex(r=>r.canonicalDocumentId===cursor):-1;
  if(cursor&&at<0)throw new Denied('CURSOR_DENIED');
  const rows=verified.slice(at+1,at+1+pageSize);
  return {ok:true,serverScoped:true,collection:coll,country,scope:ctx.scope,
   rows,nextCursor:verified.length>at+1+pageSize?
    rows[rows.length-1].canonicalDocumentId:null,
   anchoring:coll==='auditoria'?'administrative_role_tenant_scalar_projection':
    'verified_cancellation_policy_or_client'};
 }

 // B4-003 financial-source parity: page the *child collection* once, not
 // every existing policy.  A requested page is a lookup hint, NEVER authority.
 // Parents and scopes are verified server-side for every returned record.
 // Unlike the earlier Cobros fast path, client-only real receipts are retained.
 if(['vehiculos','recibosEsperados','carteraPrimas','cobros'].includes(coll)&&!policyId&&!hasBatch){
   const MAX_SCANNED=3000,RAW_PAGE=100,PARENT_CONCURRENCY=10;
   const parents=new Map();
   async function verifiedParent(kind,id){
     const key=kind+':'+id;
     if(!parents.has(key))parents.set(key,docRef(tenant,kind,safeId(id,'RELATION')).get()
       .then(s=>s.exists?s.data()||{}:null));
     return parents.get(key);
   }
   async function verifiedEvent(d){
     const row=d.data()||{},pid=clean(row.polizaId||row.policyId),
       inputCid=clean(row.clienteId||row.clientId);
     if(!clean(d.id)||(row.tenantId&&row.tenantId!==tenantId))return null;
     if(!pid&&!inputCid)return null;
     try{
     let policy=null,client=null,linkedCid=inputCid;
     if(pid){
       policy=await verifiedParent('polizas',pid);
       if(!policy)return null;
       linkedCid=clean(policy.clienteId);
       if(!linkedCid||(inputCid&&inputCid!==linkedCid))return null;
     }
     if(linkedCid){
       client=await verifiedParent('clientes',linkedCid);
       if(!client)return null;
     }
     if(!policy&&!client)return null;
     let projected;
     try{
       verifiedLinkedClient(ctx,client,policy);
       projected=financialView(ctx,row,policy,client,tenantId,d.id);
     }catch(e){if(e instanceof Denied)return null;throw e;}
     return Object.assign({},projected,{clienteId:linkedCid,polizaId:pid||clean(row.polizaId)});
     }catch(e){if(e instanceof Denied)return null;throw e;}
   }
   let ordered=target.orderBy('__name__'),scanned=0;
   if(cursor){
     const at=await target.doc(cursor).get();
     if(!at.exists||!await verifiedEvent(at))throw new Denied('CURSOR_DENIED');
     ordered=ordered.startAfter(at);
   }
   const filtered=[];
   while(filtered.length<=pageSize){
     const ss=await ordered.limit(RAW_PAGE).get(),docs=Array.isArray(ss.docs)?ss.docs:[];
     if(!docs.length)break;
     scanned+=docs.length;
     if(scanned>MAX_SCANNED)throw new Denied('FINANCIAL_SCAN_BOUND_EXCEEDED');
     for(let n=0;n<docs.length;n+=PARENT_CONCURRENCY){
       const batch=await Promise.all(docs.slice(n,n+PARENT_CONCURRENCY).map(verifiedEvent));
       filtered.push(...batch.filter(Boolean));
       if(filtered.length>pageSize)break;
     }
     if(filtered.length>pageSize||docs.length<RAW_PAGE)break;
     ordered=target.orderBy('__name__').startAfter(docs[docs.length-1]);
   }
   const rows=filtered.slice(0,pageSize);
   return {ok:true,serverScoped:true,collection:coll,country,scope:ctx.scope,
     rows,nextCursor:filtered.length>pageSize?rows[rows.length-1].canonicalDocumentId:null,
     anchoring:'server_verified_financial_parent_or_direct_client'};
 }

 // Canonical R23 goal projection contract: raw goals have an advisor or are
 // institution-wide. Country may be derived from the explicitly stored currency,
 // never from an unrelated client or team. Return an allowlisted projection.
 if(coll==='metas'){
   if(policyId||hasBatch)throw new Denied('META_POLICY_ANCHOR_UNEXPECTED');
   const MAX_GOALS=150;
   const snap=await target.orderBy('__name__').limit(MAX_GOALS+1).get();
   const docs=Array.isArray(snap.docs)?snap.docs:[];
   if(docs.length>MAX_GOALS)throw new Denied('META_CATALOG_SCAN_BOUND_EXCEEDED');
   const authorized=[];
   for(const d of docs){
     const row=d.data()||{},id=clean(d.id),advisor=clean(row.asesorId||row.advisorId);
     const declared=clean(row.pais||row.country).toUpperCase();
     const fromCurrency=clean(row.moneda).toUpperCase()==='GTQ'?'GT':
       clean(row.moneda).toUpperCase()==='COP'?'CO':'';
     if(declared&&fromCurrency&&declared!==fromCurrency)continue;
     const canonicalCountry=declared||fromCurrency;
     if(!id||canonicalCountry!==country||row.tenantId&&row.tenantId!==tenantId)continue;
     // An unassigned goal is institutional, not personal. It cannot be exposed
     // by an 'own' or 'team' scope, including through client-side cache filtering.
     if(!advisor&&ctx.scope!=='all')continue;
     if(advisor){
       try{allowRow(ctx,{tenantId,pais:country,asesorId:advisor});}
       catch(e){if(e instanceof Denied)continue;throw e;}
     }
     const value=Number(row.valor);
     if(!Number.isFinite(value)||value<0||row.valor===null||row.valor==='')continue;
     authorized.push({id,canonicalDocumentId:id,tenantId,pais:country,
       moneda:clean(row.moneda)||(country==='GT'?'GTQ':'COP'),
       mes:clean(row.mes),periodo:clean(row.periodo),tipo:clean(row.tipo),
       asesorId:advisor,valor:value});
   }
   const index=cursor?authorized.findIndex(x=>x.canonicalDocumentId===cursor):-1;
   if(cursor&&index<0)throw new Denied('CURSOR_DENIED');
   const rows=authorized.slice(index+1,index+1+pageSize);
   const nextCursor=authorized.length>index+1+pageSize?
     rows[rows.length-1].canonicalDocumentId:null;
   return {ok:true,serverScoped:true,collection:coll,country,scope:ctx.scope,
     rows,nextCursor,anchoring:'institutional_only_all_or_explicit_authorized_advisor'};
 }
 // B4_003_LEGACY_WORKFLOW_DERIVED_COUNTRY:
 // For the currently bounded historical Ops/Leads universe, country-less
 // records cannot match an indexed Firestore where('pais','==',country).
 // Resolve ONLY verifiable canonical parent relationships on the server.
 // Do not repair historical records or grant broader permissions.
 if(workflowCollections.has(coll)){
   if(policyId||hasBatch)throw new Denied('POLICY_ANCHOR_UNEXPECTED');
   const MAX_LEGACY_WORKFLOW_ROWS=coll==='actividades'?1000:250;
   const all=await target.orderBy('__name__').limit(MAX_LEGACY_WORKFLOW_ROWS+1).get();
   const docs=Array.isArray(all.docs)?all.docs:[];
   if(docs.length>MAX_LEGACY_WORKFLOW_ROWS)throw new Denied('WORKFLOW_LEGACY_SCAN_BOUND_EXCEEDED');
   async function authorize(d){
     const row=d.data()||{};
     const presentCountry=clean(row.pais||row.country).toUpperCase();
     if(presentCountry&&presentCountry!==country)return null;
     const absentCountry=!presentCountry;
     const absentAdvisor=!clean(row.asesorId||row.advisorId||row.ownerAdvisorId);
     let parent=null;
     if(absentCountry||absentAdvisor){
       const pid=clean(row.polizaId||row.policyId);
       const cid=clean(row.clienteId||row.clientId);
       if(pid){
         const p=await docRef(tenant,'polizas',safeId(pid,'POLICY')).get();
         if(!p.exists)return null;
         const policy=p.data()||{};
         if(cid&&clean(policy.clienteId)&&cid!==clean(policy.clienteId))return null;
         parent=policy;
       }
       if(!parent&&cid){
         const c=await docRef(tenant,'clientes',safeId(cid,'CLIENT')).get();
         if(!c.exists)return null;
         parent=c.data()||{};
       }
     }
     if(absentCountry&&!parent)return null;
     try{allowRow(ctx,row,parent?[parent]:[]);}catch(e){
       if(e instanceof Denied)return null;
       throw e;
     }
     return Object.assign({},row,{
       id:row.id||d.id,canonicalDocumentId:d.id,
       pais:clean(row.pais||row.country||parent?.pais||parent?.country),
       tenantId:row.tenantId||tenantId
     });
   }
   const filtered=[];
   // Prevent uncontrolled parallel reads when 250 historical records need FKs.
   for(let offset=0;offset<docs.length;offset+=10){
     const batch=await Promise.all(docs.slice(offset,offset+10).map(authorize));
     filtered.push(...batch.filter(Boolean));
   }
   const index=cursor?filtered.findIndex(x=>x.canonicalDocumentId===cursor):-1;
   if(cursor&&index<0)throw new Denied('CURSOR_DENIED');
   const rows=filtered.slice(index+1,index+1+pageSize);
   const nextCursor=filtered.length>index+1+pageSize?
     rows[rows.length-1].canonicalDocumentId:null;
   return {ok:true,serverScoped:true,collection:coll,country,scope:ctx.scope,
     rows,nextCursor,anchoring:'verified_server_country_or_canonical_parent'};
 }
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
     try{verifiedLinkedClient(ctx,verifiedClient,verifiedPolicy);allowRow(ctx,verifiedPolicy);}
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
   if(financeCollections.has(coll))
     return financialView(ctx,row,parent,relatedClient,tenantId,documentId);
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
 // A malformed legacy child must not blank the financial picture for all
 // other authorized policies in this batch. Never disclose the excluded row.
 // Keep the positive policy anchors fully validated before reading children.
 const verified=[];let scanned=0,more=true,scan=query;
 const MAX_RAW_SCANNED=1000;
 while(verified.length<=pageSize&&more){
   const result=await scan.limit(100).get(),docs=Array.isArray(result.docs)?result.docs:[];
   more=docs.length===100;
   for(const d of docs){
     if(++scanned>MAX_RAW_SCANNED)throw new Denied('RELATED_SCAN_BOUND_EXCEEDED');
     try{verified.push(checkedRow(d.data()||{},d.id));}
     catch(e){if(!(e instanceof Denied))throw e;}
     if(verified.length>pageSize)break;
   }
   if(more&&verified.length<=pageSize)scan=query.startAfter(docs[docs.length-1]);
 }
 return {ok:true,serverScoped:true,collection:coll,country,scope:ctx.scope,
   rows:verified.slice(0,pageSize),
   nextCursor:verified.length>pageSize?verified[pageSize-1].canonicalDocumentId:null,
   anchoring:coll==='clientes'?'authorized_country_and_advisor_scope':hasBatch?'authorized_policy_batch':'authorized_policy'};
}

module.exports=Object.freeze({readScopedRelatedDocument,readScopedRelatedList,collections,version:'b4-003-related-server-list-stage-v5-goals-scoped'});
