'use strict';
// Transversal, synthetic multi-identity regression. No Firebase credentials,
// Firestore writes, or real users are contacted by this test.
const assert=require('node:assert/strict');
const {readScopedRelatedList,readScopedRelatedDocument}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const tenantId='test-tenant';
const client=(id,pais,asesorId,extra={})=>({id,tenantId,asesorId,...(pais?{pais}:{}),...extra});
const policy=(id,clienteId,pais,aseguradoraId,extra={})=>({id,tenantId,clienteId,pais,aseguradoraId,...extra});
const docs={
 clientes:{
  coMissing:client('coMissing','', 'aCO'),
  coAmbiguous:client('coAmbiguous','GT','aCO',{country:'CO',paisRequiereValidacion:true}),
  coExplicit:client('coExplicit','Colombia','aCO'),
  coCountryAlias:client('coCountryAlias','','aCO',{country:'CO'}),
  coPolicyAlias:client('coPolicyAlias','','aCO'),
  coOtherAdvisor:client('coOtherAdvisor','','aOther'),
  gtMissing:client('gtMissing','','aGT'),
  gtExplicit:client('gtExplicit','Guatemala','aGT'),
  crossBorder:client('crossBorder','GT','aCO'),
  mixedInsurers:client('mixedInsurers','','aCO'),
  missingInsurer:client('missingInsurer','','aCO'),
  policyConflict:client('policyConflict','','aCO'),
  clientIdConflict:client('clientIdConflict','','aCO'),
  insurerIdConflict:client('insurerIdConflict','','aCO'),
  foreignInsurer:client('foreignInsurer','','aCO'),
  tooManyPolicies:client('tooManyPolicies','','aCO'),
  noPolicy:client('noPolicy','','aCO'),
  crossTenant:client('crossTenant','CO','aCO',{tenantId:'foreign-tenant'}),
  invalidIdentity:client('other-id','CO','aCO')
 },
 polizas:{
  coP1:policy('coP1','coMissing','CO','coInsurer'),
  coP2:policy('coP2','coMissing','CO','coInsurer'),
  coP3:policy('coP3','coAmbiguous','CO','coInsurer'),
  coP4:policy('coP4','coOtherAdvisor','CO','coInsurer'),
  coP5:{id:'coP5',tenantId,clientId:'coPolicyAlias',pais:'CO',insurerId:'coInsurer'},
  gtP1:policy('gtP1','gtMissing','GT','gtInsurer'),
  borderP:policy('borderP','crossBorder','CO','coInsurer'),
  mixCO:policy('mixCO','mixedInsurers','CO','coInsurer'),
  mixGT:policy('mixGT','mixedInsurers','GT','gtInsurer'),
  unknownP:policy('unknownP','missingInsurer','CO','not-present'),
  conflictingP:policy('conflictingP','policyConflict','GT','coInsurer'),
  conflictedClientId:policy('conflictedClientId','clientIdConflict','CO','coInsurer',{clientId:'other-client'}),
  conflictedInsurerId:policy('conflictedInsurerId','insurerIdConflict','CO','coInsurer',{insurerId:'gtInsurer'}),
  foreignP:policy('foreignP','foreignInsurer','CO','foreignTenantInsurer')
 },
 aseguradoras:{
  coInsurer:{id:'coInsurer',tenantId,pais:'CO'},
  gtInsurer:{id:'gtInsurer',tenantId,pais:'GT'},
  foreignTenantInsurer:{id:'foreignTenantInsurer',tenantId:'foreign-tenant',pais:'CO'}
 }
};
for(let i=0;i<101;i++){
 const id='hundredPlus'+String(i).padStart(3,'0');
 docs.polizas[id]=policy(id,'tooManyPolicies','CO','coInsurer');
}
const members={
 carlos:{uid:'carlos',tenantId,status:'active',roles:['Operativo'],countries:['GT','CO'],dataScopes:{default:'all'},advisorId:'aCO'},
 paula:{uid:'paula',tenantId,status:'active',roles:['Dirección'],countries:['GT','CO'],dataScopes:{default:'all'},advisorId:'aGT'},
 ana:{uid:'ana',tenantId,status:'active',roles:['Asesor'],countries:['GT','CO'],dataScopes:{default:'own'},advisorId:'aCO'},
 guillermo:{uid:'guillermo',tenantId,status:'active',roles:['Asesor'],countries:['GT','CO'],dataScopes:{default:'own'},advisorId:'aGT'},
 marketing:{uid:'marketing',tenantId,status:'active',roles:['Marketing'],countries:['GT','CO'],dataScopes:{default:'team'},advisorId:'aCO'},
 blocked:{uid:'blocked',tenantId,status:'blocked',roles:['Operativo'],countries:['GT','CO'],dataScopes:{default:'all'},advisorId:'aCO'}
};
const config={roleScopes:{operativo:'all',direccion:'all',asesor:'own',marketing:'team'}};
const observed={reads:0,writes:0,limits:[]};
const snap=(value,id)=>({id,exists:value!=null,data:()=>value});
function query(table,terms=[],after='',bound=Infinity){
 return {
  doc:id=>({get:async()=>{observed.reads++;return snap(docs[table]?.[id],id);}}),
  where:(field,op,value)=>query(table,[...terms,{field,op,value}],after,bound),
  orderBy:field=>{assert.equal(field,'__name__');return query(table,terms,after,bound);},
  limit:n=>query(table,terms,after,n),
  startAfter:doc=>query(table,terms,doc.id, bound),
  get:async()=>{
   observed.reads++;observed.limits.push({table,bound});
   const rows=Object.entries(docs[table]||{}).sort(([a],[b])=>a.localeCompare(b))
    .filter(([id,row])=>id>after&&terms.every(t=>t.op==='=='?row[t.field]===t.value:
     t.op==='in'&&t.value.includes(row[t.field])));
   return {docs:rows.slice(0,bound).map(([id,row])=>snap(row,id))};
  }
 };
}
const db={collection:name=>{assert.equal(name,'tenants');return {doc:tenant=>{
 assert.equal(tenant,tenantId);return {collection:kind=>({doc:key=>({
  get:async()=>{observed.reads++;return snap(kind==='members'?members[key]:kind==='config'?config:null,key);},
  collection:items=>{assert.equal(kind,'data');assert.equal(items,'items');return query(key);}
 })})};
}};}};
const list=(uid,role,country,extra={})=>readScopedRelatedList({db,auth:{uid,token:{}},
 request:{tenantId,collection:'clientes',activeRole:role,country,pageSize:200,...extra}});
const doc=(uid,role,country,id)=>readScopedRelatedDocument({db,auth:{uid,token:{}},
 request:{tenantId,collection:'clientes',activeRole:role,country,documentId:id}});
const ids=result=>result.rows.map(c=>c.id);
const denied=async(fn,code)=>assert.rejects(fn,e=>e instanceof Denied&&e.code===code);
(async()=>{
 let checks=0;
 const previous=process.env.GRAVICENTRA_B4_003_CLIENT_LIST_RECONCILE_READONLY;
 try{
  delete process.env.GRAVICENTRA_B4_003_CLIENT_LIST_RECONCILE_READONLY;
  const old=await list('carlos','Operativo','CO');
  assert.deepEqual(ids(old),[],'legacy exact-index list misses Colombia raw label and missing countries');checks++;
  process.env.GRAVICENTRA_B4_003_CLIENT_LIST_RECONCILE_READONLY='true';
  const expected=['coAmbiguous','coCountryAlias','coExplicit','coMissing','coOtherAdvisor','coPolicyAlias'];
  const carlos=await list('carlos','Operativo','CO');
  assert.deepEqual(ids(carlos),expected,'one transversal list reconciles all verified CO clients');checks++;
  assert.equal(carlos.anchoring,'server_verified_explicit_or_complete_insurer_country_and_advisor');checks++;
  assert.ok(carlos.rows.every(row=>row.pais==='CO'&&row.country==='CO'&&row.paisEfectivo==='CO'));checks++;
  assert.equal(carlos.rows.find(c=>c.id==='coMissing').paisOrigenEfectivo,'aseguradora_verificada');checks++;
  assert.equal(carlos.rows.find(c=>c.id==='coExplicit').paisOrigenEfectivo,'cliente_explicito');checks++;
  const paula=await list('paula','Dirección','CO');
  assert.deepEqual(ids(paula),expected,'same catalog result for another independently authorized UID');checks++;
  const ana=await list('ana','Asesor','CO');
  assert.deepEqual(ids(ana),expected.filter(id=>id!=='coOtherAdvisor'),'advisor role never gains another advisor');checks++;
  const guillermo=await list('guillermo','Asesor','CO');
  assert.deepEqual(ids(guillermo),[],'other country advisor does not inherit CO clients');checks++;
  const gt=await list('carlos','Operativo','GT');
  assert.deepEqual(ids(gt),['crossBorder','gtExplicit','gtMissing'],'valid explicit cross-border domicile wins');checks++;
  assert.deepEqual(ids(await list('guillermo','Asesor','GT')),['gtExplicit','gtMissing']);checks++;
  assert.deepEqual(ids(await list('ana','Asesor','GT')),['crossBorder']);checks++;
  const coFirst=await list('carlos','Operativo','CO',{pageSize:2});
  const coSecond=await list('carlos','Operativo','CO',{pageSize:2,cursor:coFirst.nextCursor});
  const coThird=await list('carlos','Operativo','CO',{pageSize:2,cursor:coSecond.nextCursor});
  assert.deepEqual([...ids(coFirst),...ids(coSecond),...ids(coThird)],expected);checks++;
  assert.equal(coThird.nextCursor,null);checks++;
  await denied(()=>list('ana','Asesor','CO',{cursor:'coOtherAdvisor'}),'CURSOR_DENIED');checks++;
  await denied(()=>list('marketing','Marketing','CO'),'MODULE_DENIED');checks++;
  await denied(()=>list('blocked','Operativo','CO'),'MEMBERSHIP_DENIED');checks++;
  await denied(()=>list('ana','Operativo','CO'),'ROLE_DENIED');checks++;
  await denied(()=>readScopedRelatedList({db,auth:{uid:'carlos',token:{giActiveRole:'asesor'}},
   request:{tenantId,collection:'clientes',activeRole:'Operativo',country:'CO'}}),
   'SIGNED_ACTIVE_ROLE_MISMATCH');checks++;
  await denied(()=>doc('ana','Asesor','CO','coOtherAdvisor'),'RECORD_NOT_FOUND_OR_DENIED');checks++;
  assert.equal((await doc('ana','Asesor','CO','coPolicyAlias')).row.pais,'CO',
   'individual read recognizes legacy clientId/insurerId policy aliases');checks++;
  assert.equal((await doc('ana','Asesor','CO','coExplicit')).row.pais,'CO',
   'individual read normalizes valid full country names');checks++;
  await denied(()=>doc('ana','Asesor','CO','mixedInsurers'),'RECORD_NOT_FOUND_OR_DENIED');checks++;
  await denied(()=>doc('ana','Asesor','CO','tooManyPolicies'),'RECORD_NOT_FOUND_OR_DENIED');checks++;
  assert.ok(!ids(carlos).includes('invalidIdentity')&&!ids(carlos).includes('crossTenant')&&
   !ids(carlos).includes('mixedInsurers')&&!ids(carlos).includes('missingInsurer')&&
   !ids(carlos).includes('foreignInsurer')&&!ids(carlos).includes('policyConflict')&&
   !ids(carlos).includes('clientIdConflict')&&!ids(carlos).includes('insurerIdConflict')&&
   !ids(carlos).includes('tooManyPolicies'));
  checks++;
  assert.equal(observed.writes,0);checks++;
  // A catalog overflow must block instead of returning a misleading partial
  // number of clients. This exercises the exact 2500+1 read cap.
  const originals=docs.clientes;
  try{
   docs.clientes=Object.fromEntries(Array.from({length:2501},(_,n)=>{
    const id='large'+String(n).padStart(4,'0');return [id,client(id,'CO','aCO')];
   }));
   await denied(()=>list('carlos','Operativo','CO'),'CLIENT_CATALOG_SCAN_BOUND_EXCEEDED');checks++;
  }finally{docs.clientes=originals;}
 }finally{
  if(previous===undefined)delete process.env.GRAVICENTRA_B4_003_CLIENT_LIST_RECONCILE_READONLY;
  else process.env.GRAVICENTRA_B4_003_CLIENT_LIST_RECONCILE_READONLY=previous;
 }
 console.log('B4_003_TRANSVERSAL_CLIENT_LIST_READONLY_PASS checks='+checks+
  ' synthetic_uids=6 roles=4 countries=2 explicit_and_insurer_fallback=true cross_tenant_advisor_denied=true');
 console.log('B4_003_CLIENT_LIST=SOURCE_PASS_PREVIEW_UNVERIFIED B4_003_PRODUCTION=NO_GO writes=0');
})().catch(e=>{console.error(e);process.exitCode=1;});
