'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const opsSource=source('orbit360-platform/modules/ops.js');
const calendarSource=source('orbit360-platform/modules/cronograma.js');
const backendSource=source('functions/product-ops-leads-domain.js');
const writerSource=source('functions/product-operational-domain.js');
const accessSource=source('orbit360-platform/core/access-scope.js');
const reader=require('../functions/b4-003-scoped-access-boundary');
const routerSource=source('orbit360-platform/core/router.js');
const visualDeps=source('orbit360-platform/core/visual-runtime-rootfix-v20260805.js');
const hydrationSource=source('orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js');

function opsFixture(role='Operativo'){
 const tasks=[
  {id:'qa_gt_pending',pais:'GT',t:'Pendiente de Ops',fecha:'2026-11-12',done:false,asesorId:'advisor-2'},
  {id:'qa_co_pending',pais:'CO',t:'Colombia no disponible en GT',fecha:'2026-11-12',done:false,asesorId:'advisor-2'},
  {id:'qa_gt_done',pais:'GT',t:'Terminada en agenda',fecha:'2026-11-11',done:true,asesorId:'advisor-1'},
  {id:'qa_undefined',t:'No clasificada',fecha:'2026-11-12',done:false,asesorId:'advisor-1'}
 ];
 const clicks={},toggled=[],created=[];
 const host={innerHTML:'',querySelector(selector){return {addEventListener(type,cb){clicks[selector]=cb;},value:'',selectionStart:0};},
  querySelectorAll(selector){if(selector==='[data-ops-task-toggle]')return [{getAttribute(){return'qa_gt_pending';},addEventListener(type,cb){clicks.toggle=cb;}}];return[];}};
 const orbit={route:{key:'ops'},pais:'GT',session:{esAsesor:()=>role==='Asesor'},
  store:{all:c=>c==='tareas'?tasks:[],get:()=>null,on:()=>()=>{}},
  access:{can:(m,a)=>m==='ops'&&a==='view',canView:(coll,row,m)=>m==='ops'&&row.pais==='GT'&&(role!=='Asesor'||row.asesorId==='advisor-1')},
  ciclo:{opsBoard:()=>[],negocios:()=>[],actionQueueRanks:()=>({}),wireCards:()=>{},nuevaGestion:()=>{},nuevoNegocio:()=>{}},
  ui:{esc:v=>String(v||'').replace(/</g,'&lt;').replace(/"/g,'&quot;')},
  kit:{bannerFor:()=>''},modules:{cronograma:{nuevaTarea:()=>{created.push(true);},toggleTarea:id=>{toggled.push(id);}}}};
 const doc={body:{contains:()=>true},addEventListener:()=>{},removeEventListener:()=>{},getElementById:()=>null};
 const context={window:{Orbit:orbit},Orbit:orbit,document:doc,Promise,Set,String,Object,Array,Number};
 vm.runInNewContext(opsSource,context,{filename:'ops.js'});
 orbit.modules.ops.render(host);
 return {host,clicks,tasks,toggled,created,orbit};
}

test('Ops projects only permitted, country-classified durable calendar tasks without duplicating data',()=>{
 assert.match(routerSource,/ops: \['negocios', 'gestiones', 'tareas'/,'route must demand-load protected tasks');
 assert.match(visualDeps,/ops: \['negocios', 'gestiones', 'tareas'/,'visual wrapper must demand-load same tasks');
 assert.match(hydrationSource,/ops: \{ required: \[[^\]]+\], optional: \['negocios', 'gestiones', 'tareas'/,'tasks stay optional, not startup-blocking');
 const x=opsFixture();
 assert.match(x.host.innerHTML,/Tareas de agenda · 2/);
 assert.match(x.host.innerHTML,/Pendiente de Ops|Terminada en agenda/);
 assert.doesNotMatch(x.host.innerHTML,/Colombia no disponible en GT|No clasificada/);
 assert.equal(x.tasks.length,4,'projection must not rewrite or duplicate records');
 x.clicks.toggle();assert.deepEqual(x.toggled,['qa_gt_pending']);
 x.clicks['#op-new-task']();assert.equal(x.created.length,1,'Ops uses the canonical Cronograma task writer');
});

test('Asesor cannot see unrelated tasks or use the Operativo create action',()=>{
 const x=opsFixture('Asesor');
 assert.match(x.host.innerHTML,/Tareas de agenda · 1/);
 assert.doesNotMatch(x.host.innerHTML,/Pendiente de Ops/);
 assert.doesNotMatch(x.host.innerHTML,/id="op-new-task"/);
});

function calendarFixture(country,answers,countries){
 const writes=[],messages=[],clicks={};
 const host={innerHTML:'',querySelector(selector){return{addEventListener(type,cb){clicks[selector]=cb;}};},querySelectorAll(){return[];}};
 const orbit={pais:country,modules:{},auth:{productUser:{countries}},
  access:{can:(key,action)=>key==='ops'&&action==='create'},
  store:{all:()=>[],get:()=>null,insertDurable:(collection,row)=>{writes.push({collection,row});return Promise.resolve(row);}},
  ui:{NOW:new Date('2026-11-12T16:00:00Z'),prompt:async()=>answers.shift(),toast:message=>messages.push(message),esc:v=>String(v||'')},
  kit:{banner:()=>''},q:{renovacionesProximas:()=>[]}};
 vm.runInNewContext(calendarSource,{window:{Orbit:orbit},Orbit:orbit,location:{hostname:'app.aysseguros.com'},Date,Map,Set,String,Number,Array,Object,RegExp,encodeURIComponent}, {filename:'cronograma.js'});
 orbit.modules.cronograma.render(host);
 return{click:clicks['#cr-new'],writes,messages,orbit,host};
}

test('Operativo bilateral creates an Ops task with an explicit country and durable confirmation',async()=>{
 const x=calendarFixture('TODOS',['2026-11-13 Seguimiento comercial','CO'],['GT','CO']);
 await x.click();
 assert.equal(x.writes.length,1);
 assert.equal(x.writes[0].collection,'tareas');
 assert.equal(x.writes[0].row.pais,'CO');
 assert.equal(x.writes[0].row.fecha,'2026-11-13');
 assert.equal(x.writes[0].row.t,'Seguimiento comercial');
 assert.ok(x.messages.some(m=>m.includes('confirmada en el servidor')));
});

test('A multi-country task never silently defaults to GT or crosses a signed country boundary',async()=>{
 const missing=calendarFixture('TODOS',['Tarea sin país',null],['GT','CO']);
 await missing.click();assert.equal(missing.writes.length,0);
 const cross=calendarFixture('CO',['Tarea ajena'],['GT']);
 await cross.click();assert.equal(cross.writes.length,0);
 assert.match(cross.messages.join(' '),/país autorizado/);
});

test('Server policy grants full Ops, Leads and task scope only to signed Operativo with tenant all-scope',()=>{
 const make=(role,collection,requested='own',roleScope='all')=>({
  auth:{uid:'m1',token:{}},member:{uid:'m1',tenantId:'t1',status:'active',roles:[role],countries:['GT'],advisorId:'a1',dataScopes:{default:requested}},
  config:{roleScopes:{Operativo:roleScope},rolePermissions:{Operativo:{ops:{ver:true},leads:{ver:true}}}},
  tenantId:'t1',activeRole:role,country:'GT',collection
 });
 for(const collection of ['negocios','gestiones','tareas']){
  const oper=reader.resolve(make('Operativo',collection));
  assert.equal(oper.scope,'all',collection);
  assert.doesNotThrow(()=>reader.allowRow(oper,{pais:'GT',asesorId:'a2',tenantId:'t1'}));
  assert.throws(()=>reader.allowRow(oper,{pais:'CO',asesorId:'a2',tenantId:'t1'}),e=>e.code==='COUNTRY_DENIED');
  const own=reader.resolve(make('Operativo',collection,'own','own'));
  assert.equal(own.scope,'own');
  assert.throws(()=>reader.allowRow(own,{pais:'GT',asesorId:'a2',tenantId:'t1'}),e=>e.code==='FOREIGN_RECORD_DENIED');
 }
 assert.equal(reader.resolve(make('Asesor','gestiones','own','all')).scope,'own');
 assert.throws(()=>reader.resolve(make('Operativo','tareas','none','all')),e=>e.code==='SCOPE_NONE');
 assert.match(accessSource,/moduleKey === 'ops' \|\| moduleKey === 'leads'/);
 assert.match(writerSource,/\['polizas','cliente360','cobros','ops','leads'\]/);
});

test('Workflow server advisor scope requires a signed Operativo grant; Asesor cannot inherit it',()=>{
 const snippet=backendSource.match(/function scope\(m,domain,activeRole,accessConfig\)[\s\S]*?(?=function collaborationWriteDirection)/);
 assert.ok(snippet,'one canonical backend workflow scope helper');
 const norm=v=>String(v||'').toLowerCase(),text=v=>String(v||'').trim();
 const advisorAllowed=new Function('norm','text','unique',snippet[0]+'\nreturn advisorAllowed;')(norm,text,v=>[...new Set([].concat(v||[]))]);
 const m={advisorId:'a1',dataScopes:{default:'own'},countries:['GT']};
 assert.equal(advisorAllowed(m,'a2','ops','operativo',{roleScopes:{Operativo:'all'}}),true);
 assert.equal(advisorAllowed(m,'a2','leads','operativo',{roleScopes:{Operativo:'all'}}),true);
 assert.equal(advisorAllowed(m,'a2','ops','operativo',{roleScopes:{Operativo:'own'}}),false);
 assert.equal(advisorAllowed(m,'a2','ops','asesor',{roleScopes:{Operativo:'all'}}),false);
 m.dataScopes.modules={ops:'none'};
 assert.equal(advisorAllowed(m,'a2','ops','operativo',{roleScopes:{Operativo:'all'}}),false);
});

test('Ops/Leads server privileged writes honor restricted modules and explicit matrix denial',()=>{
 const snippet=backendSource.match(/function workflowRoleModuleAllowed\([\s\S]*?(?=function canonicalizeCollaborationPayload)/);
 assert.ok(snippet);
 const allowed=new Function('norm','unique','text',snippet[0]+'\nreturn workflowRoleModuleAllowed;')(
  v=>String(v||'').toLowerCase(),v=>[...new Set([].concat(v||[]))],v=>String(v||'').trim());
 const actor={activeRole:'Operativo'};
 const granted={actor,member:{modulesRestricted:[],countries:['GT']},accessConfig:{rolePermissions:{Operativo:{ops:{ver:true,editar:true},leads:{ver:true,editar:true}}}}};
 const gt={pais:'GT'},co={pais:'CO'};
 assert.equal(allowed(granted,'ops',gt),true);
 assert.equal(allowed(granted,'leads',gt),true);
 assert.equal(allowed(granted,'ops',co),false);
 assert.equal(allowed(granted,'ops',{}),false);
 assert.equal(allowed({...granted,member:{modulesRestricted:['ops'],countries:['GT']}},'ops',gt),false);
 assert.equal(allowed({...granted,accessConfig:{rolePermissions:{Operativo:{ops:{ver:true,editar:false}}}}},'ops',gt),false);
 assert.equal(allowed({...granted,accessConfig:{rolePermissions:{Operativo:{leads:{ver:false,editar:true}}}}},'leads',gt),false);
 assert.equal(allowed({...granted,actor:{activeRole:'Asesor'}},'ops',gt),true,'self-service grant remains separately controlled');
});
