'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const files = ['core/quote-comparison-contracts-v1203.js','core/quote-comparison-contracts-v1203-refinements.js'];
const source = name => readFileSync(join(__dirname,'../orbit360-platform',name),'utf8');
async function fixture() {
  const rows = new Map(), state = {role:'Dirección',denied:'',tenant:'t'};
  const store = {get:(c,id)=>rows.get(c+'/'+id),insert:(c,row)=>rows.set(c+'/'+row.id,structuredClone(row)),
    update:(c,id,patch)=>Object.assign(store.get(c,id),structuredClone(patch)),all:()=>[]};
  const access = {tenantId:()=>state.tenant, actorUser:()=>({id:'u'}), activeRole:()=>state.role,
    can:()=>state.role !== 'Consulta',canView:(c,r)=>r.id !== state.denied};
  const orbit={store,access,ui:{today:()=> '2026-11-27'}};
  function load() {
    const ctx = vm.createContext({Orbit:orbit,window:{Orbit:orbit,crypto:webcrypto},TextEncoder});
    for (const file of files) vm.runInContext(source(file),ctx);
    return orbit.quoteContracts;
  }
  const Q=load(), ctx={pais:'GT',tenantId:'t',clienteId:'c',riesgoId:'r',oportunidadId:'o',moneda:'GTQ'};
  store.insert('clientes',{...ctx,id:'c',email:'qa@example.invalid',telefono:'00001111'});
  store.insert('negocios',{...ctx,id:'o'});
  for (const [id,total] of [['a',10.01],['b',10.02]]) {
    store.insert('aseguradoras',{id,nombre:id});
    store.insert('documentos',{...ctx,id:'doc-'+id,aseguradoraId:id,version:'v1',vigenciaHasta:'2026-12-30'});
    const input={...ctx,id,aseguradoraId:id,fuenteDocumentoId:'doc-'+id,versionFuente:'v1',estadoValidacion:'validado',
      cotizacionOrigen:'pdf_aseguradora',confirmacionHumana:true,ramo:'Auto',producto:'Auto',primaNeta:total,primaTotal:total};
    const stamp=await Q.reviewForCommunication(input);assert.equal(stamp.length,64);
    assert.equal(Q.persistQuote(input,{communicationReview:stamp}).ok,true);
  }
  const cmp=Q.createComparison({id:'cmp',cotizacionIds:['a','b']}).comparison;
  const prepare=(id='c')=>orbit.quoteContracts.prepareCommunication(cmp.id,'auto',id);
  return {store,state,prepare,load,cmp,Q};
}
test('prepara todas las propuestas verificadas y conserva un centavo de diferencia después de recargar',async()=>{
  const f=await fixture();f.load();
  const r=await f.prepare();assert.equal(r.ok,true,r.errors?.join());assert.match(r.message,/GTQ 10\.01/);assert.match(r.message,/GTQ 10\.02/);
  const attempt={clienteId:'c',canal:'correo',destino:'qa@example.invalid',asunto:r.subject,mensaje:r.message};
  assert.equal(r.autorizar(attempt),true);
  for(const patch of [{clienteId:'otro'},{destino:'otro@example.invalid'},{asunto:'editado'},{mensaje:'editado'},{adjuntos:['otro.pdf']}])
    assert.equal(r.autorizar({...attempt,...patch}),false);
  f.state.role='Operativo';assert.equal(r.autorizar(attempt),false);
});
for (const [name,change] of Object.entries({
  'cliente ausente':f=>{f.cmp.clienteId='';},'cliente distinto':f=>{f.cmp.clienteId='otro';},
  'destinatario fuera de alcance':f=>{f.state.denied='c';},'otra oportunidad':f=>{f.cmp.oportunidadId='otra';},
  'otro riesgo':f=>{f.cmp.riesgoId='otro';},'tenant distinto':f=>{f.state.tenant='otro';},
  'otro país':f=>{f.store.get('clientes','c').pais='CO';},
  'propuesta sin validar':f=>{f.store.get('cotizaciones','b').estadoValidacion='pendiente';},
  'moneda incompatible':f=>{f.store.get('cotizaciones','b').moneda='USD';},
  'moneda ausente':f=>{f.store.get('cotizaciones','b').moneda='';},
  'moneda no definida en documento':f=>{delete f.store.get('documentos','doc-b').moneda;},
  'estimación interna':f=>{f.store.get('cotizaciones','a').cotizacionOrigen='estimacion_interna';},
  'documento vencido':f=>{f.store.get('documentos','doc-a').vigenciaHasta='2026-11-26';},
  'documento de otra persona':f=>{f.store.get('documentos','doc-a').clienteId='otro';},
  'selección sin registro':f=>{f.cmp.cotizacionIds.push('ausente');},
  'selección repetida':f=>{f.cmp.cotizacionIds.push('a');},
  'sin permiso de preparar':f=>{f.state.role='Consulta';},
  'cambio de contenido después de la revisión':f=>{f.store.get('cotizaciones','a').condiciones=['nueva'];},
  'vínculo de prospecto contradictorio':f=>{f.store.get('cotizaciones','b').prospectoId='otro';}
})) test(name+' se bloquea antes de preparar',async()=>{
  const f=await fixture();change(f);const r=await f.prepare();assert.equal(r.ok,false);assert.notEqual(f.cmp.estado,'preparado');
});
test('una revisión abierta pierde vigencia si cambian la ficha, el documento o la prima',async()=>{
  const f=await fixture();const r=await f.prepare();assert.equal(r.ok,true);
  const input={clienteId:'c',canal:'whatsapp',destino:'00001111',mensaje:r.message,asunto:r.subject};
  assert.equal(r.autorizar(input),true);
  f.store.get('clientes','c').telefono='00002222';assert.equal(r.autorizar(input),false);
  f.store.get('clientes','c').telefono='00001111';
  f.store.get('documentos','doc-a').version='v2';assert.equal(r.autorizar(input),false);
  f.store.get('documentos','doc-a').version='v1';
  f.store.get('cotizaciones','a').primaTotal=10.03;assert.equal(r.autorizar(input),false);
});
test('preserva el comparativo independiente sin resolver ni notificar clientes',()=>{
  const notices=[];const orbit={store:{all(){throw Error('consulta de clientes arbitrarios');}},notify:{pedir(){throw Error('entrega');}},
    ui:{toast:v=>notices.push(v)},modules:{}};
  const ctx=vm.createContext({Orbit:orbit,window:{Orbit:orbit}});
  vm.runInContext(source('modules/comparativo.js'),ctx);
  orbit.modules.comparativo.enviarCliente();assert.match(notices[0],/borrador/i);
  assert.equal(typeof orbit.modules.comparativo.render,'function');
});
test('una nueva revisión válida de la cotización exige regenerar el comparativo anterior',async()=>{
  const f=await fixture(),q=f.store.get('cotizaciones','a');
  const revised={...q,condiciones:['cobertura revisada']};
  const stamp=await f.Q.reviewForCommunication(revised);
  assert.equal(f.Q.persistQuote(revised,{communicationReview:stamp}).ok,true);
  assert.equal((await f.prepare()).ok,false);
  assert.equal(f.Q.createComparison({id:'cmp',cotizacionIds:['a','b']}).ok,true);
  assert.equal((await f.prepare()).ok,true);
});
function syntheticDom() {
  const nodes=new Map();
  const element=()=>({style:{},value:'',listeners:{},elements:new Map(),
    querySelector(k){if (!this.elements.has(k)) this.elements.set(k,element());return this.elements.get(k);},
    querySelectorAll(){return [];},addEventListener(k,fn){this.listeners[k]=fn;},remove(){nodes.delete(this.id);}});
  return {getElementById:id=>nodes.get(id),createElement:element,body:{appendChild(el){nodes.set(el.id,el);}}};
}
test('el selector y el compositor de correo validan nuevamente antes de registrar un envío',async()=>{
  const f=await fixture();const approved=await f.prepare();const doc=syntheticDom(),requests=[];
  const orbit={store:{...f.store,where:()=>[]},ui:{esc:String,today:()=> '2026-11-27',toast(){}},modules:{},correo:{getCfg:()=>({conectado:false}),enviar:mail=>requests.push(mail)}};
  const context=vm.createContext({Orbit:orbit,window:{Orbit:orbit,open(){throw Error('red externa');}},document:doc,setTimeout(){}});
  vm.runInContext(source('core/notify.js'),context);vm.runInContext(source('modules/correo.js'),context);
  const opts={tipo:'Comparativo preparado',autorizar:approved.autorizar,asunto:approved.subject,mensaje:approved.message};
  function openDraft() {
    orbit.notify.pedir('c',opts);
    const back=doc.getElementById('notif-cli');
    back.querySelector('[name="nc-canal"]:checked').value='correo';
    back.querySelector('#nc-asunto').value=opts.asunto;back.querySelector('#nc-msg').value=opts.mensaje;
    back.querySelector('#nc-send').listeners.click();return doc.getElementById('cr-drawer');
  }
  const draft=openDraft();assert.ok(draft);
  draft.querySelector('#rd-asunto').value=opts.asunto;draft.querySelector('#rd-para').value='otro@example.invalid';
  draft.querySelector('#dr-ok').listeners.click();assert.equal(requests.length,0);
  draft.querySelector('#rd-para').value='qa@example.invalid';draft.querySelector('#rd-cuerpo').value+=' cambiado';
  draft.querySelector('#dr-ok').listeners.click();assert.equal(requests.length,0);
  draft.querySelector('#rd-cuerpo').value=opts.mensaje;draft.querySelector('#dr-ok').listeners.click();assert.equal(requests.length,1);
  const reopened=openDraft();reopened.querySelector('#rd-para').value='qa@example.invalid';reopened.querySelector('#rd-asunto').value=opts.asunto;
  f.state.role='Consulta';reopened.querySelector('#dr-ok').listeners.click();assert.equal(requests.length,1);
});
test('una vista antigua no puede entregar propuestas con el transporte nuevo sin revisión',()=>{
  const doc=syntheticDom();const orbit={store:{get(){throw Error('destinatario sin revisión');}},ui:{toast(){}},modules:{}};
  vm.runInNewContext(source('core/notify.js'),{Orbit:orbit,window:{Orbit:orbit},document:doc});
  for(const tipo of ['Comparativo enviado','Comparativo preparado','Cotización enviada','Cotización preparada']){
    assert.equal(orbit.notify.pedir('c',{tipo}),null);assert.equal(orbit.notify.cliente('c',{tipo}),null);
  }
});
test('compositor antiguo no recibe una propuesta aunque el selector tenga su revisión',async()=>{
  const f=await fixture(),r=await f.prepare(),mails=[];
  const orbit={store:f.store,ui:{toast(){}},modules:{correo:{redactar:m=>mails.push(m)}}};
  vm.runInNewContext(source('core/notify.js'),{Orbit:orbit,window:{Orbit:orbit},document:syntheticDom()});
  assert.equal(orbit.notify.cliente('c',{tipo:'Comparativo preparado',canal:'correo',autorizar:r.autorizar,
    mensaje:r.message,asunto:r.subject}),null);assert.equal(mails.length,0);
});
test('el borrador guarda centavos, mantiene monedas distintas y omite la recomendación de precio',async()=>{
  const doc=syntheticDom(),host=doc.createElement('main'),notices=[],answer=['Propuesta ficticia','101.07'];
  const orbit={modules:{},kit:{banner:o=>o.actions},ui:{esc:String,today:()=> '2026-11-27',prompt:async()=>answer.shift(),toast(){}},
    _cots:[{nombre:'Propuesta A',total:100.02,cur:'GTQ'},{nombre:'Propuesta B',total:101.01,cur:'USD'}],
    store:{all:c=>{assert.notEqual(c,'clientes');return [];}},notify:{pedir:()=>notices.push(true)}};
  vm.runInNewContext(source('modules/comparativo.js'),{Orbit:orbit,window:{Orbit:orbit},document:doc,setTimeout(){}});
  const mod=orbit.modules.comparativo;mod.render(host);
  assert.match(host.innerHTML,/GTQ 100\.02/);assert.match(host.innerHTML,/USD 101\.01/);
  assert.doesNotMatch(host.innerHTML,/class="cz-badge"/);
  await host.querySelector('#cp-add').listeners.click();host.querySelector('#cp-save').listeners.click();
  const history=orbit._compHist[0];assert.equal(history.mejor,'');assert.equal(history.props[2].total,101.07);
  assert.equal(history.props[2].cur,'');assert.equal(mod.acceptanceSnapshot().ofertas[2].cur,'');
  assert.match(host.innerHTML,/Moneda pendiente 101\.07/);host.querySelector('#cp-send').listeners.click();assert.equal(notices.length,0);
});
