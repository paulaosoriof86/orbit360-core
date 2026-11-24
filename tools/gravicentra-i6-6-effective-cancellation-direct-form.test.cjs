'use strict';
// Synthetic local memory only. Executes the real bridge, premium engine,
// refinements and write facade; never calls a remote service.
// The premium and installment schedule are independently invented, not copied from a customer.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.env.I66_CANCELLATION_SOURCE_ROOT || path.join(__dirname,'..'));
const fallback=path.resolve(process.env.I66_CANCELLATION_BASE_REPO || root);
const clone=x=>JSON.parse(JSON.stringify(x));
const read=p=>fs.readFileSync(fs.existsSync(path.join(root,p))?path.join(root,p):path.join(fallback,p),'utf8');
const attrs=text=>Object.fromEntries([...String(text).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m=>[m[1],m[2]??m[3]??m[4]??'']));
class Element{
  constructor(tag,doc,a={}){this.tagName=tag.toUpperCase();this.doc=doc;this.attrs=a;this.id=a.id||'';this.value=a.value||'';this.style={};this.listeners={};this.nodes=[];this.disabled='disabled'in a;this.textContent='';this.isConnected=true;this.readOnly='readonly'in a;this.checked=false;this.classList={add(){},remove(){}};}
  set innerHTML(s){this.html=String(s);if(this.tagName==='SELECT'){const os=[...this.html.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(m=>({a:attrs(m[1]),t:m[2]}));const o=os.find(x=>'selected'in x.a)||os[0];this.value=o?(o.a.value??o.t):'';return;}this.nodes=[];for(const m of this.html.matchAll(/<(input|select|textarea|button|div|small|label)\b([^>]*)>/g)){const a=attrs(m[2]);if(!Object.keys(a).some(k=>k.startsWith('data-')))continue;const e=new Element(m[1],this.doc,a);if(m[1]==='select')e.innerHTML=this.html.slice(m.index+m[0].length).split('</select>')[0];if(m[1]==='textarea')e.value=this.html.slice(m.index+m[0].length).split('</textarea>')[0];this.nodes.push(e);}}
  get innerHTML(){return this.html||'';}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  querySelectorAll(s){if(s==='input,select')return this.nodes.filter(e=>['INPUT','SELECT'].includes(e.tagName));return this.nodes.filter(e=>e.matches(s));}
  matches(s){return String(s).split(',').some(part=>{const m=part.trim().match(/^\[([:\w-]+)\]$/);return m&&Object.hasOwn(this.attrs,m[1]);});}
  appendChild(e){if(e.id)this.doc.ids.set(e.id,e);return e;}
  addEventListener(n,fn){(this.listeners[n]||=[]).push(fn);}
  async fire(n){for(const fn of this.listeners[n]||[])await fn({target:this,preventDefault(){},stopPropagation(){}});}
  insertAdjacentHTML(_p,h){this.html=(this.html||'')+h;}
  remove(){this.isConnected=false;this.doc.ids.delete(this.id);}
  focus(){} scrollIntoView(){}
}
function harness({role='Operativo',paid=true,facade=false,fail=false,preview=false,readback=true,denyScope=false,restricted=false,concurrent=false,seed=null}={}){
 const doc={ids:new Map(),createElement(t){return new Element(t,this);},getElementById(id){return this.ids.get(id)||null;},addEventListener(){},dispatchEvent(){}};
 doc.head=new Element('head',doc);doc.body=new Element('body',doc);
 const policy={id:'b4003qa_policy_metadata',tenantId:'qa_tenant',clienteId:'b4003qa_client',asesorId:'b4003qa_old_advisor',pais:'GT',moneda:'GTQ',numero:'AUTO-QA-METADATA',aseguradoraId:'b4003qa_insurer',ramo:'AUTOMOVILES',producto:'AUTO',subramo:'AUTO',estado:'Vigente',renovable:true,frecuencia:'Mensual',cuotas:12,vigenciaInicio:'2026-01-12',vigenciaFin:'2027-01-12',primaNeta:1700,primaTotal:2534.57,prima:2534.57,formaPago:'Transferencia',conducto:'Cobro de la aseguradora',fuente:'documento_original_sintetico',__syntheticQa:true};
 const rows=seed?clone(seed):{polizas:[clone(policy)],clientes:[{id:policy.clienteId,nombre:'Cliente QA',pais:'GT',asesorId:policy.asesorId}],aseguradoras:[{id:policy.aseguradoraId,nombre:'Aseguradora QA',pais:'GT',paises:['GT'],vinculada:true}],asesores:[{id:policy.asesorId,nombre:'Anterior',paises:['GT'],shareCom:80},{id:'b4003qa_new_advisor',nombre:'Nuevo',paises:['GT'],shareCom:70}],recibosEsperados:[],carteraPrimas:[],vehiculos:[],cobros:paid?[{id:'b4003qa_paid',polizaId:policy.id,estado:'Pagado',fechaPago:'2026-10-15',monto:211.21}]:[],actividades:[]};
 if(!seed)for(let i=1;i<=12;i++){const r={id:'b4003qa_receipt_'+i,polizaId:policy.id,clienteId:policy.clienteId,asesorId:policy.asesorId,pais:'GT',moneda:'GTQ',secuencia:i,cuota:i+'/12',monto:i===12?211.26:211.21,montoTotal:i===12?211.26:211.21,fechaLimite:'2026-'+String(i).padStart(2,'0')+'-12',estado:'Pendiente',numeroReciboFuente:'QA-'+i};rows.recibosEsperados.push(r);rows.carteraPrimas.push({...r,id:'b4003qa_portfolio_'+i,reciboId:r.id,carteraActiva:true});}
 const batches=[],calls=[],toasts=[];
 const store={get:(c,id)=>(rows[c]||[]).find(r=>r.id===id)||null,all:c=>rows[c]||[],where:(c,f)=>(rows[c]||[]).filter(f),on(){},pref:(_k,d)=>d,async batchDurable(ms,options){if(fail)throw Object.assign(new Error('unavailable'),{code:'unavailable'});batches.push(clone({mutations:ms,options}));for(const m of ms){if(m.action==='insert')(rows[m.collection]||=[]).push(clone({...m.payload,id:m.id}));else Object.assign(store.get(m.collection,m.id),clone(m.payload));}return{ok:true,canonicalReadback:readback};}};
 const access={filter:(_c,x)=>x,canView:()=>!denyScope,can:()=>true,canWrite:()=>true,norm:x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''),currencyFor:()=> 'GTQ',tenantId:()=> 'qa_tenant',activeRole:()=>role,actorAdvisor:()=>({restricciones:restricted?['polizas_editar']:[]}),actorUser:()=>({id:'qa_actor',nombre:'Actor QA'}),audit(){}};
 const Orbit={store,access,modules:{cliente360:{verPoliza(){},render(){}},polizas:{render(){}}},ui:{today:()=> '2026-11-24',esc:x=>String(x??''),money:(n,c)=>c+' '+Number(n).toFixed(2),toast:x=>toasts.push(x)},cat:{ramosDe:()=>['AUTOMOVILES'],subramosDe:()=>['AUTO']},paisCfg:()=>({iva:12,recargoFinanciero:0,gastosEmision:0}),PAISES:[{id:'GT',moneda:'GTQ'}],assignableAdvisorRoster:{list:async()=>rows.asesores.map(a=>({...a,assignable:true,roleEligible:true,activo:true}))}};
 const context=vm.createContext({Orbit,document:doc,location:{hostname:preview?'ays-orbit-360-lab--gi-i65-b4-qa.web.app':'app.aysseguros.com',hash:''},console,Date,Math,setTimeout,clearTimeout,CustomEvent:class{},dispatchEvent(){},addEventListener(){}});context.window=context;
 const load=p=>vm.runInContext(read(p),context,{filename:p});
 if(facade){
  const member={uid:'qa_actor',tenantId:'qa_tenant',roles:[role],activeRole:role,countries:['GT'],productReadOnly:true};Orbit.auth={productUser:member};Orbit.session={rol:()=>role};
  Object.assign(store,{__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false})});
  Orbit.productRuntimeBrowserProvidersP0={browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,initialize:async()=>({auth:{currentUser:{uid:'qa_actor'}}}),async callFunction(name,input,region){
    calls.push(clone({name,input,region}));
    if(fail)throw Object.assign(new Error('unavailable'),{code:'unavailable'});
    if(concurrent)rows.polizas[0].primaTotal=3001.23;
    for(const m of input.mutations){
      if(m.action==='insert')(rows[m.collection]||=[]).push(clone({...m.payload,id:m.id}));
      else Object.assign(store.get(m.collection,m.id),clone(m.payload));
    }
    return{ok:true,canonicalReadback:readback,canonicalReadbackCount:input.mutations.length,
      readback:input.mutations.map(m=>({collection:m.collection,id:m.id,action:m.action,exists:true}))};
   }};
  load('orbit360-platform/data/store-firestore-product-operational-p0.js');Orbit.productOperationalWriteP0.install(store);
 }
 load('orbit360-platform/core/primas.js');load('orbit360-platform/core/policy-receipts-engine.js');load('orbit360-platform/core/policy-receipts-v1199-refinements.js');load('orbit360-platform/modules/policy-receipts-v1199-bridge.js');
 return{Orbit,rows,batches,calls,toasts,doc,policy,context,load,async open(){Orbit.modules.cliente360.registrarCancelacionEfectiva(policy.id);await Promise.resolve();await Promise.resolve();const form=doc.getElementById('policy-v1199');assert.ok(form);return{form,field:n=>form.querySelector('[data-'+n+']')};}};
}

const payload=()=>({fechaCancelacion:'2026-11-20',motivoCancelacion:'Cancelación confirmada por la aseguradora',
 cancelacionDocumentoRef:'drive:qa_documento_cancelacion_emitido',referenciaCancelacion:'QA-CAN-2026-001'});
const options=()=>({issuedConfirmed:true,operationId:'b4003qa_cancel_exact_operation'});
const finance=h=>clone(Object.fromEntries(['recibosEsperados','carteraPrimas','cobros','vehiculos'].map(c=>[c,h.rows[c]])));
const record=(h,p=payload(),o=options())=>h.Orbit.policyReceipts.registerEffectiveCancellation(h.policy.id,p,o);
function fill(field,p=payload()){
 field('cancellation-date').value=p.fechaCancelacion;field('cancellation-reason').value=p.motivoCancelacion;
 field('cancellation-document').value=p.cancelacionDocumentoRef;field('cancellation-reference').value=p.referenciaCancelacion;
 field('cancellation-confirmed').checked=true;
}
function detail(h){
 const host=h.doc.createElement('main');host.id='host';h.doc.ids.set('host',host);
 h.Orbit.route={key:'cliente360',params:{c:h.policy.clienteId,p:h.policy.id}};
 h.Orbit.router={go(route){h.context.location.hash='#/'+route;h.Orbit.modules.cliente360.render(host);}};
 h.load('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js');
 h.Orbit.modules.cliente360.render(host);return host;
}

test('real Operativo engine records exact policy cancellation with one sparse update and one activity; all finance stays byte-identical',async()=>{
 const h=harness(),before=clone(h.rows),r=await record(h);
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.cancellationEffective,true);assert.equal(r.canonicalReadback,true);
 assert.equal(r.atomicServerCommit,true);assert.equal(h.batches.length,1);
 const ms=h.batches[0].mutations;assert.deepEqual(ms.map(m=>m.collection),['polizas','actividades']);
 assert.deepEqual(ms[0].payload,{estado:'Cancelada',...payload()});assert.equal(ms[1].payload.polizaId,h.policy.id);
 assert.match(ms[1].payload.detalle,/2026-11-20/);assert.match(ms[1].payload.detalle,/qa_documento_cancelacion_emitido/);
 assert.equal(h.batches[0].options.policyCancellationOnly,true);
 assert.deepEqual(h.rows.polizas[0],{...before.polizas[0],estado:'Cancelada',...payload()});
 for(const c of ['recibosEsperados','carteraPrimas','cobros','vehiculos'])assert.deepEqual(h.rows[c],before[c]);
 assert.equal(h.rows.polizas.length,1);assert.equal(h.rows.clientes[0].id,before.clientes[0].id);
});

for(const role of ['Dirección','Admin','AdminTenant','SuperAdmin'])test('existing privileged role '+role+' can register the documented cancellation',async()=>{
 const h=harness({role});assert.equal((await record(h)).ok,true);
});
for(const role of ['Asesor','Finanzas','Marketing','Sin rol'])test('role '+role+' cannot invoke the direct operation',async()=>{
 const h=harness({role});assert.equal((await record(h)).errors[0],'permiso_cancelacion_denegado');assert.equal(h.batches.length,0);
});
test('Operativo explicit restriction and policy/client scope denial remain fail-closed before writes',async()=>{
 for(const opt of [{restricted:true},{denyScope:true}]){const h=harness(opt);assert.equal((await record(h)).ok,false);assert.equal(h.batches.length,0);}
});
for(const [name,mutate] of [
 ['missing document',p=>p.cancelacionDocumentoRef=''],['missing reference',p=>p.referenciaCancelacion=''],
 ['missing motive',p=>p.motivoCancelacion=''],['empty date',p=>p.fechaCancelacion=''],
 ['invalid civil date',p=>p.fechaCancelacion='2026-02-30'],['future date',p=>p.fechaCancelacion='2026-11-25'],
 ['wrong policy term',p=>p.fechaCancelacion='2025-11-20'],['hidden premium',p=>p.primaTotal=1],
 ['hidden policy identity',p=>p.clienteId='qa_other']])test(name+' is rejected with no batch write',async()=>{
 const h=harness(),p=payload();mutate(p);assert.equal((await record(h,p)).ok,false);assert.equal(h.batches.length,0);
});
test('effective emission confirmation is explicit and cannot be inferred from role or a document reference',async()=>{
 const h=harness();assert.equal((await record(h,payload(),{})).errors[0],'cancelacion_emision_requerida');assert.equal(h.batches.length,0);
});
test('canonical client, tenant and country mismatch cannot create a cancellation',async()=>{
 for(const mutate of [h=>h.rows.polizas[0].tenantId='qa_other_tenant',h=>h.rows.clientes[0].pais='CO',h=>h.rows.polizas[0].clienteId='missing']){
  const h=harness();mutate(h);assert.equal((await record(h)).errors[0],'cancelacion_identidad_fuera_alcance');assert.equal(h.batches.length,0);
 }
});
test('already recorded exact cancellation is idempotent; conflicting facts are not overwritten',async()=>{
 const h=harness();assert.equal((await record(h)).ok,true);const second=await record(h);
 assert.equal(second.alreadyRecorded,true);assert.equal(second.ok,false,'a cached no-op is not a new canonical server confirmation');assert.equal(h.batches.length,1);
 const changed={...payload(),fechaCancelacion:'2026-11-21'};assert.equal((await record(h,changed)).errors[0],'cancelacion_existente_difiere');assert.equal(h.batches.length,1);
});
test('legacy Cancelada may add absent support without overwriting any known cancellation fact',async()=>{
 const h=harness();h.rows.polizas[0].estado='Cancelada';h.rows.polizas[0].fechaCancelacion=payload().fechaCancelacion;
 assert.equal((await record(h)).ok,true);assert.equal(h.rows.polizas[0].cancelacionDocumentoRef,payload().cancelacionDocumentoRef);
});
test('the generic edit path cannot cancel by status alone and silently regenerate finances',async()=>{
 const h=harness(),before=finance(h),r=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{estado:'Cancelada'},{motivo:'Cambio'});
 assert.equal(r.ok,false);assert.equal(r.errors[0],'cancelacion_usar_ficha_efectiva');assert.equal(h.batches.length,0);assert.deepEqual(finance(h),before);
});
test('cancellation uses no premium normalization even with documentary terms that general preparePolicy would reject',async()=>{
 const h=harness();h.Orbit.primas.breakdown=()=>{throw Error('PREMIUM_NORMALIZATION_FORBIDDEN');};
 h.Orbit.policyReceipts.preparePolicy=()=>{throw Error('PREPARE_POLICY_FORBIDDEN');};
 const before=finance(h);assert.equal((await record(h)).ok,true);assert.deepEqual(finance(h),before);
});
test('real form inherits policy context and leaves cancellation fields editable, with no writes merely from opening',async()=>{
 const h=harness();Object.assign(h.rows.polizas[0],{fechaCancelacion:'2026-11-18',motivoCancelacion:'Dato preliminar',referenciaCancelacion:'BORRADOR',cancelacionDocumentoRef:'drive:qa_preliminary'});
 const {form,field}=await h.open();assert.match(form.innerHTML,/Registrar cancelación efectiva/);
 assert.equal(field('cancellation-policy').value,h.policy.numero);assert.equal(field('cancellation-policy').readOnly,true);
 assert.equal(field('cancellation-date').value,'2026-11-18');assert.equal(field('cancellation-reason').value,'Dato preliminar');
 for(const key of ['date','reason','reference','document']){assert.equal(field('cancellation-'+key).disabled,false);assert.equal(field('cancellation-'+key).readOnly,false);}
 assert.equal(h.batches.length,0);assert.equal(h.calls.length,0);
});
test('actual detail direct button opens canonical form; request button remains the existing Ops path',async()=>{
 const h=harness(),requests=[];h.Orbit.ciclo={solicitarGestion(...args){requests.push(args);}};
 const host=detail(h);const direct=host.querySelector('[data-policy-cancellation-effective]'),request=host.querySelector('[data-policy-cancellation-request]');
 assert.ok(direct);assert.ok(request);await direct.fire('click');assert.ok(h.doc.getElementById('policy-v1199'));assert.equal(requests.length,0);assert.equal(h.batches.length,0);
 await request.fire('click');assert.equal(requests.length,1);assert.equal(requests[0][1],h.policy.id);assert.equal(requests[0][3].tipo,'Solicitud de cancelación');
});
test('Asesor detail offers request but not direct mutation; calling direct form does not manufacture Ops',async()=>{
 const h=harness({role:'Asesor'}),host=detail(h);assert.equal(host.querySelector('[data-policy-cancellation-effective]'),null);
 assert.ok(host.querySelector('[data-policy-cancellation-request]'));h.Orbit.modules.cliente360.registrarCancelacionEfectiva(h.policy.id);
 assert.equal(h.doc.getElementById('policy-v1199'),null);assert.equal(h.batches.length,0);
});
test('real form save, detail refresh and new runtime reopening preserve exact document/date and original finances',async()=>{
 const h=harness(),host=detail(h),before=finance(h),{field}=await h.open();fill(field);await field('save').fire('click');
 assert.equal(h.doc.getElementById('policy-v1199'),null);assert.equal(h.rows.polizas[0].estado,'Cancelada');assert.deepEqual(finance(h),before);
 assert.match(host.innerHTML,/2026-11-20/);assert.match(host.innerHTML,/drive:qa_documento_cancelacion_emitido/);assert.match(h.toasts.join(' '),/Cancelación efectiva registrada/);
 const reloaded=harness({seed:h.rows}),form=await reloaded.open();
 assert.equal(form.field('cancellation-date').value,payload().fechaCancelacion);assert.equal(form.field('cancellation-document').value,payload().cancelacionDocumentoRef);
 assert.deepEqual(finance(reloaded),before);assert.equal(reloaded.batches.length,0);
});
for(const opts of [{fail:true},{readback:false}])test('failed/uncertain canonical confirmation keeps the form open and blocks automatic replay: '+JSON.stringify(opts),async()=>{
 const h=harness(opts),{form,field}=await h.open();fill(field);await field('save').fire('click');
 assert.equal(h.doc.getElementById('policy-v1199'),form);assert.equal(field('save').disabled,true);assert.equal(field('save').textContent,'Verificación requerida');
 assert.equal(h.toasts.length,0);const count=h.batches.length;await field('save').fire('click');assert.equal(h.batches.length,count);
});
test('real write facade sends only cancellation fields; concurrent premium and every payment remain intact',async()=>{
 const h=harness({facade:true,concurrent:true}),before=finance(h),r=await record(h);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,'orbit360ProductOperationalCommand');
 const m=h.calls[0].input.mutations.find(m=>m.collection==='polizas');assert.deepEqual(m.payload,{estado:'Cancelada',...payload()});
 assert.equal(m.expectedBefore,undefined,'does not invent unsupported backend cancellation CAS');assert.equal(h.rows.polizas[0].primaTotal,3001.23);assert.deepEqual(finance(h),before);
});
test('Preview sparse transport keeps existing synthetic marker and does not authorize customer writes',async()=>{
 const h=harness({facade:true,preview:true}),r=await record(h);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(h.calls[0].name,'orbit360ProductOperationalCommandPreview');
 const ms=h.calls[0].input.mutations;assert.deepEqual(ms[0].payload,{estado:'Cancelada',...payload(),__syntheticQa:true});
 assert.match(ms[1].id,/(?:^|_)b4003qa_/);assert.equal(ms[1].payload.__syntheticQa,true);assert.equal(ms.length,2);
 const real=harness({preview:true});real.rows.polizas[0].id='real_customer_policy';real.policy.id='real_customer_policy';
 const {field}=await real.open();fill(field);await field('save').fire('click');assert.equal(real.batches.length,0);assert.match(field('error').textContent,/protege los registros reales/);
});
test('closed facade flag rejects hidden financial fields and unrelated activity before callable',async()=>{
 for(const hidden of [true,false]){const h=harness({facade:true});const p={estado:'Cancelada',...payload()};if(hidden)p.primaTotal=1;
  await assert.rejects(h.Orbit.store.batchDurable([{action:'update',collection:'polizas',id:h.policy.id,payload:p},
   {action:'insert',collection:'actividades',id:'b4003qa_bad',payload:{pais:'GT',clienteId:h.policy.clienteId,polizaId:hidden?h.policy.id:'qa_other'}}],{policyCancellationOnly:true}),/PRODUCT_POLICY_CANCELLATION_PATCH_CONTRACT_INVALID/);
  assert.equal(h.calls.length,0);
 }
});
test('real facade missing server readback never reports a confirmed cancellation',async()=>{
 const h=harness({facade:true,readback:false}),r=await record(h);assert.equal(r.ok,false);assert.equal(r.errors[0],'operacion_atomica_no_confirmada');assert.match(r.error,/CANONICAL_READBACK_REQUIRED/);
});

test('a contradictory legacy cancellation date cannot be silently replaced while filling canonical fields',async()=>{
 const h=harness();h.rows.polizas[0].estado='Cancelada';h.rows.polizas[0].cancellationDate='2026-11-18';
 assert.equal((await record(h)).errors[0],'cancelacion_existente_difiere');assert.equal(h.batches.length,0);
});

const crypto=require('node:crypto');
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
function serverEnv({role='Asesor',scope='propios',countries=['GT'],team=[]}={}){
 const tenant='synthetic-audit',uid='synthetic-user',own='advisor-own',rows=new Map(),writes=[];
 const member={uid,tenantId:tenant,status:'active',active:true,roles:[role],activeRole:role,advisorId:own,countries,dataScopes:{default:scope},teamAdvisorIds:team};
 rows.set(`tenants/${tenant}/members/${uid}`,member);
 rows.set(`tenants/${tenant}/config/access`,{roleScopes:{[role]:scope},rolePermissions:{[role]:{cliente360:{ver:true,editar:true},equipo:{ver:true,editar:true}}}});
 const snapshot=p=>({id:p.split('/').pop(),exists:rows.has(p),data:()=>clone(rows.get(p)||{})});
 class Ref{
  constructor(p,query=false,conditions=[]){this.p=p;this.query=query;this.conditions=conditions;}
  collection(k){return new Ref(this.p+'/'+k,true);}doc(k){return new Ref(this.p+'/'+k);}
  where(...c){return new Ref(this.p,true,[...this.conditions,c]);}limit(){return this;}orderBy(){return this;}
  async get(){if(!this.query)return snapshot(this.p);const docs=[...rows.keys()].filter(p=>p.startsWith(this.p+'/')&&!p.slice(this.p.length+1).includes('/')).map(snapshot).filter(s=>this.conditions.every(([k,op,v])=>op==='=='&&s.data()[k]===v));return{docs,empty:!docs.length};}
 }
 const db={collection:k=>new Ref(k,true),async runTransaction(fn){const pending=[];let written=false;
  const tx={async get(ref){if(written)throw Error('READ_AFTER_WRITE');return ref.get();},set(ref,row,options){written=true;pending.push({p:ref.p,row:clone(row),merge:options?.merge});},delete(ref){written=true;pending.push({p:ref.p,remove:true});}};
  const out=await fn(tx);for(const w of pending){if(w.remove)rows.delete(w.p);else rows.set(w.p,w.merge?{...rows.get(w.p),...w.row}:w.row);writes.push(w);}return out;
 }};
 const cache={};function load(file){const f=path.resolve(fallback,'functions',file.endsWith('.js')?file:file+'.js');if(cache[f])return cache[f].exports;
  const m={exports:{}};cache[f]=m;const req=id=>{if(id.startsWith('.'))return load(id);if(id==='firebase-admin/app')return{getApps:()=>[{}],initializeApp:()=>({})};if(id==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp:()=> 'SYNTHETIC_TIMESTAMP'}};if(id==='firebase-admin/storage')return{getStorage:()=>({})};if(id==='firebase-functions/v2/https')return{HttpsError,onCall:(_o,f)=>f};if(id==='node:crypto')return crypto;throw Error('UNEXPECTED_IMPORT:'+id);};
  vm.runInNewContext(fs.readFileSync(f,'utf8'),{module:m,exports:m.exports,require:req,process:{env:{}},Buffer,console},{filename:f});return m.exports;
 }
 const mod=load('product-operational-domain');const ref=id=>`tenants/${tenant}/data/clientes/items/${id}`;
 const set=(id,advisor='advisor-own',country='GT')=>rows.set(ref(id),{id,tenantId:tenant,pais:country,asesorId:advisor,nombre:'Synthetic original'});
 const request=(mutations,requestId)=>({auth:{uid,token:{email:'synthetic@example.invalid'}},data:{tenantId:tenant,activeRole:role,mutations,...(requestId?{requestId}:{})}});
 const update=(id,payload)=>({collection:'clientes',action:'update',id,payload});
 const execute=(mutations,requestId)=>mod.orbit360ProductOperationalCommand(request(mutations,requestId));
 return{tenant,uid,own,rows,writes,ref,set,request,update,execute,mod};
}

function serverCancellation({country='GT',countries=['GT']}={}){
 const e=serverEnv({role:'Operativo',scope:'todos',countries}),h=harness();
 e.rows.set(`tenants/${e.tenant}/config/access`,{roleScopes:{Operativo:'todos'},rolePermissions:{Operativo:{
  polizas:{ver:true,editar:true},cliente360:{ver:true,editar:true},cobros:{ver:false,editar:false}}}});
 const ref=(c,id)=>`tenants/${e.tenant}/data/${c}/items/${id}`;
 for(const [c,rows] of Object.entries(h.rows))for(const row of rows)e.rows.set(ref(c,row.id),{...clone(row),tenantId:e.tenant,pais:country,asesorId:e.own});
 return {e,h,ref};
}
test('existing server callable accepts Operativo cancellation without Cobros rights, atomically reads back exact facts and preserves finance',async()=>{
 const {e,h,ref}=serverCancellation();assert.equal((await record(h)).ok,true);
 const mutations=clone(h.batches[0].mutations);mutations[1].payload.tenantId=e.tenant;mutations[1].payload.asesorId=e.own;
 const before=[...e.rows.entries()].filter(([k])=>/\/(recibosEsperados|carteraPrimas|cobros|vehiculos)\//.test(k));
 const response=await e.execute(mutations,'b4003qa_cancellation_server');
 assert.equal(response.canonicalReadback,true);assert.equal(response.canonicalReadbackCount,2);
 const actual=e.rows.get(ref('polizas',h.policy.id));for(const [k,v] of Object.entries({estado:'Cancelada',...payload()}))assert.equal(actual[k],v);
 assert.deepEqual([...e.rows.entries()].filter(([k])=>/\/(recibosEsperados|carteraPrimas|cobros|vehiculos)\//.test(k)),before);
 const count=e.writes.length;const replay=await e.execute(mutations,'b4003qa_cancellation_server');assert.equal(replay.reused,true);assert.equal(e.writes.length,count);
});
test('existing server country guard rejects cancellation atomically when policy is outside Operativo country',async()=>{
 const {e,h}=serverCancellation({country:'CO',countries:['GT']});assert.equal((await record(h)).ok,true);
 const mutations=clone(h.batches[0].mutations);mutations[1].payload.tenantId=e.tenant;mutations[1].payload.asesorId=e.own;
 await assert.rejects(e.execute(mutations,'b4003qa_cancellation_country'),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);
});
test('facade cancellation option itself retains privileged role boundary before a callable request',async()=>{
 const h=harness({facade:true,role:'Asesor'});await assert.rejects(h.Orbit.store.batchDurable([
  {action:'update',collection:'polizas',id:h.policy.id,payload:{estado:'Cancelada',...payload()}},
  {action:'insert',collection:'actividades',id:'b4003qa_role',payload:{polizaId:h.policy.id}}
 ],{policyCancellationOnly:true}),/PRODUCT_POLICY_CANCELLATION_ROLE_DENIED/);assert.equal(h.calls.length,0);
});
