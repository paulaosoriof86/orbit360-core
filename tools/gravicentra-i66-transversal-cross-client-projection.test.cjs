'use strict';
// I6.6 regression: behavior is a product contract for arbitrary clients,
// tenants, countries and authorized roles, not for named incident examples.
// Unit/source-only: never accesses Firebase, never performs commercial writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root=require('node:path').join(__dirname,'..');
const source=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');
const client=source('orbit360-platform/modules/cliente360.js');
const ops=source('orbit360-platform/modules/ops.js');
const server=source('functions/product-ops-leads-domain.js');
const {resolve,allowRow,Denied}=require('../functions/b4-003-scoped-access-boundary.js');
function section(src,start,end){
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'canonical source section missing: '+start);
 return src.slice(a,b);
}
const clientLogic=[
 section(client,'  function gestionesCliente(cid) {','  function commercialHistorySurfaces() {'),
 section(client,'  function commercialHistorySurfaces() {','  function commercialHistory(cid, saved) {'),
 section(client,'  function commercialHistory(cid, saved) {','  function commercialEventLink(a) {'),
 section(client,'  function actividadesCliente(cid) {','  function tabGestiones(cid) {')
].join('\n');
const compileClient=new Function('dataReadiness','Orbit','q',clientLogic+'\nreturn {gestionesCliente,actividadesCliente};');
const taskLogic=section(ops,'    const taskCanRead=','    const totNeg =');
const compileTask=new Function('Orbit','st',taskLogic+'\nreturn {tasks,shownTasks};');
const clients=Array.from({length:12},(_,i)=>({id:'qa_client_'+i,tenantId:'QA_TENANT',pais:i%2?'CO':'GT'}));
function clientHarness({ready=true,surfaces=['ops','leads']}={}){
 const gestiones=clients.map((c,i)=>({id:'qa_mgmt_'+i,clienteId:c.id,estado:'Pendiente',tipo:'Inspección',creado:'2026-11-19',asesorId:'qa_adv_'+i}));
 const negocios=clients.map((c,i)=>({id:'qa_deal_'+i,clienteId:c.id,creado:'2026-11-18',
  comentarios:[{eventId:'evt_'+i,tipo:'Comentario',texto:'Comentario QA '+i,ts:'2026-11-20'}],
  bitacora:[{eventId:'evt_'+i,campo:'Duplicado',a:'No repetir',ts:'2026-11-20'}]}));
 const saved=clients.map((c,i)=>({id:'qa_activity_'+i,clienteId:c.id,tipo:'sistema',fecha:'2026-11-21',titulo:'Actividad QA '+i}));
 saved.push({id:'qa_mgmt_activity_0',clienteId:clients[0].id,gestionId:gestiones[0].id,fecha:'2026-11-21',titulo:'Gestión guardada'});
 const Orbit={access:{can:(name,action)=>action==='view'&&surfaces.includes(name)},ciclo:{
    gestiones:()=>gestiones,negocios:()=>negocios}};
 const q={actividadesDe:id=>saved.filter(a=>a.clienteId===id)};
 const readiness=()=>ready?'ready':'loading';
 return compileClient(readiness,Orbit,q);
}
test('Cliente 360 projects distinct Ops managements and Leads events for twelve arbitrary customer IDs without cross-customer leakage',()=>{
 const projection=clientHarness();
 for(let i=0;i<clients.length;i++){
  const cid=clients[i].id,activities=projection.actividadesCliente(cid);
  assert.equal(projection.gestionesCliente(cid).length,1,'management must be client-scoped');
  assert.deepEqual(activities.filter(x=>x.gestionId).map(x=>x.gestionId),['qa_mgmt_'+i]);
  assert.deepEqual(activities.filter(x=>x.negocioId).map(x=>x.negocioId),['qa_deal_'+i]);
  assert.ok(activities.some(x=>x.id==='qa_activity_'+i));
  assert.ok(!activities.some(x=>x.gestionId&&x.gestionId!=='qa_mgmt_'+i));
  assert.ok(!activities.some(x=>x.negocioId&&x.negocioId!=='qa_deal_'+i));
 }
});
test('Cliente 360 deduplicates durable Ops activity and cross-surface Leads history, and does not falsely show unread data',()=>{
 const p=clientHarness(),events=p.actividadesCliente(clients[0].id);
 assert.equal(events.filter(x=>x.gestionId==='qa_mgmt_0').length,1);
 assert.equal(events.filter(x=>x.eventId==='evt_0').length,1);
 const noRights=clientHarness({surfaces:[]});
 assert.equal(noRights.actividadesCliente(clients[1].id).filter(x=>x.negocioId).length,0);
 const unread=clientHarness({ready:false});
 assert.deepEqual(unread.gestionesCliente(clients[2].id),[]);
 assert.equal(unread.actividadesCliente(clients[2].id).filter(x=>x.negocioId).length,0);
});
function roleContext(role,country,tenant='QA_TENANT'){
 return{tenantId:tenant,activeRole:role,collection:'gestiones',country,
  auth:{uid:'qa_uid',token:{giActiveRole:role}},
  config:{roleScopes:{Operativo:'all',Direccion:'all',AdminTenant:'all',SuperAdmin:'all',Asesor:'own'},rolePermissions:{}},
  member:{uid:'qa_uid',tenantId:tenant,activeRole:role,roles:[role],status:'active',countries:['GT','CO'],
   asesorId:'qa_own_advisor',dataScopes:{default:'own',modules:{}}}};
}
test('Ops, Leads, Cliente 360, Tasks and Activity honor the same membership/country/role/tenant for multiple clients',()=>{
 const roles=['Operativo','Direccion','AdminTenant','SuperAdmin','Asesor'];
 const collections=['clientes','polizas','negocios','gestiones','tareas','actividades'];
 let checks=0;
 for(const role of roles)for(const country of ['GT','CO'])for(const collection of collections){
  const args=roleContext(role,country);args.collection=collection;
  const ctx=resolve(args),record={tenantId:'QA_TENANT',pais:country,asesorId:'qa_foreign_advisor'};
  assert.equal(ctx.scope,role==='Asesor'?'own':'all');
  if(role==='Asesor')assert.throws(()=>allowRow(ctx,record),Denied);
  else assert.equal(allowRow(ctx,record),true);
  assert.throws(()=>allowRow(ctx,{...record,pais:country==='GT'?'CO':'GT'}),Denied);
  assert.throws(()=>allowRow(ctx,{...record,tenantId:'OTHER_TENANT'}),Denied);
  checks++;
 }
 assert.equal(checks,60);
 const notAssigned=roleContext('Operativo','GT');
 notAssigned.member.roles=['Asesor'];
 assert.throws(()=>resolve(notAssigned),Denied);
});
function taskHarness({role='Operativo',country='GT',showAllTasks=false,q='',fAse='',fAseg=''}={}){
 const all=Array.from({length:15},(_,i)=>({id:'qa_task_'+i,tenantId:'QA_TENANT',
  pais:i<12?'GT':'CO',asesorId:i%2===0?'qa_a':'qa_b',t:'Seguimiento QA '+i,
  fecha:'2026-11-'+String(10+i).padStart(2,'0'),done:false}));
 all.push({id:'qa_task_other_tenant',tenantId:'OTHER_TENANT',pais:'GT',asesorId:'qa_a',t:'No pertenece',fecha:'2026-11-01'});
 const Orbit={access:{can:()=>true,
  canView:(col,row)=>col==='tareas'&&row.tenantId==='QA_TENANT'&&row.pais===country&&
    (role==='Operativo'||row.asesorId==='qa_a')},store:{all:col=>col==='tareas'?all:[]}};
 return compileTask(Orbit,{showAllTasks,q,fAse,fAseg});
}
test('Ops projects all authorized Cronograma tasks beyond first eight without copying them or using a named customer',()=>{
 const op=taskHarness();
 assert.equal(op.tasks.length,12);assert.equal(op.shownTasks.length,8);
 assert.equal(taskHarness({showAllTasks:true}).shownTasks.length,12);
 assert.equal(taskHarness({country:'CO'}).tasks.length,3);
 assert.equal(taskHarness({role:'Asesor'}).tasks.length,6);
 assert.equal(taskHarness({fAse:'qa_b'}).tasks.length,6);
 assert.equal(taskHarness({fAseg:'any_insurer'}).tasks.length,0);
 assert.equal(taskHarness({q:'QA 11'}).tasks.length,1);
});
test('All canonical Ops create_management records create one server-owned Client 360 activity in the same transaction',()=>{
 const creator=server.indexOf("if(['create_management','portal_request'].includes(operation)&&after.clienteId");
 const stored=server.indexOf("tx.set(dataRef(authz.tenantId,'actividades',activityId)",creator);
 const save=server.indexOf("tx.set(entity,after,{merge:true})",creator);
 const readback=server.indexOf("if(['create_management','portal_request'].includes(operation)&&confirmedRow.clienteId");
 assert.ok(creator>0&&stored>creator&&save>stored&&readback>save,
   'confirmed Ops management activity must be persisted and verified by one server owner');
 assert.match(server,/OPS_CLIENT360_ACTIVITY_READBACK_MISSING/);
 assert.match(server,/gestionId:entityId,reclamoId:text\\(after\\.reclamoId,180\\),origen:'ops'/);
});
test('portal_request shares the same durable activity and readback contract for all clients',()=>{
 const portal=source('orbit360-platform/modules/portal.js');
 const first=server.indexOf("if(['create_management','portal_request'].includes(operation)&&after.clienteId&&after.workflowType!=='endorsement_request'")
 const readback=server.indexOf("if(['create_management','portal_request'].includes(operation)&&confirmedRow.clienteId&&confirmedRow.workflowType!=='endorsement_request'")
 assert.ok(first>0&&readback>first);
 assert.ok(server.indexOf("tx.set(dataRef(authz.tenantId,'actividades',activityId)",first)>first);
 assert.ok(!portal.includes("S().insertDurable('actividades'"),'Portal cannot create duplicate activity');
 assert.ok(portal.includes('gestion.actividadCliente360Id'));
});

test('LIVE availability guard follows the current release pointer and exact signed digest, never a historical alias',()=>{
 const guard=source('.github/workflows/gravicentra-release-lock-sync.yml');
 const cp=JSON.parse(source('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'));
 const tr=JSON.parse(source('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'));
 const key=cp.currentExecutionDecisionPointer,live=cp[key],transport=tr.currentPhysicalHostingRelease;
 assert.ok(key&&key.startsWith('i66')&&live,'active Control Plane pointer is mandatory');
 assert.match(guard,/latest_key=cp.get\('currentExecutionDecisionPointer'\)/);
 assert.match(guard,/signed_matches=/);
 assert.doesNotMatch(guard,/latest=cp.get\('i66LatestPhysicalFrontendLive20261120'\)/);
 assert.equal(live.sourceSha,transport.sourceSha);
 assert.equal(live.buildId,transport.buildId);
 assert.equal(live.artifactDigest,transport.artifactDigest);
 assert.equal(live.hostedFilesEachOrigin,224);
});
