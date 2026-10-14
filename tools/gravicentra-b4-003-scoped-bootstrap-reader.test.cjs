'use strict';
const assert=require('node:assert/strict');
const {readBootstrap,readProtectedDirectory}=require('../functions/b4-003-scoped-bootstrap-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const tenantId='alianzas-soluciones',uid='u-synthetic';
let member={uid,tenantId,email:'qa@example.test',status:'active',
 roles:['Asesor','Operativo'],activeRole:'Asesor',countries:['GT','CO'],
 advisorId:'advisor-a',dataScopes:{default:'propios',modules:{cliente360:'propios',cobros:'equipo',inicio:'ninguno'}},
 roleVisibleAdvisorIds:{Asesor:['advisor-a']},unapprovedPrivateField:'DO_NOT_RETURN'};
const systemConfig={nombre:'Test',legalName:'Example S.A.',unapprovedPrivateField:'DO_NOT_RETURN'};
const snap=value=>({exists:value!=null,data:()=>value});
const db={collection:k=>{assert.equal(k,'tenants');return{doc:tid=>{
 assert.equal(tid,tenantId);
 return{collection:c=>{
  if(c==='members')return{doc:id=>{assert.equal(id,uid);return{get:async()=>snap(member)}}};
  if(c==='system')return{doc:id=>{assert.equal(id,'config');return{get:async()=>snap(systemConfig)}}};
  throw Error('UNEXPECTED_COLLECTION');
 }};}}}};
const call=(mode='bootstrap-membership',changes={})=>readBootstrap({
 db,auth:{uid,token:{email:'qa@example.test'}},request:{tenantId,mode,...changes}
});
async function denied(fn,code){let e;try{await fn()}catch(err){e=err}
 assert.ok(e instanceof Denied,'expected Denied');assert.equal(e.code,code);}
(async()=>{
 let count=0;
 const data=await call();assert.equal(data.membership.uid,uid);count++;
 assert.deepEqual(data.membership.countries,['GT','CO']);count++;
 assert.equal(data.membership.roleVisibleAdvisorIds.Asesor[0],'advisor-a');count++;
 assert.deepEqual(data.membership.dataScopes,{default:'own',modules:{cliente360:'own',cobros:'team',inicio:'none'}});count++;
 assert.equal(JSON.stringify(data).includes('DO_NOT_RETURN'),false);count++;
 const config=await call('bootstrap-tenant-config');assert.equal(config.config.nombre,'Test');count++;
 assert.equal(JSON.stringify(config).includes('DO_NOT_RETURN'),false);count++;
 await denied(()=>call('bootstrap-membership',{uid:'another'}),'IDENTITY_DENIED');count++;
 await denied(()=>call('delete'),'MODE_DENIED');count++;
 member={...member,status:'inactive'};await denied(()=>call(),'MEMBERSHIP_DENIED');count++;
 member={...member,status:'active',estado:'suspended'};await denied(()=>call(),'MEMBERSHIP_DENIED');count++;
 member={...member,estado:'invitado'};await denied(()=>call(),'MEMBERSHIP_DENIED');count++;
 member={...member,estado:'activo',activo:false};await denied(()=>call(),'MEMBERSHIP_DENIED');count++;
 member={...member,activo:true,inactivo:true};await denied(()=>call(),'MEMBERSHIP_DENIED');count++;
 member={...member,inactivo:false,status:undefined,estado:undefined};await denied(()=>call(),'MEMBERSHIP_DENIED');count++;
 member={...member,status:'active',estado:'activo'};const acceptedAliases=await call();assert.equal(acceptedAliases.membership.status,'active');count++;
 member={...member,estado:undefined};

 member={...member,status:'active',activeRole:'Admin'};await denied(()=>call(),'ROLE_DENIED');count++;
 member={...member,activeRole:'Asesor',countries:['MX']};await denied(()=>call(),'COUNTRY_DENIED');count++;
 member={...member,countries:['GT'],email:'other@example.test'};await denied(()=>call(),'EMAIL_DENIED');count++;
 member={...member,email:'qa@example.test',dataScopes:{default:'todos',modules:{cobros:'equipo'}}};
 const all=await call();assert.deepEqual(all.membership.dataScopes,{default:'all',modules:{cobros:'team'}});count++;
 member={...member,dataScopes:{default:'ninguno',modules:{cliente360:'propios'}}};
 const none=await call();assert.deepEqual(none.membership.dataScopes,{default:'none',modules:{cliente360:'own'}});count++;
 member={...member,dataScopes:{default:'unknown',modules:{}}};await denied(()=>call(),'SCOPE_INVALID');count++;
 member={...member,dataScopes:{default:'propios',modules:{cobros:'invalid'}}};await denied(()=>call(),'SCOPE_INVALID');count++;
 member={...member,dataScopes:{default:'propios',modules:{}}};delete member.email;
 const missingEmail=await call();assert.equal(missingEmail.membership.email,'qa@example.test');count++;
 member={...member,dataScopes:{},scopeDatos:'propios'};
 const legacy=await call();assert.deepEqual(legacy.membership.dataScopes,{default:'own',modules:{}});count++;
 member={...member,dataScopes:{},scopeDatos:''};await denied(()=>call(),'SCOPE_DEFAULT_MISSING');count++;

 // Synthetic authenticated directory proof: two actors, country and cursor,
 // secret redaction, no Firestore connection, no writes.
 let dirMember={uid,tenantId,status:'active',roles:['Asesor','Operativo','Admin'],modulesVisible:['equipo'],
  activeRole:'Operativo',advisorId:'a1',countries:['GT','CO'],dataScopes:{default:'all'}};
 const dirConfig={roleScopes:{operativo:'all',asesor:'own',admin:'all'}};
 const directories={
  aseguradoras:[
   {id:'insGT',tenantId,pais:'GT',nombre:'Aseguradora GT',password:'SECRET_TOP',
    portales:[{id:'p1',nombre:'Portal',usuario:'operador',password:'SECRET_PORTAL',credentialRef:'cred_sample'}],
    cuentas:[{banco:'Banco',tipo:'Monetaria',numero:'001122',moneda:'GTQ'}]},
   {id:'insCO',tenantId,pais:'CO',nombre:'Aseguradora CO'}],
  asesores:[
   {id:'a1',tenantId,paises:['GT','CO'],nombre:'Asesora Uno'},
   {id:'a2',tenantId,paises:['GT'],nombre:'Asesor Dos'},
   {id:'a3',tenantId,paises:['CO'],nombre:'Asesor Tres'}]
 };
 class DirectoryReference {
  constructor(parts,cap=301){this.parts=parts;this.cap=cap;}
  collection(name){return new DirectoryReference(this.parts.concat(name),this.cap);}
  doc(name){return new DirectoryReference(this.parts.concat(name),this.cap);}
  orderBy(field){assert.equal(field,'__name__');return this;}
  limit(n){return new DirectoryReference(this.parts,n);}
  async get(){
   const key=this.parts.join('/');
   if(key==='tenants/'+tenantId+'/members/'+uid)return snap(dirMember);
   if(key==='tenants/'+tenantId+'/config/access')return snap(dirConfig);
   for(const coll of ['aseguradoras','asesores']){
    if(key==='tenants/'+tenantId+'/data/'+coll+'/items')
     return{docs:directories[coll].slice(0,this.cap).map(row=>({id:row.id,data:()=>row}))};
   }
   throw Error('UNEXPECTED_DIRECTORY_PATH:'+key);
  }
 }
 const dirs={collection:name=>new DirectoryReference([name])};
 const dir=(collection,country='GT',role='Operativo',extra={})=>readProtectedDirectory({
  db:dirs,auth:{uid,token:{}},request:{tenantId,collection,country,activeRole:role,mode:'list',...extra}
 });
 let directoryChecks=0;
 const gt=await dir('aseguradoras');assert.deepEqual(gt.rows.map(x=>x.id),['insGT']);directoryChecks++;
 assert.equal(gt.rows[0].portales[0].usuario,'operador');directoryChecks++;
 assert.equal(gt.rows[0].portales[0].credentialRef,'cred_sample');directoryChecks++;
 assert.equal(gt.rows[0].cuentas[0].numero,'001122');directoryChecks++;
 assert.equal(JSON.stringify(gt).includes('SECRET_'),false);directoryChecks++;
 await denied(()=>dir('aseguradoras','GT','Asesor'),'DIRECTORY_DENIED');directoryChecks++;
 const one=await dir('asesores','GT','Admin',{pageSize:1});
 assert.deepEqual(one.rows.map(x=>x.id),['a1']);assert.equal(one.nextCursor,'a1');directoryChecks++;
 const two=await dir('asesores','GT','Admin',{pageSize:1,cursor:'a1'});
 assert.deepEqual(two.rows.map(x=>x.id),['a2']);assert.equal(two.nextCursor,null);directoryChecks++;
 await denied(()=>dir('asesores','GT','Asesor'),'TEAM_DIRECTORY_DENIED');directoryChecks++;
 await denied(()=>dir('asesores','GT','Operativo'),'TEAM_DIRECTORY_DENIED');directoryChecks++;
 await denied(()=>dir('asesores','GT','Admin',{cursor:'a3'}),'DIRECTORY_CURSOR_DENIED');directoryChecks++;
 dirMember={...dirMember,modulesVisible:[]};
 await denied(()=>dir('asesores','GT','Admin'),'MODULE_DENIED');directoryChecks++;
 dirMember={...dirMember,modulesVisible:['equipo']};
 const co=await dir('asesores','CO','Admin');assert.deepEqual(co.rows.map(x=>x.id),['a1','a3']);directoryChecks++;
 await denied(()=>dir('aseguradoras','MX'),'DIRECTORY_PAGINATION_DENIED');directoryChecks++;
 dirMember={...dirMember,status:'suspended'};
 await denied(()=>dir('asesores','GT','Admin'),'MEMBERSHIP_DENIED');directoryChecks++;
 dirMember={...dirMember,status:'active'};
 directories.asesores.push({id:'malicious',tenantId:'other-tenant',pais:'GT',nombre:'Denied'});
 await denied(()=>dir('asesores','GT','Admin'),'DIRECTORY_IDENTITY_DENIED');directoryChecks++;
 directories.asesores.pop();
 console.log('B4_003_PROTECTED_DIRECTORIES_SOURCE_QA_PASS checks='+directoryChecks+' synthetic_only no_deploy no_secret_leakage');

 console.log('B4_003_PROTECTED_BOOTSTRAP_SOURCE_QA_PASS checks='+count+' synthetic_only no_deploy');
})().catch(e=>{console.error(e);process.exitCode=1;});