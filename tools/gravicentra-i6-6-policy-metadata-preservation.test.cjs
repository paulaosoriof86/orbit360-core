'use strict';
// Synthetic local memory only. Executes the real bridge, premium engine,
// refinements and write facade; never calls a remote service.
// The premium and installment schedule are independently invented, not copied from a customer.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const clone=x=>JSON.parse(JSON.stringify(x));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const attrs=text=>Object.fromEntries([...String(text).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m=>[m[1],m[2]??m[3]??m[4]??'']));
class Element{
  constructor(tag,doc,a={}){this.tagName=tag.toUpperCase();this.doc=doc;this.attrs=a;this.id=a.id||'';this.value=a.value||'';this.style={};this.listeners={};this.nodes=[];this.disabled='disabled'in a;this.textContent='';this.isConnected=true;}
  set innerHTML(s){this.html=String(s);if(this.tagName==='SELECT'){const os=[...this.html.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(m=>({a:attrs(m[1]),t:m[2]}));const o=os.find(x=>'selected'in x.a)||os[0];this.value=o?(o.a.value??o.t):'';return;}this.nodes=[];for(const m of this.html.matchAll(/<(input|select|textarea|button|div|small|label)\b([^>]*)>/g)){const a=attrs(m[2]);if(!Object.keys(a).some(k=>k.startsWith('data-')))continue;const e=new Element(m[1],this.doc,a);if(m[1]==='select')e.innerHTML=this.html.slice(m.index+m[0].length).split('</select>')[0];this.nodes.push(e);}}
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
function harness({role='Dirección',paid=false,facade=false,fail=false,preview=false}={}){
 const doc={ids:new Map(),createElement(t){return new Element(t,this);},getElementById(id){return this.ids.get(id)||null;},addEventListener(){},dispatchEvent(){}};
 doc.head=new Element('head',doc);doc.body=new Element('body',doc);
 const policy={id:'b4003qa_policy_metadata',tenantId:'qa_tenant',clienteId:'b4003qa_client',asesorId:'b4003qa_old_advisor',pais:'GT',moneda:'GTQ',numero:'AUTO-QA-METADATA',aseguradoraId:'b4003qa_insurer',ramo:'AUTOMOVILES',producto:'AUTO',subramo:'AUTO',estado:'Vigente',renovable:true,frecuencia:'Mensual',cuotas:12,vigenciaInicio:'2026-01-12',vigenciaFin:'2027-01-12',primaNeta:1700,primaTotal:2534.57,prima:2534.57,formaPago:'Transferencia',conducto:'Cobro de la aseguradora',fuente:'documento_original_sintetico',__syntheticQa:true};
 const rows={polizas:[clone(policy)],clientes:[{id:policy.clienteId,nombre:'Cliente QA',pais:'GT',asesorId:policy.asesorId}],aseguradoras:[{id:policy.aseguradoraId,nombre:'Aseguradora QA',pais:'GT',paises:['GT'],vinculada:true}],asesores:[{id:policy.asesorId,nombre:'Anterior',paises:['GT'],shareCom:80},{id:'b4003qa_new_advisor',nombre:'Nuevo',paises:['GT'],shareCom:70}],recibosEsperados:[],carteraPrimas:[],vehiculos:[],cobros:paid?[{id:'b4003qa_paid',polizaId:policy.id,estado:'Pagado',fechaPago:'2026-10-15',monto:211.21}]:[],actividades:[]};
 for(let i=1;i<=12;i++){const r={id:'b4003qa_receipt_'+i,polizaId:policy.id,clienteId:policy.clienteId,asesorId:policy.asesorId,pais:'GT',moneda:'GTQ',secuencia:i,cuota:i+'/12',monto:i===12?211.26:211.21,montoTotal:i===12?211.26:211.21,fechaLimite:'2026-'+String(i).padStart(2,'0')+'-12',estado:'Pendiente',numeroReciboFuente:'QA-'+i};rows.recibosEsperados.push(r);rows.carteraPrimas.push({...r,id:'b4003qa_portfolio_'+i,reciboId:r.id,carteraActiva:true});}
 const batches=[],calls=[],toasts=[];
 const store={get:(c,id)=>(rows[c]||[]).find(r=>r.id===id)||null,all:c=>rows[c]||[],where:(c,f)=>(rows[c]||[]).filter(f),on(){},pref:(_k,d)=>d,async batchDurable(ms,options){if(fail)throw Object.assign(new Error('unavailable'),{code:'unavailable'});batches.push(clone({mutations:ms,options}));for(const m of ms){if(m.action==='insert')(rows[m.collection]||=[]).push(clone({...m.payload,id:m.id}));else Object.assign(store.get(m.collection,m.id),clone(m.payload));}return{ok:true,canonicalReadback:true};}};
 const access={filter:(_c,x)=>x,canView:()=>true,can:()=>true,canWrite:()=>true,norm:x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''),currencyFor:()=> 'GTQ',tenantId:()=> 'qa_tenant',activeRole:()=>role,actorAdvisor:()=>({}),actorUser:()=>({id:'qa_actor',nombre:'Actor QA'}),audit(){}};
 const Orbit={store,access,modules:{cliente360:{verPoliza(){}},polizas:{render(){}}},ui:{today:()=> '2026-11-15',esc:x=>String(x??''),money:(n,c)=>c+' '+Number(n).toFixed(2),toast:x=>toasts.push(x)},cat:{ramosDe:()=>['AUTOMOVILES'],subramosDe:()=>['AUTO']},paisCfg:()=>({iva:12,recargoFinanciero:0,gastosEmision:0}),PAISES:[{id:'GT',moneda:'GTQ'}],assignableAdvisorRoster:{list:async()=>rows.asesores.map(a=>({...a,assignable:true,roleEligible:true,activo:true}))}};
 const context=vm.createContext({Orbit,document:doc,location:{hostname:preview?'ays-orbit-360-lab--gi-i65-b4-qa.web.app':'app.aysseguros.com',hash:''},console,Date,Math,setTimeout,clearTimeout,CustomEvent:class{},dispatchEvent(){}});context.window=context;
 const load=p=>vm.runInContext(read(p),context,{filename:p});
 if(facade){
  const member={uid:'qa_actor',tenantId:'qa_tenant',roles:[role],activeRole:role,countries:['GT'],productReadOnly:true};Orbit.auth={productUser:member};Orbit.session={rol:()=>role};
  Object.assign(store,{__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false})});
  Orbit.productRuntimeBrowserProvidersP0={browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,initialize:async()=>({auth:{currentUser:{uid:'qa_actor'}}}),async callFunction(name,input,region){calls.push(clone({name,input,region}));return{ok:true,canonicalReadback:true,canonicalReadbackCount:input.mutations.length,readback:input.mutations.map(m=>({collection:m.collection,id:m.id,action:m.action,exists:true,tenantId:'qa_tenant',payload:{...store.get(m.collection,m.id),...m.payload}}))};}};
  load('orbit360-platform/data/store-firestore-product-operational-p0.js');Orbit.productOperationalWriteP0.install(store);
 }
 load('orbit360-platform/core/primas.js');load('orbit360-platform/core/policy-receipts-engine.js');load('orbit360-platform/core/policy-receipts-v1199-refinements.js');load('orbit360-platform/modules/policy-receipts-v1199-bridge.js');
 return{Orbit,rows,batches,calls,toasts,doc,policy,context,async open(){Orbit.modules.cliente360.editarPoliza(policy.id);await Promise.resolve();await Promise.resolve();const form=doc.getElementById('policy-v1199');assert.ok(form);return{form,field:n=>form.querySelector('[data-'+n+']')};}};
}
test('metadata-only advisor change preserves authoritative premium, plan and all financial collections',async()=>{
 const h=harness(),before=clone(h.rows),r=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{asesorId:'b4003qa_new_advisor'},{motivo:'Corrección documentada del asesor',operationId:'b4003qa_metadata_core'});
 assert.equal(r.ok,true);assert.equal(r.metadataOnly,true);assert.equal(r.policy.primaTotal,2534.57);assert.equal(r.policy.asesorId,'b4003qa_new_advisor');
 assert.equal(h.batches.length,1);assert.equal(h.batches[0].options.policyMetadataOnly,true);assert.deepEqual(Object.keys(h.batches[0].mutations[0].payload),['asesorId']);
 for(const c of ['recibosEsperados','carteraPrimas','cobros','vehiculos'])assert.deepEqual(h.rows[c],before[c],c+' must be untouched');
 assert.deepEqual(h.rows.polizas[0],{...before.polizas[0],asesorId:'b4003qa_new_advisor'});assert.equal(h.batches[0].mutations.length,2);
});
test('opening the effective existing-policy editor previews persisted total and calendar, not a normalized 12-installment recalculation',async()=>{
 const h=harness(),{field}=await h.open();assert.match(field('preview').innerHTML,/2534\.57/);assert.doesNotMatch(field('preview').innerHTML,/1904\.00/);assert.match(field('preview').innerHTML,/211\.21/);assert.equal(h.batches.length,0);
});
test('advisor-only form save submits a minimal patch, audited without financial normalization',async()=>{
 const h=harness(),before=clone(h.rows),{field}=await h.open();field('advisor').value='b4003qa_new_advisor';await field('advisor').fire('change');await field('advisor').fire('input');field('reason').value='Asignación confirmada por Dirección';await field('save').fire('click');
 assert.equal(h.batches.length,1);assert.equal(h.rows.polizas[0].asesorId,'b4003qa_new_advisor');assert.equal(h.rows.polizas[0].primaTotal,2534.57);assert.deepEqual(h.rows.recibosEsperados,before.recibosEsperados);assert.deepEqual(h.rows.carteraPrimas,before.carteraPrimas);
 assert.match(h.toasts.join(' '),/preservad/);
});
test('advisor plus renewability remains one audited metadata-only change',async()=>{
 const h=harness(),{field}=await h.open();field('advisor').value='b4003qa_new_advisor';field('renewable').value='no';field('reason').value='Responsable y renovabilidad confirmados';await field('save').fire('click');
 assert.equal(h.batches.length,1);assert.deepEqual(h.batches[0].mutations[0].payload,{asesorId:'b4003qa_new_advisor',renovable:false});assert.equal(h.rows.polizas[0].primaTotal,2534.57);
});
test('financial field intentionally changed still takes the existing financial path',async()=>{
 const h=harness(),{field}=await h.open();field('net').value='2000';await field('net').fire('input');assert.match(field('preview').innerHTML,/2240\.00/);field('reason').value='Cambio financiero documentado de prueba';await field('save').fire('click');
 assert.equal(h.batches.length,1);assert.equal(h.batches[0].options.policyMetadataOnly,undefined);assert.equal(h.rows.polizas[0].primaTotal,2240);assert.ok(h.batches[0].mutations.some(m=>m.collection==='recibosEsperados'));
});
test('existing paid-assignment protection and Asesor role denial are not relaxed',async()=>{
 for(const opts of [{paid:true},{role:'Asesor'}]){const h=harness(opts),r=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{asesorId:'b4003qa_new_advisor'},{motivo:'Test de protección'});assert.equal(r.ok,false);assert.equal(h.batches.length,0);assert.equal(h.rows.polizas[0].asesorId,'b4003qa_old_advisor');}
});
test('no-op, empty reason and failed persistence never report a metadata save',async()=>{
 let h=harness();let r=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{asesorId:'b4003qa_old_advisor'},{motivo:'Sin cambio'});assert.equal(r.ok,false);assert.equal(h.batches.length,0);
 r=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{asesorId:'b4003qa_new_advisor'},{motivo:''});assert.equal(r.ok,false);assert.equal(h.batches.length,0);
 h=harness({fail:true});r=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{asesorId:'b4003qa_new_advisor'},{motivo:'Falla controlada',operationId:'b4003qa_failure'});assert.equal(r.ok,false);assert.equal(r.operationId,'b4003qa_failure');assert.equal(h.rows.polizas[0].primaTotal,2534.57);
});
test('write facade sends only advisor patch rather than the cached financial policy',async()=>{
 const h=harness({facade:true});const r=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{asesorId:'b4003qa_new_advisor'},{motivo:'Cambio administrativo documentado'});assert.equal(r.ok,true,r.error);
 assert.equal(h.calls.length,1);const m=h.calls[0].input.mutations.find(m=>m.collection==='polizas');assert.deepEqual(m.payload,{asesorId:'b4003qa_new_advisor'});assert.equal(h.calls[0].name,'orbit360ProductOperationalCommand');
});
test('metadata-only facade option cannot carry a hidden financial field',async()=>{
 const h=harness({facade:true});await assert.rejects(h.Orbit.store.batchDurable([{action:'update',collection:'polizas',id:h.policy.id,payload:{asesorId:'b4003qa_new_advisor',primaTotal:1}},{action:'insert',collection:'actividades',id:'b4003qa_bad',payload:{pais:'GT',asesorId:'b4003qa_new_advisor'}}],{policyMetadataOnly:true}),/PRODUCT_POLICY_METADATA_PATCH_CONTRACT_INVALID/);assert.equal(h.calls.length,0);
});
test('isolated Preview retains only the existing synthetic policy marker and synthetic activity identity',async()=>{
 const h=harness({facade:true,preview:true}),r=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{asesorId:'b4003qa_new_advisor'},{motivo:'QA aislado de metadatos'});
 assert.equal(r.ok,true,r.error);assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,'orbit360ProductOperationalCommandPreview');
 const ms=h.calls[0].input.mutations,p=ms.find(m=>m.collection==='polizas'),a=ms.find(m=>m.collection==='actividades');
 assert.deepEqual(p.payload,{asesorId:'b4003qa_new_advisor',__syntheticQa:true});assert.equal(a.payload.__syntheticQa,true);assert.match(a.id,/^b4003qa_/);assert.equal(ms.length,2);
});

function installDocumentedCorrection(h,{missingProof=false}={}){
 const contract=require('../functions/advisor-assignment-correction-contract');
 const calls=[];
 const canonical=()=>({tenantId:'qa_tenant',actor:{uid:'qa_actor',activeRole:'Dirección',countries:['GT']},scopeAuthorized:true,
  client:h.rows.clientes[0],policies:h.rows.polizas,targetAdvisor:{...h.rows.asesores[1],roles:['Asesor'],activo:true},
  preservedRows:Object.fromEntries(contract.PRESERVED_COLLECTIONS.map(c=>[c,h.rows[c]||[]]))});
 h.Orbit.store.correctAdvisorAssignment=async(spec,options)=>{
  calls.push(clone({spec,options}));
  try{
   const plan=contract.buildPlan(spec,canonical());
   if(spec.operation==='preview')return{ok:true,...plan};
   for(const change of plan.changes)Object.assign(h.Orbit.store.get(change.collection,change.id),change.patch);
   const proof=contract.verifyReadback(plan,canonical());
   return{ok:true,...plan,committed:true,...proof,canonicalReadback:!missingProof,requestId:options.requestId};
  }catch(error){throw Object.assign(error,{details:{reason:error.code}});}
 };
 return calls;
}
async function correctionForm(h){
 const f=await h.open(),field=f.field;
 field('assignment-mode').checked=true;await field('assignment-mode').fire('change');
 field('advisor').value='b4003qa_new_advisor';await field('advisor').fire('change');
 field('reason').value='Responsable confirmado contra fuente sintética';
 field('assignment-decision').value='QA-DIRECCION-DECISION';
 field('assignment-source').value='qa-fuente.csv';field('assignment-line').value='Hoja QA, renglón 4';
 field('assignment-period').value='2026-10';field('assignment-sha').value='a'.repeat(64);
 return f;
}
test('paid-policy documented correction requires canonical preview and a separate confirmation in existing form',async()=>{
 const h=harness({paid:true}),before=clone(h.rows),calls=installDocumentedCorrection(h),{field}=await correctionForm(h);
 assert.equal(field('assignment-client').checked===true,false,'client scope defaults to unchecked');
 await field('save').fire('click');assert.equal(h.batches.length,0);assert.equal(calls.length,0);
 await field('assignment-preview').fire('click');assert.equal(calls.length,1);assert.equal(calls[0].spec.operation,'preview');
 assert.equal(field('assignment-confirm').disabled,false);assert.deepEqual(h.rows,before,'preview is read-only');
 await field('assignment-confirm').fire('click');assert.equal(calls.length,2);assert.equal(calls[1].spec.operation,'commit');
 assert.equal(calls[1].spec.expectedBefore.length,2);assert.match(calls[1].options.requestId,/^advcorr_[a-f0-9]{40}$/);
 assert.equal(h.rows.polizas[0].asesorId,'b4003qa_new_advisor');assert.deepEqual(h.rows.clientes,before.clientes);
 for(const c of ['recibosEsperados','carteraPrimas','cobros','vehiculos'])assert.deepEqual(h.rows[c],before[c]);
 assert.equal(h.doc.getElementById('policy-v1199'),null);assert.match(h.toasts.join(' '),/Asesor corregido y auditado/);
});
test('documented form checkbox adds only the explicitly chosen client to the same correction',async()=>{
 const h=harness({paid:true}),calls=installDocumentedCorrection(h),{field}=await correctionForm(h);
 field('assignment-client').checked=true;await field('assignment-client').fire('change');
 await field('assignment-preview').fire('click');assert.equal(calls[0].spec.updateClient,true);
 await field('assignment-confirm').fire('click');assert.equal(h.rows.clientes[0].asesorId,'b4003qa_new_advisor');
 assert.equal(h.rows.polizas[0].primaTotal,2534.57);
});
test('edited source/target invalidates confirmation and mixed financial edits never enter correction command',async()=>{
 const h=harness({paid:true}),calls=installDocumentedCorrection(h),{field}=await correctionForm(h);
 await field('assignment-preview').fire('click');
 field('assignment-line').value='Hoja QA, renglón 5';await field('assignment-line').fire('input');
 assert.equal(field('assignment-confirm').disabled,true);await field('assignment-confirm').fire('click');assert.equal(calls.length,1);
 field('net').value='1';await field('assignment-preview').fire('click');assert.equal(calls.length,1);
 assert.match(field('error').textContent,/únicamente el asesor/);
});
test('canonical stale preimage prevents correction after a concurrent premium change',async()=>{
 const h=harness({paid:true}),calls=installDocumentedCorrection(h),{field}=await correctionForm(h);
 await field('assignment-preview').fire('click');h.rows.polizas[0].primaTotal=2534.58;
 await field('assignment-confirm').fire('click');assert.equal(calls.length,2);
 assert.equal(h.rows.polizas[0].asesorId,'b4003qa_old_advisor');assert.equal(h.toasts.length,0);
 assert.equal(field('assignment-confirm').disabled,true);assert.match(field('error').textContent,/cambió/);
});
test('missing post-commit proof leaves the form open and never shows successful correction',async()=>{
 const h=harness({paid:true});installDocumentedCorrection(h,{missingProof:true});const {field}=await correctionForm(h);
 await field('assignment-preview').fire('click');await field('assignment-confirm').fire('click');
 assert.ok(h.doc.getElementById('policy-v1199'));assert.equal(h.toasts.length,0);
 assert.match(field('error').textContent,/verificación posterior/);
});
test('Direction-only correction UI does not extend Operativo or relax ordinary paid-policy guard',async()=>{
 const h=harness({role:'Operativo',paid:true}),calls=installDocumentedCorrection(h),{field}=await h.open();
 assert.equal(field('assignment-mode'),null);
 const r=await h.Orbit.policyReceipts.correctAdvisorAssignment({version:1,operation:'preview'});
 assert.equal(r.ok,false);assert.deepEqual(Array.from(r.errors),['CORRECTION_DIRECTION_REQUIRED']);assert.equal(calls.length,0);
 const ordinary=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,{asesorId:'b4003qa_new_advisor'},{motivo:'Asignación ordinaria'});
 assert.equal(ordinary.ok,false);assert.deepEqual(Array.from(ordinary.errors),['pagos_existentes_requieren_endoso']);
});
test('document selection computes SHA-256 without importing rows or performing a correction',async()=>{
 const h=harness({paid:true}),calls=installDocumentedCorrection(h),{field}=await correctionForm(h);
 h.context.crypto=require('node:crypto').webcrypto;
 const bytes=new TextEncoder().encode('documento sintético');
 field('assignment-file').files=[{name:'qa-original.txt',size:bytes.length,arrayBuffer:async()=>bytes.buffer}];
 field('assignment-source').value='';await field('assignment-file').fire('change');
 assert.equal(field('assignment-sha').value,require('node:crypto').createHash('sha256').update(bytes).digest('hex'));
 assert.equal(field('assignment-source').value,'qa-original.txt');assert.equal(calls.length,0);assert.equal(h.batches.length,0);
});
