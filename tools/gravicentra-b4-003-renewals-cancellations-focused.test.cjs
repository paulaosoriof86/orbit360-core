'use strict';
// Synthetic in-memory functional probes. No network, real records, browser or send.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const ROOT=require('node:path').resolve(__dirname,'../orbit360-platform/modules')+'/';
const src=n=>fs.readFileSync(ROOT+n,'utf8');
const fixed=Date.parse('2026-11-07T12:00:00Z');
class FixedDate extends Date{constructor(...a){super(...(a.length?a:[fixed]));}static now(){return fixed;}}
function setup(seed={},role='Direccion'){
 const db=structuredClone(seed),writes=[],toasts=[],modals=[],opened=[],nodes=new Map();let deny=false,fail='',pending=null;
 function node(tag='div'){
  const children=new Map(),events={};return {tag,id:'',style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,value:'',events,children,removed:false,
   addEventListener(k,fn){events[k]=fn;},appendChild(n){if(n.id)nodes.set(n.id,n);return n;},remove(){this.removed=true;if(this.id)nodes.delete(this.id);},
   querySelector(s){if(s==='#cx-delete'&&!this.innerHTML.includes('id="cx-delete"'))return null;if(!children.has(s)){const n=node('input');const id=s.slice(1);const m=this.innerHTML.match(new RegExp('id="'+id+'"[^>]*value="([^"]*)"'));n.value=m?m[1]:'';children.set(s,n);}return children.get(s);},
   querySelectorAll(){return [];},getAttribute(){return '';},classList:{add(){},remove(){}},removeAttribute(){},
   async click(){return events.click?events.click({target:this,stopPropagation(){},preventDefault(){}}):this.onclick?.({target:this,stopPropagation(){},preventDefault(){}});}
  };
 }
 const document={getElementById:id=>nodes.get(id)||null,createElement:node,body:node('body')};
 const store={all:c=>db[c]||[],get:(c,id)=>(db[c]||[]).find(x=>String(x.id)===String(id))||null,where:(c,p)=>(db[c]||[]).filter(p),
  async updateDurable(c,id,p){writes.push({op:'update',c,id,p:structuredClone(p)});if(pending)await pending;if(fail===c)throw Error('synthetic_failure');const r=store.get(c,id);if(!r)throw Error('missing_record');Object.assign(r,structuredClone(p));return r;},
  async insertDurable(c,p){writes.push({op:'insert',c,id:p.id,p:structuredClone(p)});if(pending)await pending;if(fail===c)throw Error('synthetic_failure');db[c]??=[];if(store.get(c,p.id))throw Error('duplicate');db[c].push(structuredClone(p));return p;}};
 const Orbit={modules:{},pais:'GT',store,route:{key:'cancelaciones'},session:{rol:()=>role},auth:{productUser:{uid:'synthetic'}},
  ui:{esc:v=>String(v??''),today:()=> '2026-11-07',fmtDate:v=>String(v||''),money:(v,c)=>c+' '+v,moneyShort:v=>v,avatar:()=>'',daysFromNow:d=>d?Math.ceil((Date.parse(d+'T00:00:00Z')-Date.parse('2026-11-07'))/86400000):null,toast:t=>toasts.push(t),prompt:async()=> 'Synthetic closure reason'},
  q:{isSyntheticQaRecord:p=>!!p?.__syntheticQa,aseguradora:id=>store.get('aseguradoras',id),asesor:id=>store.get('asesores',id)},kit:{asesorOptions:()=>[]},
  access:{norm:v=>String(v||'').toLowerCase(),can:()=>!deny,canView:()=>!deny,filter:(_c,r)=>r,esAsesor:()=>role==='Asesor'},
  ciclo:{managementCreateModal:x=>{modals.push(x);return x;},async crearGestion(g){const r={id:'g_synthetic',...g};await store.insertDurable('gestiones',r);return r;}}};
 const ctx={Orbit,document,location:{hash:'#/renovaciones',hostname:'test--preview.web.app'},Date:FixedDate,console,Map,Set,setTimeout:()=>0,clearTimeout(){},encodeURIComponent,decodeURIComponent,addEventListener(){},confirm:()=>true,open:(...a)=>opened.push(a)};ctx.window=ctx;
 vm.createContext(ctx);for(const f of ['renovaciones.js','renewals-v1200-operational-bridge.js','renewals-v1200-permission-guard.js','cancelaciones.js'])vm.runInContext(src(f),ctx,{filename:f});
 return {db,writes,toasts,modals,opened,nodes,ctx,Orbit,document,deny:v=>deny=v,fail:v=>fail=v,pending:v=>pending=v};
}
const policy=(id='p',more={})=>({id,numero:'SYNTHETIC-'+id,tenantId:'t',clienteId:'c',aseguradoraId:'a',asesorId:'v',pais:'GT',moneda:'GTQ',ramo:'Autos',estado:'Vigente',renovable:true,vigenciaInicio:'2025-12-01',vigenciaFin:'2026-12-01',prima:1000,...more});
const seed=(more={})=>({clientes:[{id:'c',nombre:'Cliente Prueba',pais:'GT',moneda:'GTQ',telefono:'55555555'}],aseguradoras:[{id:'a',nombre:'Aseguradora Prueba'}],polizas:[policy()],...more});
const cancellation=(more={})=>({id:'b4003qa_cancel',polizaId:'p',clienteId:'c',asesorId:'v',pais:'GT',moneda:'GTQ',fecha:'2026-11-01',valorPerdido:1000,motivo:'Motivo confirmado',recuperacion:'Pendiente de contacto',...more});
const detail=h=>{h.Orbit.modules.cancelaciones.detalle('b4003qa_cancel');return h.nodes.get('c360-edit');};
test('Renewal lifecycle distinguishes valid successor, conflicts, unknown renewability and terminal state without writes',()=>{
 const cases=[
  [policy(),[], 'PROXIMA_POR_GESTIONAR',true],
  [policy('p',{renovable:null}),[],'RENOVABILIDAD_SIN_CONFIRMAR',false],
  [policy('p',{renovable:false}),[],'NO_RENOVABLE',false],
  [policy('p',{estado:'Cancelada'}),[],'CANCELADA',false],
  [policy('p',{renovadaPor:'next'}),[policy('next',{vigenciaInicio:'2026-12-01',vigenciaFin:'2027-12-01',renuevaDe:'p'})],'RENOVACION_VINCULADA',false],
  [policy('p',{renovadaPor:'missing'}),[],'LINEAGE_CONFLICTO',false],
  [policy('p',{renovacionEstado:'renovada'}),[],'RENOVADA_DECLARADA_SIN_SUCESORA_VERIFICADA',false]
 ];
 for(const [p,extra,reason,actionable]of cases){const h=setup(seed({polizas:[p,...extra]}));const l=h.Orbit.renewalLifecycle.evaluate(h.db.polizas[0]);assert.equal(l.reason,reason);assert.equal(l.actionable,actionable);assert.equal(h.writes.length,0);}
});
test('Renewal proposal and acceptance open canonical Ops workflow, require acceptance and reuse existing management',async()=>{
 const h=setup(seed());const m=h.Orbit.modules.renovaciones;await m.solicitarPropuestas('p');assert.equal(h.modals[0].extraFields.workflowType,'renewal_proposals');assert.equal(h.modals[0].polizaId,'p');assert.equal(h.writes.length,0);
 m.registrarAceptacion('p');assert.match(h.modals[1].requireConfirmationText,/cliente aprobó/);assert.equal(h.modals[1].extraFields.workflowType,'renewal_accepted');
 h.db.gestiones=[{id:'existing',polizaId:'p',workflowType:'renewal_proposals',estado:'Pendiente'}];await m.solicitarPropuestas('p');assert.equal(h.modals.length,2);assert.equal(h.ctx.__orbitOpenGestion,'existing');assert.equal(h.ctx.location.hash,'#/ops');
});
test('Renewal scopes reject inaccessible policy; advisor cannot quote directly or prepare denied campaign',async()=>{
 const h=setup(seed(),'Asesor');assert.equal(h.Orbit.modules.renovaciones.canDirectQuote(),false);h.Orbit.modules.renovaciones.cotizarDirecto('p');assert.equal(h.ctx.location.hash,'#/renovaciones');h.deny(true);await h.Orbit.modules.renovaciones.solicitarPropuestas('p');h.Orbit.modules.renovaciones.campana();assert.equal(h.modals.length,0);assert.equal(h.writes.length,0);
});
test('Cancellation projection deduplicates explicit records and honors policy-country over client country',()=>{
 const h=setup(seed({polizas:[policy('p',{estado:'Cancelada'}),policy('co',{pais:'CO',estado:'Anulada',moneda:'COP'})],cancelaciones:[cancellation()]}));let r=h.Orbit.modules.cancelaciones.effectiveRows();assert.equal(r.length,1);assert.equal(r[0].id,'b4003qa_cancel');h.Orbit.pais='CO';r=h.Orbit.modules.cancelaciones.effectiveRows();assert.equal(r.length,1);assert.equal(r[0].polizaId,'co');assert.equal(r[0].moneda,'COP');h.Orbit.pais='TODOS';assert.equal(h.Orbit.modules.cancelaciones.effectiveRows().length,2);assert.equal(h.writes.length,0);
});
test('Motive waits for durable confirmation, keeps recovery unchanged and survives module reconstruction',async()=>{
 const h=setup(seed({cancelaciones:[cancellation()]}));const b=detail(h);b.querySelector('#cx-motivo').value='Nuevo motivo respaldado';let release;h.pending(new Promise(r=>release=r));const run=b.querySelector('#cx-save-motivo').click();await Promise.resolve();assert.equal(b.removed,false);assert.equal(h.toasts.length,0);release();await run;assert.equal(h.db.cancelaciones[0].motivo,'Nuevo motivo respaldado');assert.equal(h.db.cancelaciones[0].recuperacion,'Pendiente de contacto');assert.equal(h.writes.length,1);const reload=setup(h.db);assert.equal(reload.Orbit.modules.cancelaciones.effectiveRows()[0].motivo,'Nuevo motivo respaldado');
});
test('Motive durable failure leaves original data and reports no success',async()=>{
 const h=setup(seed({cancelaciones:[cancellation()]}));h.fail('cancelaciones');const b=detail(h);b.querySelector('#cx-motivo').value='Nuevo';await b.querySelector('#cx-save-motivo').click();assert.equal(h.db.cancelaciones[0].motivo,'Motivo confirmado');assert.equal(b.removed,false);assert.match(h.toasts.at(-1),/no se registró éxito/);
});
test('Recovery active flow persists cancellation/activity/business links and retry does not duplicate linked records',async()=>{
 const h=setup(seed({cancelaciones:[cancellation()]}));for(let n=0;n<2;n++){const b=detail(h);b.querySelector('#cx-rec').value='En negociación';b.querySelector('#cx-nota').value='Synthetic follow-up';await b.querySelector('#cx-save').click();assert.equal(b.removed,true);}assert.equal(h.db.negocios.length,1);assert.equal(h.db.actividades.length,1);assert.equal(h.db.cancelaciones[0].recuperacionNegocioId,h.db.negocios[0].id);assert.equal(h.db.negocios[0].cancelacionId,'b4003qa_cancel');
});
test('Recovered flow requires motive and persists canonical Ops management plus link',async()=>{
 const h=setup(seed({cancelaciones:[cancellation()]}));const b=detail(h);b.querySelector('#cx-rec').value='Recuperada';b.querySelector('#cx-nota').value='';await b.querySelector('#cx-save').click();assert.equal(h.db.cancelaciones[0].recuperada,true);assert.equal(h.db.gestiones.length,1);assert.equal(h.db.cancelaciones[0].recuperacionGestionId,'g_synthetic');assert.match(h.db.gestiones[0].nota,/Synthetic closure/);
});
test('Unrecoverable closure records mandatory reason and creates no new business or management',async()=>{
 const h=setup(seed({cancelaciones:[cancellation()]}));const b=detail(h);b.querySelector('#cx-rec').value='No recuperable';b.querySelector('#cx-nota').value='';await b.querySelector('#cx-save').click();assert.equal(h.db.cancelaciones[0].recuperada,false);assert.match(h.db.cancelaciones[0].notaRecuperacion,/Synthetic closure/);assert.equal((h.db.negocios||[]).length,0);assert.equal((h.db.gestiones||[]).length,0);
});
test('Recovery intermediate write failure reports no false success; records partial non-atomic persistence',async()=>{
 const h=setup(seed({cancelaciones:[cancellation()]}));h.fail('actividades');const b=detail(h);b.querySelector('#cx-rec').value='En negociación';b.querySelector('#cx-nota').value='Synthetic';await b.querySelector('#cx-save').click();assert.equal(b.removed,false);assert.match(h.toasts.at(-1),/No se registró un falso éxito/);assert.equal(h.db.cancelaciones[0].recuperacion,'En negociación');assert.equal((h.db.negocios||[]).length,0);
});
test('Cancellation WhatsApp renders personalized draft, normalizes GT phone, and preview blocks opening without writes',async()=>{
 const h=setup(seed({cancelaciones:[cancellation()]}));const b=detail(h);await b.querySelector('#cx-wa').click();const draft=h.nodes.get('cancel-wa-drafts');assert.ok(draft);assert.equal(draft.querySelector('[data-wa-phone]').value,'50255555555');assert.match(draft.querySelector('[data-wa-message]').value,/Cliente Prueba/);await draft.querySelector('[data-wa-open]').click();assert.equal(h.opened.length,0);assert.match(h.toasts.at(-1),/Preview protegida/);assert.equal(h.writes.length,0);
});
