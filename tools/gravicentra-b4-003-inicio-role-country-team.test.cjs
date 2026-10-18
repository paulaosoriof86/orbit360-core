'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path='functions/assignable-advisor-roster.js',source=fs.readFileSync(path,'utf8');
const uid='qa-u1',tenantId='synthetic-tenant';
let membership={uid,tenantId,status:'active',roles:['Operativo','Asesor'],
 activeRole:'Operativo',advisorId:'a1',countries:['GT','CO'],teamId:'shared',
 dataScopes:{default:'todos',modules:{inicio:'equipo'}},
 teamAdvisorIds:['a2'],roleVisibleAdvisorIds:{Operativo:['a3'],Asesor:['a1']}};
let access={roleScopes:{operativo:'team',asesor:'all'}};
const advisors=[
{id:'a1',nombre:'Uno',activo:true,paises:['GT'],roles:['Asesor'],teamId:'shared'},
{id:'a2',nombre:'Dos',activo:true,paises:['GT'],roles:['Asesor'],teamId:'shared'},
{id:'a3',nombre:'Tres',activo:true,paises:['GT'],roles:['Asesor'],teamId:'shared'},
{id:'a4',nombre:'Cuatro',activo:true,paises:['CO'],roles:['Asesor'],teamId:'shared'}];
const goals=[
{id:'g1',pais:'GT',mes:'2026-10',tipo:'prima',valor:1200},
{id:'g2',asesorId:'a1',pais:'GT',mes:'2026-10',tipo:'prima',valor:100}];
const snap=val=>({exists:val!=null,data:()=>val});
const docs=rows=>({docs:rows.map(row=>({id:row.id,data:()=>row}))});
const db={collection:c=>{assert.equal(c,'tenants');return{doc:t=>{
 assert.equal(t,tenantId);
 return{collection:k=>{
  if(k==='members')return{doc:id=>{assert.equal(id,uid);return{get:async()=>snap(membership)}}};
  if(k==='config')return{doc:id=>{assert.equal(id,'access');return{get:async()=>snap(access)}}};
  if(k==='data')return{doc:coll=>({collection:i=>{
   assert.equal(i,'items');return{get:async()=>docs(coll==='asesores'?advisors:coll==='metas'?goals:[])};
  }})};
  throw Error('UNEXPECTED_COLLECTION');
 }};}}}};
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const context={exports:{},process:{env:{}},Set,Map,Date,Number,Object,Array,
 require:id=>id==='firebase-admin/app'?{getApps:()=>[],initializeApp:()=>({})}
 :id==='firebase-admin/firestore'?{getFirestore:()=>db}
 :id==='firebase-functions/v2/https'?{HttpsError,onCall:(_opts,fn)=>fn}
 :id==='./product-active-role-contract'?require('../functions/product-active-role-contract')
 :(()=>{throw Error('UNEXPECTED_IMPORT_'+id)})()};
vm.runInNewContext(source,context,{timeout:1000});
const call=(role='Operativo',country='GT')=>context.exports.orbit360AssignableAdvisorRosterPreview({
 auth:{uid},data:{tenantId,activeRole:role,country,month:'2026-10',purpose:'inicio'}});
let checks=0;
const eq=(got,want)=>{assert.equal(got,want);checks++;};
const denied=async fn=>{let error;try{await fn()}catch(e){error=e}
 assert.equal(error&&error.code,'permission-denied');checks++;};
(async()=>{
 let v=await call();eq(v.dashboardContract,'gi-i65-b4-003-executive-read-v1');eq(v.scope,'team');
 eq(v.rows.map(x=>x.id).sort().join(','),'a1,a3');
 eq(Object.keys(v.globalMetas).length,0);
 v=await call('Asesor');eq(v.scope,'own');eq(v.rows.map(x=>x.id).sort().join(','),'a1');
 eq(Object.keys(v.globalMetas).length,0);
 membership.dataScopes.modules.inicio='todos';access.roleScopes.operativo='all';
 v=await call();eq(v.scope,'all');eq(v.rows.map(x=>x.id).sort().join(','),'a1,a2,a3');eq(v.globalMetas.GT.prima,1200);
 v=await call('Asesor');eq(v.scope,'own');eq(v.rows.map(x=>x.id).sort().join(','),'a1');
 v=await call('Operativo','CO');eq(v.rows.map(x=>x.id).sort().join(','),'a4');
 membership.dataScopes.modules.inicio='ninguno';await denied(()=>call());
 membership.dataScopes.modules.inicio='incorrecto';await denied(()=>call());
 membership.dataScopes.modules.inicio='equipo';membership.roleVisibleAdvisorIds.Operativo='bad';
 await denied(()=>call());
 membership.roleVisibleAdvisorIds.Operativo=['a3'];membership.countries=[];
 await denied(()=>call());
 membership.countries=['GT'];await denied(()=>call('Operativo','CO'));
 membership.countries=['GT','CO'];access.rolePermissions={operativo:{inicio:{ver:false}}};
 await denied(()=>call());
 console.log('B4_003_INICIO_ROLE_COUNTRY_TEAM_SERVER_SCOPE_QA_PASS checks='+checks+' synthetic_only_no_writes');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Primary country is verified; a multination advisor is never assigned an arbitrary first-country target.
assert.match(source,/primaryCandidate=claimedPrimary\|\|rosterPrimary/,'VERIFIED_PRIMARY_COUNTRY_REQUIRED');
assert.match(source,/primaryCountry=cc.includes\(primaryCandidate\)/,'PRIMARY_COUNTRY_WITHIN_MEMBERSHIP_COUNTRIES');

 // B4-003 Preview frontend MUST refuse older backend contracts even when
 // they return valid-looking rows. No cache success for stale backend.
(async()=>{
 const client=fs.readFileSync('orbit360-platform/core/assignable-advisor-roster-client.js','utf8');
 let response={ok:true,schemaVersion:'gravicentra-inicio-r23',country:'GT',month:'2026-10',scope:'all',
   rows:[],globalMetas:{},primaryCountry:'GT',ownAdvisorId:''};
 const w={__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{tenantHint:tenantId,scopedReadPreviewCandidate:true},
   addEventListener:()=>{},Orbit:{auth:{productUser:{uid}},session:{rol:()=>'Operativo'},
   productRuntimeBrowserProvidersP0:{callFunction:async()=>response}}};
 // Define the explicit synthetic tenant above; never use deployed identities.
 w.__ORBIT360_PRODUCT_PUBLIC_CONFIG__.tenantHint=tenantId;
 vm.runInNewContext(client,{window:w,Orbit:w.Orbit,location:{hostname:'ays-orbit-360-lab--gi-i65-b4-test.web.app'},Map,Set,Promise,Date,console},{timeout:1000});
 await assert.rejects(w.Orbit.assignableAdvisorRoster.dashboardList('GT','2026-10'),/INICIO_DASHBOARD_PREVIEW_BACKEND_VERSION_MISMATCH/);
 response={...response,dashboardContract:'gi-i65-b4-003-executive-read-v1'};
 const valid=await w.Orbit.assignableAdvisorRoster.dashboardList('GT','2026-10');
 assert.equal(valid.length,0);
 assert.equal(w.Orbit.assignableAdvisorRoster.dashboardPrimaryCountry('GT','2026-10'),'GT');
 console.log('B4_003_INICIO_DASHBOARD_BACKEND_DIGEST_CONTRACT_QA_PASS stale_denied current_allowed synthetic_only');
})().catch(error=>{console.error(error);process.exitCode=1;});
