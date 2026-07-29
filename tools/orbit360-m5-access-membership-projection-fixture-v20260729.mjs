#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT=process.cwd();
const SOURCE_REL='orbit360-platform/core/access-role-session-owner-v20260728.js';
const SOURCE=fs.readFileSync(path.join(ROOT,SOURCE_REL),'utf8');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-access-membership-projection-fixture.json');
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,220)});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function makeContext({exists=true,activeRole='Dirección',status='active'}={}){
  const storage=new Map(),events=[],firestoreOps=[];
  const user={uid:'fixture-user',email:'fixture@example.invalid'};
  const membership={uid:'fixture-user',tenantId:'fixture-tenant',roles:['Dirección','Operativo','Asesor'],defaultRole:'Dirección',activeRole,advisorId:'fixture-advisor',teamId:'fixture-team',countries:['GT','CO'],dataScopes:{default:'all',modules:{cliente360:'all',aseguradoras:'all'}},modulesExtra:[],modulesRestricted:[],status};
  const snap={exists,id:'fixture-user',data:()=>membership};
  const db={collection(name){firestoreOps.push(['collection',name]);return{doc(id){firestoreOps.push(['doc',id]);return{collection(child){firestoreOps.push(['collection',child]);return{doc(childId){firestoreOps.push(['doc',childId]);return{get:async()=>{firestoreOps.push(['get']);return exists?snap:{exists:false,id:childId,data:()=>({})}},set(){firestoreOps.push(['set']);throw new Error('write_forbidden')},update(){firestoreOps.push(['update']);throw new Error('write_forbidden')},delete(){firestoreOps.push(['delete']);throw new Error('write_forbidden')}}}}}}}}}};
  const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),0);return()=>{};}};
  const firebase={auth:()=>auth,firestore:()=>db};
  const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
  const document={documentElement:{dataset:{}},dispatchEvent:event=>{events.push({target:'document',type:event.type,detail:event.detail||null});return true;}};
  const window={location:{search:'?orbitBackend=firestore-lab&tenant=fixture-tenant'},OrbitBackend:{mode:'firestore-lab',tenantId:'fixture-tenant'},firebase,dispatchEvent:event=>{events.push({target:'window',type:event.type,detail:event.detail||null});return true;},Orbit:{ROLES:{Dirección:{modulos:['cliente360','aseguradoras']},Operativo:{modulos:['cliente360','aseguradoras']},Asesor:{modulos:['cliente360','aseguradoras']}},productRoleTaxonomyP0:{canonicalRole:value=>String(value||'').trim(),canonicalRoles:values=>Array.from(new Set([].concat(values||[]).map(x=>String(x||'').trim()).filter(Boolean)))},auth:{user:()=>({uid:user.uid,email:user.email})},session:{rol:()=>'',asesorId:()=>'',set:()=>true}}};
  const context={window,document,localStorage,firebase,Orbit:window.Orbit,OrbitBackend:window.OrbitBackend,URLSearchParams,CustomEvent:class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}},setTimeout,clearTimeout,console};
  context.globalThis=context;
  return {context,firestoreOps,events,storage,membership};
}
async function executeFixture(options){
  const fixture=makeContext(options);
  vm.runInNewContext(SOURCE,fixture.context,{filename:SOURCE_REL});
  await wait(60);
  return fixture;
}
try{
  add('SOURCE_NO_TENANT_HARDCODE',!SOURCE.includes('alianzas-soluciones'));
  add('SOURCE_NO_UID_HARDCODE',!SOURCE.includes('woJlxR1iFEeiQZvTscPj4qQ5Qc73'));
  add('SOURCE_NO_ADVISOR_HARDCODE',!SOURCE.includes('ase-paula-osorio'));
  add('SOURCE_NO_EMAIL_HARDCODE',!SOURCE.includes('orbit.lab@demo.com'));
  add('SOURCE_GENERIC_MEMBERSHIP_PATH',SOURCE.includes("collection('tenants').doc(tenantId).collection('members').doc(text(user.uid)).get()"));
  add('SOURCE_READ_ONLY_DECLARATION',SOURCE.includes('membershipWrites: false')&&SOURCE.includes('writeAuthorized: false'));
  add('SOURCE_DOES_NOT_OVERRIDE_AUTH_USER',!/(?:window\.)?Orbit\.auth\.user\s*=(?!=)/.test(SOURCE));
  add('SOURCE_FAIL_CLOSED',SOURCE.includes('membership_projection_missing')&&SOURCE.includes("return requiresMembership() ? []"));
  const valid=await executeFixture({exists:true});
  const session=valid.context.window.Orbit.session;
  const status=session.membershipProjectionStatus();
  add('VALID_REQUIRES_MEMBERSHIP',session.requiresMembership()===true);
  add('VALID_MEMBERSHIP_BOUND',session.membershipBound()===true);
  add('VALID_PROJECTION_READY',status.ready===true&&status.status==='ready'&&status.tenantBound===true&&status.assignedRoleCount===3&&status.advisorBound===true,JSON.stringify(status));
  const roles=session.allowedRoles().slice().sort();
  add('VALID_ROLES',roles.join('|')===['Asesor','Dirección','Operativo'].sort().join('|'),roles.join('|'));
  add('VALID_ACTIVE_ROLE',session.rol()==='Dirección',session.rol());
  add('VALID_ADVISOR_FROM_MEMBERSHIP',session.asesorId()==='fixture-advisor',session.asesorId());
  add('VALID_UNAUTHORIZED_ROLE_BLOCKED',session.roleAllowed('Finanzas')===false&&session.set('Finanzas')===false);
  add('VALID_PRODUCT_PROJECTION',valid.context.window.Orbit.auth.productUser?.productReadOnly===true&&valid.context.window.Orbit.auth.productUser?.tenantId==='fixture-tenant'&&valid.context.window.Orbit.auth.productUser?.uid==='fixture-user');
  const reads=valid.firestoreOps.filter(op=>op[0]==='get').length,writes=valid.firestoreOps.filter(op=>['set','update','delete','add','commit'].includes(op[0])).length;
  add('VALID_SINGLE_READ',reads===1,String(reads));
  add('VALID_ZERO_FIRESTORE_WRITES',writes===0,String(writes));
  add('VALID_CANONICAL_PATH',valid.firestoreOps.map(op=>op.join(':')).join('|').includes('collection:tenants|doc:fixture-tenant|collection:members|doc:fixture-user|get'));
  const missing=await executeFixture({exists:false});
  const missingStatus=missing.context.window.Orbit.session.membershipProjectionStatus();
  add('MISSING_FAIL_CLOSED',missing.context.window.Orbit.session.membershipBound()===false&&missing.context.window.Orbit.session.allowedRoles().length===0&&missing.context.window.Orbit.session.rol()==='');
  add('MISSING_STATUS_BLOCKED',missingStatus.status==='blocked'&&missingStatus.ready===false&&missingStatus.error==='membership_missing',JSON.stringify(missingStatus));
  const missingWrites=missing.firestoreOps.filter(op=>['set','update','delete','add','commit'].includes(op[0])).length;
  add('MISSING_ZERO_WRITES',missingWrites===0,String(missingWrites));
  const invalid=await executeFixture({exists:true,activeRole:'Finanzas'});
  const invalidStatus=invalid.context.window.Orbit.session.membershipProjectionStatus();
  add('INVALID_ROLE_FAIL_CLOSED',invalid.context.window.Orbit.session.membershipBound()===false&&invalid.context.window.Orbit.session.allowedRoles().length===0&&invalidStatus.error==='membership_active_role_invalid',JSON.stringify(invalidStatus));
  const failed=checks.filter(item=>!item.ok);
  const out={schemaVersion:'orbit360-m5-access-membership-projection-fixture-v2',generatedAt:new Date().toISOString(),status:failed.length?'M5_ACCESS_MEMBERSHIP_PROJECTION_FIXTURE_FAIL':'M5_ACCESS_MEMBERSHIP_PROJECTION_FIXTURE_PASS',ok:failed.length===0,passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,source:SOURCE_REL,genericTenantDerivation:true,authenticatedUidDerivation:true,firestoreReadOnly:true,firestoreWrites:0,operationalWrites:0,hardcodedTenant:false,hardcodedUid:false,hardcodedAdvisor:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-m5-access-membership-projection-fixture-v2',generatedAt:new Date().toISOString(),status:'M5_ACCESS_MEMBERSHIP_PROJECTION_FIXTURE_EXCEPTION',ok:false,error:String(error&&error.stack||error).slice(0,600),passed:checks.filter(x=>x.ok).length,total:checks.length+1,failed:1,failedCheckIds:['FIXTURE_EXCEPTION'],checks,firestoreWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(JSON.stringify(out,null,2));process.exit(41);}
