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
 :(()=>{throw Error('UNEXPECTED_IMPORT_'+id)})()};
vm.runInNewContext(source,context,{timeout:1000});
const call=(role='Operativo',country='GT')=>context.exports.orbit360AssignableAdvisorRosterPreview({
 auth:{uid},data:{tenantId,activeRole:role,country,month:'2026-10',purpose:'inicio'}});
let checks=0;
const eq=(got,want)=>{assert.equal(got,want);checks++;};
const denied=async fn=>{let error;try{await fn()}catch(e){error=e}
 assert.equal(error&&error.code,'permission-denied');checks++;};
(async()=>{
 let v=await call();eq(v.scope,'team');
 eq(v.rows.map(x=>x.id).join(','),'a1,a3');
 eq(Object.keys(v.globalMetas).length,0);
 v=await call('Asesor');eq(v.scope,'own');eq(v.rows.map(x=>x.id).join(','),'a1');
 eq(Object.keys(v.globalMetas).length,0);
 membership.dataScopes.modules.inicio='todos';access.roleScopes.operativo='all';
 v=await call();eq(v.scope,'all');eq(v.rows.map(x=>x.id).join(','),'a1,a2,a3');eq(v.globalMetas.GT.prima,1200);
 v=await call('Asesor');eq(v.scope,'own');eq(v.rows.map(x=>x.id).join(','),'a1');
 v=await call('Operativo','CO');eq(v.rows.map(x=>x.id).join(','),'a4');
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
