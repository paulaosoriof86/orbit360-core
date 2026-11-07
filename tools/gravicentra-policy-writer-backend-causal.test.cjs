/* Local synthetic-memory QA. Actual access, writer, policy owners and backend execute.
   No remote calls, operational data or browser. No production-owner source is patched.
   Insurer activity projection is an unused throwing stub because insurer mutations are out of scope.
   The exact historical failure is separately evidenced by the independent local audit. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const REPO=path.resolve(__dirname,'..');
const canonical=REPO,ready=REPO;
const paths={
 engineAfter:path.join(REPO,'orbit360-platform/core/policy-receipts-engine.js'),
 form:path.join(REPO,'orbit360-platform/modules/policy-receipts-v1199-bridge.js'),
 refinements:path.join(REPO,'orbit360-platform/core/policy-receipts-v1199-refinements.js'),
 writer:path.join(REPO,'orbit360-platform/data/store-firestore-product-operational-p0.js'),
 backend:path.join(REPO,'functions/product-operational-domain.js'),
 access:path.join(REPO,'orbit360-platform/core/access-scope.js'),
 activeRole:path.join(REPO,'functions/product-active-role-contract.js'),
 participation:path.join(REPO,'functions/goal-participation-contract.js')
};
const source=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,fs.readFileSync(p,'utf8')]));
const pins=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,{path:p,sha256:crypto.createHash('sha256').update(source[k]).digest('hex'),gitBlobSha:crypto.createHash('sha1').update('blob '+Buffer.byteLength(source[k])+'\0').update(source[k]).digest('hex')} ]));
const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
// Minimal DOM fixture for executing the effective form; owners, access, writer and backend below are actual repository sources.
const decode = value => String(value || '').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function attributes(text) {
  const out = {};
  for (const m of String(text).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) out[m[1]] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
}
class Element {
  constructor(tag, doc, attrs = {}) {
    this.tagName = tag.toUpperCase(); this.doc = doc; this.attrs = attrs; this.style = {}; this.dataset = {};
    this.listeners = new Map(); this.children = []; this.nodes = []; this.value = attrs.value || '';
    this.disabled = Object.hasOwn(attrs,'disabled'); this.id = attrs.id || ''; this.textContent = '';
    for (const [k,v] of Object.entries(attrs)) if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())] = v;
  }
  set innerHTML(html) {
    this._html = String(html);
    if (this.tagName === 'SELECT') {
      const options = [...this._html.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(m=>({attrs:attributes(m[1]),text:decode(m[2].replace(/<[^>]+>/g,''))}));
      const chosen = options.find(o=>Object.hasOwn(o.attrs,'selected')) || options[0];
      this.value = chosen ? (Object.hasOwn(chosen.attrs,'value') ? chosen.attrs.value : chosen.text) : '';
      return;
    }
    this.nodes = [];
    for (const m of this._html.matchAll(/<(input|select|textarea|button|div|small|label)\b([^>]*)>/g)) {
      const attrs = attributes(m[2]);
      if (!Object.keys(attrs).some(k=>k.startsWith('data-'))) continue;
      const el = new Element(m[1],this.doc,attrs);
      if (m[1] === 'select') el.innerHTML = this._html.slice(m.index+m[0].length).split('</select>')[0];
      this.nodes.push(el);
    }
  }
  get innerHTML(){ return this._html || ''; }
  querySelector(selector){ return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    if (selector === 'input,select') return this.nodes.filter(x=>['INPUT','SELECT'].includes(x.tagName));
    const m = String(selector).match(/^\[([:\w-]+)\]$/);
    if (m) return this.nodes.filter(x=>Object.hasOwn(x.attrs,m[1]));
    return [];
  }
  appendChild(el){this.children.push(el);if(el.id)this.doc.ids.set(el.id,el);return el;}
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(fn);}
  async fire(name){for(const fn of this.listeners.get(name)||[])await fn({target:this,preventDefault(){},stopPropagation(){}});}
  insertAdjacentHTML(position,html){this._html=(this._html||'')+html;}
  remove(){if(this.id)this.doc.ids.delete(this.id);}
  focus(){this.focused=true;}
  scrollIntoView(){}
}
function harness({configured=true}={}) {
  const doc={ids:new Map(),createElement(tag){return new Element(tag,this);},getElementById(id){return this.ids.get(id)||null;},dispatchEvent(){},addEventListener(){}};
  doc.head=new Element('head',doc);doc.body=new Element('body',doc);
  const rows={
    clientes:[{id:'qa_client',nombre:'Cliente sintético',pais:'GT',asesorId:'qa_advisor'},{id:'qa_client_co',nombre:'Cliente CO',pais:'CO',asesorId:'qa_advisor'}],
    aseguradoras:[{id:'qa_insurer',nombre:'Aseguradora sintética',paises:['GT','CO'],vinculada:true,...(configured?{comisiones:{AUTOMOVILES:10}}:{})}],
    asesores:[{id:'qa_advisor',nombre:'Asesor sintético',comModo:'comision',...(configured?{shareCom:60}:{})}],
    polizas:[],vehiculos:[],recibosEsperados:[],carteraPrimas:[],cobros:[],actividades:[],conciliaciones:[]
  };
  const batches=[],toasts=[];
  const copy=x=>JSON.parse(JSON.stringify(x));
  const store={
    get:(c,id)=>(rows[c]||[]).find(x=>x.id===id)||null,
    all:c=>rows[c]||[],
    where:(c,f)=>(rows[c]||[]).filter(f),
    insert:(c,p)=>{(rows[c] ||= []).push(copy(p));return p;},
    update:(c,id,p)=>{const row=store.get(c,id);if(row)Object.assign(row,copy(p));return row;},
    async batchDurable(mutations,options){
      const next=copy(rows);
      for(const m of mutations) {
        const list=(next[m.collection] ||= []),i=list.findIndex(x=>x.id===m.id);
        if(m.action==='insert'){assert.equal(i,-1,'synthetic duplicate insert');list.push(copy({...m.payload,id:m.id}));}
        else{assert.ok(i>=0,'synthetic missing update');Object.assign(list[i],copy(m.payload));}
      }
      for(const [k,v] of Object.entries(next))rows[k]=v;
      batches.push(copy({mutations,options}));return {ok:true};
    }
  };
  const Orbit={
    store,modules:{cliente360:{verPoliza(){}},polizas:{render(){}}},
    access:{filter:(c,x)=>x,canView:()=>true,norm:x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''),currencyFor:c=>c==='GT'?'GTQ':c==='CO'?'COP':'',tenantId:()=> 'qa_tenant',activeRole:()=> 'Dirección',actorAdvisor:()=>({}),actorUser:()=>({id:'qa_actor',nombre:'Synthetic QA'}),audit(){}},
    ui:{today:()=> '2026-11-07',esc:x=>String(x??''),money:(n,c)=>c+' '+n,toast:x=>toasts.push(x)},
    cat:{ramosDe:()=>['AUTOMOVILES'],subramosDe:()=>['AUTO']},
    paisCfg:c=>({iva:c==='CO'?19:12,recargoFinanciero:0,gastosEmision:0}),
    PAISES:[{id:'GT',moneda:'GTQ'},{id:'CO',moneda:'COP'}]
  };
  const context=vm.createContext({Orbit,document:doc,location:{hostname:'ays-orbit-360-lab.web.app',hash:''},console,Date,Math,setTimeout(){},clearTimeout(){},CustomEvent:class{}});
  context.window=context;
  const load=(base,p)=>vm.runInContext(fs.readFileSync(path.join(base,p),'utf8'),context,{filename:p});
  load(canonical,'orbit360-platform/core/primas.js');
  load(ready,'orbit360-platform/core/policy-receipts-engine.js');
  load(canonical,'orbit360-platform/core/policy-receipts-v1199-refinements.js');
  load(ready,'orbit360-platform/modules/policy-receipts-v1199-bridge.js');
  return{Orbit,rows,batches,doc,toasts,context};
}
function openNew(h) {
  h.Orbit.modules.cliente360.nuevaPoliza('qa_client');
  const form=h.doc.getElementById('policy-v1199');assert.ok(form);
  const field=s=>form.querySelector('[data-'+s+']');
  field('number').value='QA-DOCUMENT-0001';field('product').value='AUTO';
  field('net').value='1000';field('surcharge').value='0';
  field('renewable').value='yes';
  return{form,field};
}
function memoryDb(){
 const data=new Map();let commits=0;
 function snapshot(ref,map=data){const value=map.get(ref.path);return {id:ref.path.split('/').at(-1),exists:value!==undefined,data:()=>copy(value)};}
 class Ref{
  constructor(p,isCollection=false,filters=[]){this.path=p;this.isCollection=isCollection;this.filters=filters;}
  collection(n){return new Ref(this.path+'/'+n,true);}
  doc(n){return new Ref(this.path+'/'+n,false);}
  where(f,op,v){assert.equal(op,'==');return new Ref(this.path,true,this.filters.concat([[f,v]]));}
  limit(n){const r=new Ref(this.path,this.isCollection,this.filters);r.max=n;return r;}
  async get(){if(!this.isCollection)return snapshot(this);const prefix=this.path+'/',docs=[...data].filter(([k,v])=>k.startsWith(prefix)&&!k.slice(prefix.length).includes('/')&&this.filters.every(([f,x])=>v[f]===x)).slice(0,this.max||Infinity).map(([k])=>snapshot(new Ref(k)));return{docs,empty:!docs.length};}
 }
 return {data,get commits(){return commits;},collection:n=>new Ref(n,true),row:(c,id)=>copy(data.get('tenants/qa_tenant/data/'+c+'/items/'+id)),rows:c=>[...data].filter(([k])=>k.startsWith('tenants/qa_tenant/data/'+c+'/items/')).map(([,v])=>copy(v)),async runTransaction(fn){const writes=[];const tx={get:r=>r.get(),set:(r,v,o)=>writes.push({r,v:copy(v),o}),delete:r=>writes.push({r,del:true})};const result=await fn(tx);const next=new Map([...data].map(([k,v])=>[k,copy(v)]));for(const w of writes){if(w.del)next.delete(w.r.path);else next.set(w.r.path,w.o&&w.o.merge?{...next.get(w.r.path),...w.v}:w.v);}data.clear();for(const [k,v]of next)data.set(k,v);commits++;return result;}};
}
function loadBackend(db){
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const exports={},deps={
 'firebase-admin/app':{getApps:()=>[{}],initializeApp:()=>({})},
 'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=> 'SYNTHETIC_SERVER_TIMESTAMP'}},
 'firebase-admin/storage':{getStorage:()=>({})},
 'firebase-functions/v2/https':{HttpsError,onCall:(opts,fn)=>fn},
 './product-active-role-contract':require(paths.activeRole),
 './goal-participation-contract':require(paths.participation),
 './b4-003-scoped-bootstrap-reader':{projectInsurerActivity(){throw new Error('OUT_OF_SCOPE_INSURER_ACTIVITY_DEPENDENCY_CALLED');}}
 };
 const ctx=vm.createContext({exports,module:{exports},require:n=>Object.hasOwn(deps,n)?deps[n]:require(n),process:{env:{}},console,Buffer,Date,Set,Map});
 vm.runInContext(source.backend,ctx,{filename:paths.backend});
 return exports.orbit360ProductOperationalCommand;
}
function integrated({before=false,countries=['GT','CO'],role='Dirección'}={}){
 const h=harness();const db=memoryDb(),calls=[],backend=loadBackend(db),readListeners=[];
 for(const c of h.rows.clientes){c.tenantId='qa_tenant';c.estado=c.estadoOperativo='activo';}
 Object.assign(h.rows.asesores[0],{tenantId:'qa_tenant',pais:'GT',paisDefault:'GT',paises:['GT'],scopeDatos:'todos'});
 for(const [c,rows]of Object.entries(h.rows))for(const row of rows)db.data.set('tenants/qa_tenant/data/'+c+'/items/'+row.id,copy(row));
 const member={uid:'qa_actor',tenantId:'qa_tenant',status:'active',active:true,productReadOnly:true,activeRole:role,roles:[role],countries,advisorId:'qa_advisor',scopeDatos:'todos'};
 db.data.set('tenants/qa_tenant/members/qa_actor',copy(member));
 const store={__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false}),get:(c,id)=>db.row(c,id),all:c=>db.rows(c),where:(c,f)=>db.rows(c).filter(f),on(c,fn){readListeners.push(fn);},pref:(k,d)=>d};
 const hydrate=()=>readListeners.forEach(fn=>fn('*'));
 h.Orbit.store=store;h.Orbit.auth={productUser:member,user:()=>({uid:'qa_actor',nombre:'Synthetic QA',rol:role})};
 h.Orbit.session={rol:()=>role,asesorId:()=> 'qa_advisor',rolesAsignados:()=>[role]};
 h.Orbit.tenant={id:'qa_tenant',get:()=>({tenantId:'qa_tenant'}),isActive:()=>true};
 h.Orbit.ROLES={[role]:{modulos:['cliente360','polizas','cobros','equipo','inicio'],nivel:10}};
 h.Orbit.productRuntimeBrowserProvidersP0={browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,initialize:async()=>({auth:{currentUser:{uid:'qa_actor'}}}),async callFunction(name,data,region){calls.push({name,data:copy(data),region});const result=await backend({auth:{uid:'qa_actor'},data});hydrate();return result;}};
 h.context.dispatchEvent=()=>{};
 const originalAccess=h.Orbit.access;
 vm.runInContext(source.access,h.context,{filename:paths.access});
 Object.assign(originalAccess,h.Orbit.access); // form closure retains its original object; every access method is the actual owner.
 vm.runInContext(source.writer,h.context,{filename:paths.writer});
 h.Orbit.productOperationalWriteP0.install(store);
 vm.runInContext(source.engineAfter,h.context,{filename:paths.engineAfter});
 if(before){const durable=h.Orbit.store.batchDurable;h.Orbit.store.batchDurable=(mutations,options)=>durable(withoutActivityCountry(mutations),options);}
 vm.runInContext(source.refinements,h.context,{filename:paths.refinements});
 // Form was loaded by fixture before the owner swap. Reload it so its captured engine is this exact pinned owner.
 vm.runInContext(source.form,h.context,{filename:paths.form});
 return{...h,db,calls,backend,member,hydrate};
}
function withoutActivityCountry(mutations){return mutations.map(m=>{const next=copy(m);if(next.collection==='actividades'&&next.payload)delete next.payload.pais;return next;});}
function raw(currency='GTQ'){return{id:'qa_policy',tenantId:'qa_tenant',clienteId:'qa_client',asesorId:'qa_advisor',pais:'GT',moneda:currency,aseguradoraId:'qa_insurer',numero:'QA-POLICY-ONE',ramo:'AUTOMOVILES',producto:'AUTO',estado:'Vigente',vigenciaInicio:'2026-11-01',vigenciaFin:'2027-11-01',primaNeta:1000,comAseguradoraPct:10,comVendedorPct:60,cuotas:1,frecuencia:'Contado',renovable:true,ivaPct:12,gastosEmision:0,otros:0,recargoFinPct:0};}
test('unscoped activity payload is rejected by actual access+writer with no remote transport and no partial rows',async()=>{
 const h=integrated({before:true});const r=await h.Orbit.policyReceipts.createPolicy(raw(),{operationId:'qa_before_country'});
 assert.equal(r.ok,false);assert.equal(r.error,'PRODUCT_WRITE_RECORD_SCOPE_DENIED');assert.equal(h.calls.length,0);assert.equal(h.db.commits,0);
 for(const c of ['polizas','recibosEsperados','carteraPrimas','actividades'])assert.equal(h.db.rows(c).length,0);
});
test('unscoped activity payload fails actual backend transaction atomically',async()=>{
 const h=integrated({before:true}),E=h.Orbit.policyReceipts,p=E.preparePolicy(raw(),null,'qa_backend_missing_country');
 const plan=E.buildAtomicWritePlan(p,raw(),null,'qa_backend_missing_country','Synthetic create','Synthetic details');
 await assert.rejects(h.backend({auth:{uid:'qa_actor'},data:{tenantId:'qa_tenant',activeRole:'Dirección',requestId:'qa_backend_missing_country',mutations:withoutActivityCountry(plan.mutations)}}),e=>e.code==='permission-denied'&&e.message.includes('actividades/'));
 assert.equal(h.db.commits,0);for(const c of ['polizas','recibosEsperados','carteraPrimas','actividades'])assert.equal(h.db.rows(c).length,0);
});
test('candidate exact engine commits GT USD through actual access/writer/backend with matched canonical readbacks and no payment',async()=>{
 const h=integrated(),r=await h.Orbit.policyReceipts.createPolicy(raw('USD'),{operationId:'qa_after_country'});
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.atomicServerCommit,true);assert.equal(h.calls.length,1);assert.equal(h.db.commits,1);
 const p=h.db.row('polizas','qa_policy'),a=h.db.rows('actividades'),receipts=h.db.rows('recibosEsperados'),portfolio=h.db.rows('carteraPrimas');
 assert.equal(p.moneda,'USD');assert.equal(p.pais,'GT');assert.equal(p.comAseguradoraPct,10);assert.equal(p.comVendedorPct,60);
 assert.equal(a.length,1);assert.equal(a[0].pais,'GT');assert.equal(a[0].asesorId,'qa_advisor');assert.equal(a[0].clienteId,'qa_client');
 assert.equal(receipts.length,1);assert.equal(receipts[0].moneda,'USD');assert.equal(receipts[0].comAseguradora,100);assert.equal(receipts[0].comVendedor,60);assert.equal(portfolio.length,1);assert.equal(portfolio[0].moneda,'USD');assert.equal(h.db.rows('cobros').length,0);
 assert.deepEqual(Object.fromEntries(['primaNeta','gastosExpedicion','gastosFinanciamiento','impuestosIVA','primaTotal'].map(k=>[k,receipts[0][k]])),{primaNeta:1000,gastosExpedicion:0,gastosFinanciamiento:0,impuestosIVA:120,primaTotal:1120});
 for(const [canonical,legacy] of [['primaNeta','neta'],['gastosExpedicion','gastosEmision'],['gastosFinanciamiento','gastosFinan'],['impuestosIVA','iva'],['primaTotal','montoTotal']])assert.equal(receipts[0][canonical],receipts[0][legacy]);
 const batch=h.calls[0].data;const again=await h.backend({auth:{uid:'qa_actor'},data:batch});assert.equal(again.reused,true);assert.equal(again.canonicalReadback,true);assert.equal(again.canonicalReadbackCount,batch.mutations.length);assert.equal(h.db.rows('polizas').length,1);assert.equal(h.db.rows('recibosEsperados').length,1);
});
test('candidate does not weaken country scope: CO-only signed member cannot create the GT batch',async()=>{
 const h=integrated({countries:['CO']}),r=await h.Orbit.policyReceipts.createPolicy(raw('USD'),{operationId:'qa_denied_scope'});
 assert.equal(r.ok,false);assert.equal(h.calls.length,0);assert.equal(h.db.commits,0);
});
test('actual new form persists explicit currency and commission through the real writer/backend, then preserves edit snapshots',async()=>{
 const h=integrated(),{field}=openNew(h);field('currency').value='USD';await field('save').fire('click');
 assert.equal(h.db.rows('polizas').length,1,field('error').textContent);const p=h.db.rows('polizas')[0];
 assert.equal(p.moneda,'USD');assert.equal(p.comAseguradoraPct,10);assert.equal(p.comVendedorPct,60);
 h.Orbit.modules.cliente360.editarPoliza(p.id);const form=h.doc.getElementById('policy-v1199'),f=k=>form.querySelector('[data-'+k+']');
 assert.equal(f('currency').value,'USD');assert.equal(f('commission-insurer'),null);assert.equal(f('commission-seller'),null);f('reason').value='Synthetic preservation QA';await f('save').fire('click');
 const updated=h.db.row('polizas',p.id);assert.equal(updated.moneda,'USD');assert.equal(updated.comAseguradoraPct,10);assert.equal(updated.comVendedorPct,60);assert.equal(h.db.rows('recibosEsperados').length,1);assert.equal(h.db.rows('cobros').length,0);
});
test('actual form absence and neta/fijo gates prevent any writer/backend request, explicit zero remains accepted',async()=>{
 for(const mode of ['missing','neta','fijo']){
  const h=integrated();const advisor=h.db.row('asesores','qa_advisor');if(mode==='missing')delete advisor.shareCom;else advisor.comModo=mode;h.db.data.set('tenants/qa_tenant/data/asesores/items/qa_advisor',advisor);
  const {field}=openNew(h);if(mode!=='missing')field('commission-seller').value='60';await field('save').fire('click');assert.equal(h.calls.length,0,mode);assert.equal(h.db.commits,0,mode);assert.equal(h.db.rows('polizas').length,0,mode);
 }
 const h=integrated(),{field}=openNew(h);field('commission-insurer').value='0';field('commission-seller').value='0';await field('save').fire('click');assert.equal(h.db.rows('polizas').length,1,field('error').textContent);assert.equal(h.db.rows('recibosEsperados')[0].comVendedor,0);
});
test('receipt due-date correction commits receipt+portfolio+activity together through actual writer/backend without changing amounts or payment facts',async()=>{
 const h=integrated();assert.equal((await h.Orbit.policyReceipts.createPolicy(raw('USD'),{operationId:'qa_receipt_setup'})).ok,true);
 const original=h.db.rows('recibosEsperados')[0],portfolio=h.db.rows('carteraPrimas')[0],beforeCalls=h.calls.length;
 const result=await h.Orbit.policyReceipts.updateReceipt(original.id,{fechaLimite:'2026-11-16'},{motivo:'Fecha contractual documentada en comprobante sintético',operationId:'qa_due_edit'});
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.atomicServerCommit,true);assert.equal(h.calls.length,beforeCalls+1);
 const request=h.calls.at(-1).data;assert.deepEqual(request.mutations.map(m=>m.collection),['recibosEsperados','carteraPrimas','actividades']);
 const after=h.db.row('recibosEsperados',original.id),car=h.db.row('carteraPrimas',portfolio.id),activity=h.db.row('actividades','act_qa_due_edit');
 for(const row of [after,car])for(const k of ['fechaLimite','vence','fechaVencimiento'])assert.equal(row[k],'2026-11-16');
 for(const k of ['primaNeta','montoTotal','moneda','comAseguradora','comVendedor'])assert.equal(after[k],original[k],k);
 assert.equal(car.montoTotal,portfolio.montoTotal);assert.equal(activity.pais,'GT');assert.equal(activity.reciboId,original.id);assert.equal(activity.polizaId,original.polizaId);assert.equal(h.db.rows('cobros').length,0);
 const again=await h.backend({auth:{uid:'qa_actor'},data:request});assert.equal(again.reused,true);assert.equal(again.canonicalReadbackCount,3);assert.equal(h.db.rows('recibosEsperados').length,1);
});
test('unscoped receipt activity payload rejects the due-date correction without partial receipt or portfolio updates',async()=>{
 const h=integrated();assert.equal((await h.Orbit.policyReceipts.createPolicy(raw(),{operationId:'qa_receipt_before_setup'})).ok,true);
 const original=h.db.rows('recibosEsperados')[0],portfolio=h.db.rows('carteraPrimas')[0],beforeCalls=h.calls.length,commits=h.db.commits;
 const durable=h.Orbit.store.batchDurable;h.Orbit.store.batchDurable=(mutations,options)=>durable(withoutActivityCountry(mutations),options);
 const result=await h.Orbit.policyReceipts.updateReceipt(original.id,{fechaLimite:'2026-11-16'},{motivo:'Synthetic original failure',operationId:'qa_due_before'});
 assert.equal(result.ok,false);assert.equal(result.error,'PRODUCT_WRITE_RECORD_SCOPE_DENIED');assert.equal(h.calls.length,beforeCalls);assert.equal(h.db.commits,commits);
 assert.deepEqual(h.db.row('recibosEsperados',original.id),original);assert.deepEqual(h.db.row('carteraPrimas',portfolio.id),portfolio);
});
test('paid, reconciled and reported-payment receipt guards remain closed before any writer request',async()=>{
 for(const lock of [{estado:'Pagado'},{estado:'Conciliado'},{fechaPago:'2026-11-03'},{conciliado:true},{conciliadoPago:true},{estadoOperativo:'pago_reportado'},{fechaPagoReportada:'2026-11-03'},{reportado:'2026-11-03'}]){
  const h=integrated();assert.equal((await h.Orbit.policyReceipts.createPolicy(raw(),{operationId:'qa_paid_setup'})).ok,true);
  const receipt={...h.db.rows('recibosEsperados')[0],...lock};h.db.data.set('tenants/qa_tenant/data/recibosEsperados/items/'+receipt.id,receipt);h.hydrate();const calls=h.calls.length,commits=h.db.commits;
  const result=await h.Orbit.policyReceipts.updateReceipt(receipt.id,{fechaLimite:'2026-11-16'},{motivo:'Synthetic guard verification',operationId:'qa_paid_edit'});
  assert.equal(result.ok,false,JSON.stringify(lock));assert.equal(result.errors[0],'recibo_con_evidencia_pago_protegido');assert.equal(h.calls.length,calls);assert.equal(h.db.commits,commits);assert.deepEqual(h.db.row('recibosEsperados',receipt.id),receipt);
 }
});
test('existing divisa-only USD policy keeps USD through real form edit and backend write',async()=>{
 const h=integrated();assert.equal((await h.Orbit.policyReceipts.createPolicy(raw('USD'),{operationId:'qa_divisa_setup'})).ok,true);
 const original=h.db.row('polizas','qa_policy');delete original.moneda;h.db.data.set('tenants/qa_tenant/data/polizas/items/qa_policy',original);h.hydrate();
 h.Orbit.modules.cliente360.editarPoliza('qa_policy');const form=h.doc.getElementById('policy-v1199'),f=k=>form.querySelector('[data-'+k+']');
 assert.equal(f('currency').value,'USD');f('reason').value='Synthetic alias preservation';await f('save').fire('click');
 const updated=h.db.row('polizas','qa_policy');assert.equal(updated.moneda,'USD');assert.equal(updated.divisa,'USD');assert.equal(updated.primaNeta,1000);assert.equal(updated.comAseguradoraPct,10);assert.equal(updated.comVendedorPct,60);assert.equal(h.db.rows('cobros').length,0);
});
test('missing receipt country is not silently repaired or scope-expanded by the activity country fallback',async()=>{
 const h=integrated();assert.equal((await h.Orbit.policyReceipts.createPolicy(raw(),{operationId:'qa_missing_country_setup'})).ok,true);
 const receipt=h.db.rows('recibosEsperados')[0];delete receipt.pais;h.db.data.set('tenants/qa_tenant/data/recibosEsperados/items/'+receipt.id,receipt);h.hydrate();const calls=h.calls.length;
 const result=await h.Orbit.policyReceipts.updateReceipt(receipt.id,{fechaLimite:'2026-11-16'},{motivo:'Synthetic missing scope guard',operationId:'qa_missing_country_edit'});
 assert.equal(result.ok,false);assert.equal(result.error,'PRODUCT_WRITE_RECORD_SCOPE_DENIED');assert.equal(h.calls.length,calls);
});
test('changing one commission dependency preserves the manually documented value of the other commission',async()=>{
 const h=integrated();
 h.db.data.set('tenants/qa_tenant/data/asesores/items/qa_advisor_other',{id:'qa_advisor_other',nombre:'Second synthetic advisor',pais:'GT',paises:['GT'],paisDefault:'GT',comModo:'comision',shareCom:40});
 h.db.data.set('tenants/qa_tenant/data/aseguradoras/items/qa_insurer_other',{id:'qa_insurer_other',nombre:'Second synthetic insurer',pais:'GT',paises:['GT'],vinculada:true,comisiones:{AUTOMOVILES:15}});
 const {field}=openNew(h);field('commission-insurer').value='22.5';field('advisor').value='qa_advisor_other';await field('advisor').fire('change');
 assert.equal(field('commission-insurer').value,'22.5','changing advisor must preserve unchanged insurer documentary override');assert.equal(field('commission-seller').value,'40');
 field('commission-seller').value='37';field('insurer').value='qa_insurer_other';await field('insurer').fire('change');
 assert.equal(field('commission-insurer').value,'15');assert.equal(field('commission-seller').value,'37','changing insurer must preserve unchanged advisor documentary override');
 await field('save').fire('click');const p=h.db.rows('polizas')[0];assert.ok(p,field('error').textContent);assert.equal(p.comAseguradoraPct,15);assert.equal(p.comVendedorPct,37);assert.equal(h.db.rows('recibosEsperados')[0].comAseguradora,150);assert.equal(h.db.rows('recibosEsperados')[0].comVendedor,55.5);
});
