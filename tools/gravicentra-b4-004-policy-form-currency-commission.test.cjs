'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const canonical = root;
const ready = root;
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
  return{Orbit,rows,batches,doc,toasts};
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
test('effective new policy form keeps explicit GT USD and documented 10/60 through atomic policy/receipts/portfolio',async()=>{
  const h=harness(),{field}=openNew(h);
  assert.equal(field('currency').value,'GTQ');
  assert.equal(field('commission-insurer').value,'10');
  assert.equal(field('commission-seller').value,'60');
  field('currency').value='USD';
  await field('save').fire('click');
  assert.equal(h.batches.length,1);
  const p=h.rows.polizas[0],r=h.rows.recibosEsperados[0],car=h.rows.carteraPrimas[0];
  assert.equal(p.moneda,'USD');assert.equal(p.divisa,'USD');assert.equal(p.pais,'GT');
  assert.equal(p.primaNeta,1000);assert.equal(p.primaTotal,1120);
  assert.equal(p.comAseguradoraPct,10);assert.equal(p.comVendedorPct,60);
  assert.equal(r.moneda,'USD');assert.equal(r.comAseguradora,100);assert.equal(r.comVendedor,60);
  assert.equal(car.moneda,'USD');assert.equal(h.rows.cobros.length,0);
});
test('missing commission configuration stays blank, blocks save with zero writes, and accepts explicit documentary rates',async()=>{
  const h=harness({configured:false}),{field}=openNew(h);
  assert.equal(field('commission-insurer').value,'');assert.equal(field('commission-seller').value,'');
  await field('save').fire('click');
  assert.equal(h.batches.length,0);assert.equal(h.rows.polizas.length,0);
  assert.match(field('error').textContent,/Completa ambos porcentajes/);
  field('commission-insurer').value='10';field('commission-seller').value='60';
  await field('save').fire('click');
  assert.equal(h.batches.length,1);assert.equal(h.rows.polizas[0].comAseguradoraPct,10);assert.equal(h.rows.polizas[0].comVendedorPct,60);
});
test('out-of-range commission input is blocked; explicit zero is not confused with missing',async()=>{
  const h=harness(),{field}=openNew(h);
  field('commission-insurer').value='101';
  await field('save').fire('click');assert.equal(h.batches.length,0);
  field('commission-insurer').value='0';field('commission-seller').value='0';
  await field('save').fire('click');assert.equal(h.batches.length,1);
  assert.equal(h.rows.recibosEsperados[0].comAseguradora,0);assert.equal(h.rows.polizas[0].comVendedorPct,0);
});
test('neta and fijo seller models cannot be forced into percentage sharing by manual input',async()=>{
  for(const mode of ['neta','fijo']) {
    const h=harness();h.rows.asesores[0].comModo=mode;
    const {field}=openNew(h);
    assert.equal(field('commission-seller').value,'');
    field('commission-insurer').value='10';field('commission-seller').value='60';
    await field('save').fire('click');
    assert.equal(h.batches.length,0);assert.equal(h.rows.polizas.length,0);
    assert.equal(h.rows.asesores[0].comModo,mode);
    assert.match(field('error').textContent,/otro modelo de comisión/);
  }
});
test('currency validation preserves GTQ/COP and country relation boundaries, adding only GT USD',()=>{
  const h=harness(),E=h.Orbit.policyReceipts;
  const base={tenantId:'qa_tenant',clienteId:'qa_client',asesorId:'qa_advisor',pais:'GT',moneda:'GTQ',aseguradoraId:'qa_insurer',numero:'QA-VALIDATE',ramo:'AUTOMOVILES',producto:'AUTO',estado:'Vigente',vigenciaInicio:'2026-11-01',vigenciaFin:'2027-11-01',primaNeta:1000,cuotas:1,frecuencia:'Contado'};
  assert.equal(E.validatePolicy(base).ok,true);
  assert.equal(E.validatePolicy({...base,moneda:'USD'}).ok,true);
  assert.ok(E.validatePolicy({...base,moneda:'COP'}).errors.includes('moneda_no_coincide_pais'));
  assert.ok(E.validatePolicy({...base,moneda:'EUR'}).errors.includes('moneda_no_coincide_pais'));
  assert.equal(E.validatePolicy({...base,clienteId:'qa_client_co',pais:'CO',moneda:'COP'}).ok,true);
  assert.ok(E.validatePolicy({...base,pais:'CO',moneda:'COP'}).errors.includes('pais_no_coincide_cliente'));
  assert.ok(E.validatePolicy({...base,clienteId:'qa_client_co',pais:'CO',moneda:'USD'}).errors.includes('moneda_no_coincide_pais'));
});
test('editing existing USD policy preserves its currency and commission snapshots',async()=>{
  const h=harness(),{field}=openNew(h);
  field('currency').value='USD';await field('save').fire('click');
  const original=JSON.parse(JSON.stringify(h.rows.polizas[0]));
  h.Orbit.modules.cliente360.editarPoliza(original.id);
  const form=h.doc.getElementById('policy-v1199'),find=s=>form.querySelector('[data-'+s+']');
  assert.equal(find('currency').value,'USD');
  assert.equal(find('commission-insurer'),null);assert.equal(find('commission-seller'),null);
  find('reason').value='Verificación sintética de conservación de moneda y porcentajes';
  await find('save').fire('click');
  assert.equal(h.batches.length,2);
  assert.equal(h.rows.polizas[0].moneda,'USD');assert.equal(h.rows.polizas[0].comAseguradoraPct,10);assert.equal(h.rows.polizas[0].comVendedorPct,60);
  assert.equal(h.rows.recibosEsperados.length,1);
});
test('editing a policy with only the existing divisa USD alias does not reset it to GTQ',async()=>{
  const h=harness(),{field}=openNew(h);
  field('currency').value='USD';await field('save').fire('click');
  const p=h.rows.polizas[0];delete p.moneda;p.divisa='USD';
  h.Orbit.modules.cliente360.editarPoliza(p.id);
  const form=h.doc.getElementById('policy-v1199'),find=s=>form.querySelector('[data-'+s+']');
  assert.equal(find('currency').value,'USD');
  find('reason').value='Conservar alias documental de moneda';await find('save').fire('click');
  assert.equal(h.rows.polizas[0].moneda,'USD');assert.equal(h.rows.polizas[0].divisa,'USD');
  assert.equal(h.rows.polizas[0].comAseguradoraPct,10);assert.equal(h.rows.polizas[0].comVendedorPct,60);
});

