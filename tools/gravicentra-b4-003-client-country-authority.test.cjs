'use strict';
// Synthetic, tenant-wide country authority. No Firebase credentials or writes.
const assert=require('node:assert/strict');
const {resolveClientCountry,clientCountryNeedsInsurer}=require('../functions/b4-003-client-country-authority');
const {readScopedRelatedDocument,readScopedRelatedList}=require('../functions/b4-003-scoped-related-reader');
const {auditDataset}=require('./gravicentra-b4-003-policy-client-join-audit-readonly.cjs');
const tenantId='tenant-fixture',auth={uid:'u1',token:{}};
const client=(id,pais,advisor='a1',extra={})=>({id,tenantId,asesorId:advisor,...(pais?{pais}:{}),...extra});
const policy=(id,clienteId,pais,aseguradoraId,extra={})=>({id,tenantId,clienteId,pais,aseguradoraId,asesorId:'a1',...extra});
const insurer=(id,pais,extra={})=>({id,tenantId,pais,...extra});
const insurers={asgGT:insurer('asgGT','GT'),asgCO:insurer('asgCO','CO'),asgUnknown:insurer('asgUnknown','REQUIERE_VALIDACION')};
const docs={
 clientes:{
  missingGT:client('missingGT',''),
  missingCO:client('missingCO',''),
  ambiguousCO:client('ambiguousCO','GT','a1',{country:'CO',paisRequiereValidacion:true}),
  explicitGT:client('explicitGT','GT'),
  foreignOwner:client('foreignOwner','','a2'),
  mixed:client('mixed',''),
  unknownInsurer:client('unknownInsurer',''),
  missingInsurer:client('missingInsurer',''),
  mismatch:client('mismatch',''),
  wrongTenant:client('wrongTenant','','a1',{tenantId:'foreign-tenant'}),
  withNoPolicy:client('withNoPolicy',''),
  oversized:client('oversized','')
 },
 polizas:{
  pGT1:policy('pGT1','missingGT','GT','asgGT'),
  pGT2:policy('pGT2','missingGT','GT','asgGT'),
  pCO:policy('pCO','missingCO','CO','asgCO'),
  pAmb:policy('pAmb','ambiguousCO','CO','asgCO'),
  pExplicit:policy('pExplicit','explicitGT','CO','asgCO'),
  pForeign:policy('pForeign','foreignOwner','CO','asgCO',{asesorId:'a2'}),
  pMixGT:policy('pMixGT','mixed','GT','asgGT'),
  pMixCO:policy('pMixCO','mixed','CO','asgCO'),
  pUnknown:policy('pUnknown','unknownInsurer','GT','asgUnknown'),
  pMissing:policy('pMissing','missingInsurer','GT','not-in-directory'),
  pMismatch:policy('pMismatch','mismatch','GT','asgCO'),
  pWrongTenant:policy('pWrongTenant','wrongTenant','GT','asgGT')
 },aseguradoras:insurers
};
for(let i=0;i<101;i++)docs.polizas['pLarge'+i]=policy('pLarge'+i,'oversized','GT','asgGT');
const membership={uid:'u1',tenantId,status:'active',roles:['Operativo','Asesor'],
 advisorId:'a1',countries:['GT','CO'],dataScopes:{default:'own'}};
const config={roleScopes:{Operativo:'all',Asesor:'own'}};
const snap=(v,id)=>({id,exists:v!=null,data:()=>v});
const tableQuery=(table,filters=[],limit=Infinity)=>({
 doc:id=>({get:async()=>snap(docs[table]?.[id],id)}),
 where:(field,op,value)=>tableQuery(table,filters.concat([{field,op,value}]),limit),
 orderBy:field=>{assert.equal(field,'__name__');return tableQuery(table,filters,limit);},
 limit:n=>tableQuery(table,filters,n),
 startAfter:doc=>tableQuery(table,filters,limit),
 get:async()=>({docs:Object.entries(docs[table]||{}).filter(([id,row])=>filters.every(f=>
   f.op==='=='?row[f.field]===f.value:f.op==='in'&&f.value.includes(row[f.field])))
   .slice(0,limit).map(([id,value])=>snap(value,id))})
});
const db={collection:kind=>{assert.equal(kind,'tenants');return{doc:id=>{assert.equal(id,tenantId);return{
 collection:part=>({doc:id=>({
  get:async()=>snap(part==='members'?membership:part==='config'?config:null,id),
  collection:items=>{assert.equal(part,'data');assert.equal(items,'items');return tableQuery(id);}
 })})
};}};}};
const read=(id,country='GT',role='Operativo')=>readScopedRelatedDocument({db,auth,
 request:{tenantId,collection:'clientes',documentId:id,country,activeRole:role}});
const list=(country='GT',role='Operativo')=>readScopedRelatedList({db,auth,
 request:{tenantId,collection:'clientes',country,activeRole:role,pageSize:200}});
const denied=async(run,code='RECORD_NOT_FOUND_OR_DENIED')=>assert.rejects(run,e=>e&&e.code===code);
function derive(c,policies,extra={}){return resolveClientCountry({client:c,clientId:c.id,tenantId,
 policies,insurers:new Map(Object.entries(insurers)),completePolicySet:true,...extra});}
(async()=>{
 let checks=0;
 assert.equal(clientCountryNeedsInsurer(client('m','')),true);checks++;
 assert.equal(clientCountryNeedsInsurer(client('m','GT')),false);checks++;
 assert.equal(derive(client('missingGT',''),[docs.polizas.pGT1,docs.polizas.pGT2]).country,'GT');checks++;
 assert.equal(derive(client('missingCO',''),[docs.polizas.pCO]).source,'insurer');checks++;
 assert.equal(derive(client('explicitGT','GT'),[docs.polizas.pExplicit]).country,'GT',
  'A valid client country is not overwritten by a cross-border insurer');checks++;
 assert.equal(derive(client('ambiguousCO','GT','a1',{country:'CO'}),[docs.polizas.pAmb]).country,'CO');checks++;
 assert.equal(derive(client('mixed',''),[docs.polizas.pMixGT,docs.polizas.pMixCO]).status,'unresolved');checks++;
 assert.equal(derive(client('missingGT',''),[docs.polizas.pGT1],{completePolicySet:false}).status,'unresolved');checks++;
 assert.equal(derive(client('unknownInsurer',''),[docs.polizas.pUnknown]).reason,'INSURER_COUNTRY_UNRESOLVED');checks++;
 assert.equal(derive(client('missingInsurer',''),[docs.polizas.pMissing]).reason,'INSURER_NOT_VERIFIED');checks++;
 assert.equal(derive(client('mismatch',''),[docs.polizas.pMismatch]).reason,'POLICY_INSURER_COUNTRY_CONFLICT');checks++;
 assert.equal(derive(client('missingGT',''),[docs.polizas.pGT1],{tenantId:'foreign-tenant'}).status,'unresolved');checks++;
 assert.equal(derive(client('missingGT',''),[docs.polizas.pGT1],{policies:[{...docs.polizas.pGT1,clienteId:'other'}]}).status,'unresolved');checks++;
 const gt=await read('missingGT','GT');
 assert.equal(gt.row.pais,'GT');assert.equal(gt.row.paisOrigenEfectivo,'aseguradora_verificada');checks++;
 const co=await read('missingCO','CO');assert.equal(co.row.pais,'CO');checks++;
 const amb=await read('ambiguousCO','CO');assert.equal(amb.row.pais,'CO');checks++;
 const explicit=await read('explicitGT','GT');assert.equal(explicit.row.pais,'GT');checks++;
 await denied(()=>read('missingGT','CO'));checks++;
 await denied(()=>read('missingCO','GT'));checks++;
 await denied(()=>read('foreignOwner','CO'));checks++;
 await denied(()=>read('mixed','GT'));checks++;
 await denied(()=>read('mixed','CO'));checks++;
 await denied(()=>read('unknownInsurer','GT'));checks++;
 await denied(()=>read('missingInsurer','GT'));checks++;
 await denied(()=>read('mismatch','GT'));checks++;
 await denied(()=>read('wrongTenant','GT'));checks++;
 await denied(()=>read('withNoPolicy','GT'));checks++;
 await denied(()=>read('oversized','GT'));checks++;
 await denied(()=>read('foreignOwner','CO','Asesor'));checks++;
 // The old indexed list does NOT yet include fallback-only clients. Keep the
 // release gate open instead of declaring this document fix to be a full UI fix.
 const gtList=await list('GT');
 assert.ok(!gtList.rows.some(r=>r.id==='missingGT'));
 assert.equal(gtList.anchoring,'authorized_country_and_advisor_scope');checks++;
 const physical=auditDataset({clients:Object.values(docs.clientes),
  policies:Object.values(docs.polizas),insurers:Object.values(docs.aseguradoras),
  members:[membership],config,tenantId});
 assert.equal(physical.counts.memberships,1);checks++;
 assert.equal(physical.counts.roleCountryContexts,4);checks++;
 assert.ok(physical.clientCountryAuthority.inferred.GT>=2);checks++;
 assert.equal(physical.clientCountryAuthority.unresolved.MULTI_INSURER_COUNTRY_CONFLICT,1);checks++;
 assert.ok(physical.physicalJoin.linkedClientInsurerFallbackEligible>=100);checks++;
 assert.ok(physical.effectiveScopeMatrix.some(m=>m.role==='Operativo'&&m.country==='GT'&&
  m.policyScope==='own'&&m.clientScope==='own'&&m.policyLinks.clientRequiresCountryIndex>0));checks++;
 assert.ok(!JSON.stringify(physical).includes('missingGT')&&!JSON.stringify(physical).includes('u1'),
  'Aggregate-only audit must never export row or user identifiers');checks++;
 assert.equal(physical.writes,0);checks++;
 assert.equal(Object.values(docs.clientes).some(c=>c.pais==='CO'),false);
 console.log('B4_003_CLIENT_COUNTRY_INSURER_AUTHORITY_PASS checks='+checks+
  ' synthetic_only insurer_verification=true explicit_country_preserved=true');
 console.log('B4_003_CLIENT_LIST_COUNTRY_FALLBACK=HOLD physical_join_and_index_not_reconciled');
 console.log('B4_003_PRODUCTION=NO_GO firestore_writes=0 auth_writes=0 rules_writes=0');
})().catch(e=>{console.error(e);process.exitCode=1;});
