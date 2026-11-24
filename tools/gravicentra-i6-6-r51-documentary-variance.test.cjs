'use strict';
// Real frontend owners, synthetic in-memory records only. No network, user
// identity, operational payment or Firebase write. The optional private tar
// selects exact preimages for reproducible before/after failure evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const repo=process.env.R51_BASE_REPO || path.resolve(__dirname,'..');
const root=process.env.R51_SOURCE_ROOT || repo;
const preimage = process.env.I66_DOCUMENTED_TERMS_PREIMAGE_ARCHIVE;
const clone = value => JSON.parse(JSON.stringify(value));
const ownerPaths = [
  'core/primas.js', 'core/policy-receipts-engine.js', 'modules/policy-receipts-v1199-bridge.js',
  'modules/policy-receipts-v1199-detail-guard.js', 'core/backend-lab-receipts-portfolio-native-bridge-v20260801.js',
  'core/issuance-workflow-v1201.js', 'modules/issuance-endosos-v1201-bridge.js', 'core/importa.js'
].map(p => 'orbit360-platform/' + p);
function read(p) {
  const proposed=path.join(root,p);return fs.readFileSync(fs.existsSync(proposed)?proposed:path.join(repo,p),'utf8');
}
const decode = value => String(value || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attrs = text => Object.fromEntries([...String(text).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m => [m[1], decode(m[2] ?? m[3] ?? m[4] ?? '')]));
class Element {
  constructor(tag, doc, a = {}) {
    this.tagName = tag.toUpperCase(); this.doc = doc; this.attrs = a; this.id = a.id || ''; this.value = a.value || '';
    this.style = {}; this.listeners = {}; this.nodes = []; this.children = []; this.dataset = {}; this.disabled = 'disabled' in a;
    this.textContent = ''; this.isConnected = true; this.classList = { add() {}, remove() {}, contains() { return false; } };
    for (const [k,v] of Object.entries(a)) if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_,c) => c.toUpperCase())] = v;
  }
  set innerHTML(s) {
    this.html = String(s);
    if (this.tagName === 'SELECT') {
      const options = [...this.html.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(m => ({ a: attrs(m[1]), t: decode(m[2]) }));
      const selected = options.find(o => 'selected' in o.a) || options[0]; this.value = selected ? (selected.a.value ?? selected.t) : ''; return;
    }
    this.nodes = [];
    for (const m of this.html.matchAll(/<(input|select|textarea|button|div|small|label|span|a)\b([^>]*)>/g)) {
      const a = attrs(m[2]); if (!a.id && !Object.keys(a).some(k => k.startsWith('data-'))) continue;
      const el = new Element(m[1], this.doc, a); el.parentElement = this;
      if (m[1] === 'select') el.innerHTML = this.html.slice(m.index + m[0].length).split('</select>')[0];
      if (m[1] === 'textarea') el.value = decode(this.html.slice(m.index + m[0].length).split('</textarea>')[0]);
      this.nodes.push(el);
    }
  }
  get innerHTML() { return this.html || ''; }
  matches(s) {
    return String(s).split(',').some(part => {
      const p = part.trim(); if (p.startsWith('#')) return this.id === p.slice(1);
      if (/^[a-z]+$/i.test(p)) return this.tagName.toLowerCase() === p.toLowerCase();
      const m = p.match(/^\[([:\w-]+)(?:=['"]?([^'"]*)['"]?)?\]$/);
      return !!m && Object.hasOwn(this.attrs, m[1]) && (m[2] === undefined || this.attrs[m[1]] === m[2]);
    });
  }
  querySelectorAll(s) { return this.nodes.concat(this.children).filter(el => el.matches(s)); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  appendChild(el) { this.children.push(el); el.parentElement = this; if (el.id) this.doc.ids.set(el.id, el); return el; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  async fire(name) { for (const fn of this.listeners[name] || []) await fn({ target: this, preventDefault() {}, stopPropagation() {} }); if (name === 'click' && this.onclick) await this.onclick(); }
  insertAdjacentHTML(_position, html) { this.html = (this.html || '') + html; }
  remove() { this.isConnected = false; this.doc.ids.delete(this.id); }
  setAttribute(k,v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  focus() {} scrollIntoView() {}
}
function harness({ role = 'Dirección' } = {}) {
  const doc = { ids: new Map(), createElement(tag) { return new Element(tag, this); }, getElementById(id) { return this.ids.get(id) || null; }, addEventListener() {}, dispatchEvent() {}, querySelectorAll() { return []; } };
  doc.head = new Element('head', doc); doc.body = new Element('body', doc);
  const rows = {
    clientes: [{ id: 'qa_client', tenantId: 'qa_tenant', nombre: 'Cliente sintético', pais: 'GT', moneda: 'GTQ', asesorId: 'qa_advisor' }],
    aseguradoras: [{ id: 'qa_insurer', tenantId: 'qa_tenant', nombre: 'Aseguradora sintética', pais: 'GT', paises: ['GT'], vinculada: true, comisiones: { AUTOMOVILES: 10 } }],
    asesores: [{ id: 'qa_advisor', nombre: 'Asesor sintético', paises: ['GT'], shareCom: 60, comModo: 'comision' }],
    polizas: [], recibosEsperados: [], carteraPrimas: [], vehiculos: [], cobros: [], actividades: [], gestiones: [],
    comisiones: [{ id: 'qa_unrelated_collection_component', valor: 9.79, concepto: 'Componente sintético independiente' }], finmovs: []
  };
  const batches = [], toasts = [], cloneRows = () => clone(rows);
  const store = {
    all: c => rows[c] || [], get: (c,id) => (rows[c] || []).find(r => r.id === id) || null,
    where: (c,predicate) => (rows[c] || []).filter(predicate), pref: (_k,d) => d, on() {},
    insert(c,row) { (rows[c] ||= []).push(clone(row)); }, update(c,id,patch) { Object.assign(store.get(c,id),clone(patch)); },
    async updateDurable(c,id,patch) { store.update(c,id,patch); return { ok: true }; },
    async batchDurable(mutations, options) {
      const next = cloneRows();
      for (const m of mutations) {
        assert.notEqual(m.action, 'remove', 'new contract never physically deletes a record');
        const list = (next[m.collection] ||= []), index = list.findIndex(r => r.id === m.id);
        if (m.action === 'insert') { assert.equal(index,-1,'no duplicate physical insert'); list.push(clone({ ...m.payload, id: m.id })); }
        else { assert.ok(index >= 0, 'updated row exists'); Object.assign(list[index],clone(m.payload)); }
      }
      for (const [c,list] of Object.entries(next)) rows[c] = list;
      batches.push(clone({ mutations, options })); return { ok: true, canonicalReadback: true, canonicalReadbackCount: mutations.length };
    }
  };
  const norm = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const Orbit = {
    store, access: { norm, filter: (_c,x) => x, canView: () => true, can: () => role !== 'Asesor', canWrite: () => role !== 'Asesor', currencyFor: () => 'GTQ', tenantId: () => 'qa_tenant', activeRole: () => role, actorAdvisor: () => ({}), actorUser: () => ({ id: 'qa_actor', nombre: 'Actor sintético' }), audit() {} },
    modules: { cliente360: { render() {}, verPoliza() {}, verVehiculo() {} }, polizas: { render() {} } },
    ui: { today: () => '2026-11-17', esc: x => String(x ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'), money: (n,c) => c + ' ' + Number(n).toFixed(2), toast: x => toasts.push(x) },
    cat: { ramosDe: () => ['AUTOMOVILES'], subramosDe: () => ['AUTO'] }, paisCfg: () => ({ iva: 12, recargoFinanciero: 0, gastosEmision: 0 }), PAISES: [{ id: 'GT', moneda: 'GTQ' }],
    session: { rol: () => role }, tenant: { id: 'qa_tenant' },
    assignableAdvisorRoster: { list: async () => rows.asesores.map(a => ({ ...a, assignable: true, roleEligible: true, activo: true })) },
    q: { portfolioDue: r => r.fechaLimite || r.vence || '', portfolioClassification: r => ({ open: r.carteraActiva !== false, overdue: true, future: false }), expectedReceiptClassification: () => ({ open: true, overdue: true, future: false }) },
    endorsements: {}, ia: { disponible: () => false }
  };
  const context = vm.createContext({ Orbit, document: doc, console, Date, Math, URL, URLSearchParams,
    location: { hostname: 'app.aysseguros.com', hash: '', pathname: '/' }, history: { replaceState() {} },
    setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    addEventListener() {}, dispatchEvent() {}, CustomEvent: class {} });
  context.window = context;
  const load = p => vm.runInContext(read(p), context, { filename: p });
  load(ownerPaths[0]); load(ownerPaths[1]);
  return { Orbit, context, doc, rows, store, batches, toasts, load, async newForm() {
    load(ownerPaths[2]); Orbit.modules.cliente360.nuevaPoliza('qa_client'); await Promise.resolve(); await Promise.resolve();
    const form = doc.getElementById('policy-v1199'); assert.ok(form); return { form, field: name => form.querySelector('[data-' + name + ']') };
  } };
}
function raw(extra = {}) {
  return { id: 'qa_policy', tenantId: 'qa_tenant', clienteId: 'qa_client', asesorId: 'qa_advisor', aseguradoraId: 'qa_insurer',
    numero: 'QA-SYNTHETIC-POLICY', pais: 'GT', moneda: 'GTQ', ramo: 'AUTOMOVILES', producto: 'AUTO', estado: 'Vigente',
    vigenciaInicio: '2026-10-20', vigenciaFin: '2027-10-20', frecuencia: 'Contado', cuotas: 1, formaPago: '', conducto: '',
    primaNeta: 630, gastosEmision: 41.5, otros: 200, gastosFinan: 0, recargoFinPct: 0, ivaPct: 12,
    comAseguradoraPct: 10, comVendedorPct: 60, ...extra };
}
const documented = () => ({ cargoNoGravadoMonto: 2.70, cargoNoGravadoConcepto: 'Bomberos', cargoNoGravadoDocumentRef: 'qa-issued-document',
  vencimientosDocumentados: [{ secuencia: 1, fechaVencimiento: '2026-11-06', documentRef: 'qa-issued-document' }] });
async function create(h, extra) { const result = await h.Orbit.policyReceipts.createPolicy(raw({ ...documented(), ...extra }), { operationId: 'qa_documented_create' }); assert.equal(result.ok,true,JSON.stringify(result)); return result; }

function documentaryFixture({deltaCents=-5,country='GT',currency='GTQ',insurer='qa_any_insurer'}={}){
 const h=harness();h.Orbit.domainConfig={peek:()=>({amountTolerance:0.02})};
 const p=raw({primaTotal:4012.30,prima:4012.30,pais:country,moneda:currency,cuotas:2,frecuencia:'Semestral',aseguradoraId:insurer,sourceDocumentId:'qa_contract_document'});
 h.rows.polizas.push(p);const totalCents=401230+deltaCents;
 for(let i=0;i<2;i++){const amount=(i===0?Math.floor(totalCents/2):totalCents-Math.floor(totalCents/2))/100;h.rows.recibosEsperados.push({id:'qa_receipt_'+i,tenantId:p.tenantId,polizaId:p.id,clienteId:p.clienteId,pais:country,moneda:currency,cuota:(i+1)+'/2',monto:amount,primaTotal:amount,estado:'Pendiente',vence:'2026-11-24'});}
 h.load(ownerPaths[3]);return{h,p,model:h.Orbit.policyVehicleReadModelV1199c};
}
for(const insurer of ['qa_mapfre','qa_el_roble','qa_new_insurer'])test('D01 4012.30 vs4012.25 is nonblocking for '+insurer+' and both source facts remain intact',()=>{
 const {h,p,model}=documentaryFixture({insurer}),before=clone(h.rows);
 assert.equal(model.financialIntegrityBatch([p]).length,0);const pb=model.premiumBreakdown(p);
 assert.equal(pb.total,4012.30);assert.equal(pb.scheduleTotal,4012.25);assert.equal(pb.documentaryVariance.differenceCents,-5);
 assert.equal(pb.documentaryVariance.accepted,true);assert.equal(pb.documentaryVariance.originalSourceRef,'qa_contract_document');
 assert.match(pb.documentaryVariance.documentedSourceRef,/recibosEsperados\/qa_receipt_0#primaTotal/);assert.equal(pb.documentaryVariance.bankSettlementProved,false);
 assert.deepEqual(h.rows,before);assert.equal(h.batches.length,0);
});
for(const deltaCents of [-5,-4,-3,-2,-1,0,1,2,3,4,5])test('integer-cent documentary boundary '+deltaCents+' remains nonblocking',()=>{const {p,model}=documentaryFixture({deltaCents});assert.equal(model.financialIntegrityBatch([p]).length,0);assert.equal(model.premiumBreakdown(p).documentaryVariance.differenceCents,deltaCents);});
for(const deltaCents of [-6,6,-100,100])test('beyond approved documentary boundary '+deltaCents+' remains a visible issue',()=>{const {p,model}=documentaryFixture({deltaCents});const issues=model.financialIntegrityBatch([p]);assert.equal(issues.length,1);assert.equal(issues[0].tolerance,0.05);assert.equal(issues[0].documentaryVariance.accepted,false);});
for(const [country,currency] of [['GT','USD'],['CO','COP'],['CO','GTQ'],['SV','USD']])test('documentary tolerance is not expanded outside '+country+'/'+currency,()=>{const {p,model}=documentaryFixture({country,currency});assert.equal(model.financialIntegrityBatch([p]).length,1);assert.equal(model.premiumBreakdown(p).documentaryVariance.scopeApproved,false);});
for(const [field,value] of [['moneda','USD'],['pais','CO'],['tenantId','qa_other_tenant'],['clienteId','qa_other_client']])test('five cents cannot hide receipt '+field+' drift',()=>{const {h,p,model}=documentaryFixture();h.rows.recibosEsperados[0][field]=value;const issues=model.financialIntegrityBatch([p]);assert.equal(issues.length,1);assert.equal(model.premiumBreakdown(p).documentaryVariance.accepted,false);assert.equal(model.premiumBreakdown(p).documentaryVariance.identityExact,false);});
test('duplicated installment sequence cannot be accepted as rounding',()=>{const {h,p,model}=documentaryFixture();h.rows.recibosEsperados[1].cuota='1/2';assert.equal(model.financialIntegrityBatch([p]).length,1);});
test('a different policy edition is not accepted via monetary proximity',()=>{const {p,model}=documentaryFixture();const schedule=model.receiptSchedule(p.id);schedule.rows[0]={...schedule.rows[0],polizaId:'qa_other_edition'};assert.equal(model.documentaryScheduleVariance(p,schedule).identityExact,false);});
test('configured generic0.09 cannot broaden the approved GTQ0.05 cap',()=>{const {h,p,model}=documentaryFixture({deltaCents:6});h.Orbit.domainConfig.peek=()=>({amountTolerance:0.09});const issues=model.financialIntegrityBatch([p]);assert.equal(issues.length,1);assert.equal(issues[0].tolerance,0.05);});
test('policy detail displays accepted variance and both amounts without a collection or bank adjustment',()=>{
 const {h,p}=documentaryFixture(),host=new Element('div',h.doc,{id:'host'});h.doc.ids.set('host',host);h.Orbit.route={params:{p:p.id}};
 h.Orbit.modules.cliente360.render(host);assert.match(host.innerHTML,/data-documentary-rounding-variance="1"/);assert.match(host.innerHTML,/Q 4,012\.30/);assert.match(host.innerHTML,/Q 4,012\.25/);assert.match(host.innerHTML,/cada recibo mantiene su obligación original/);assert.doesNotMatch(host.innerHTML,/supera tolerancia/);assert.equal(h.rows.cobros.length,0);assert.equal(h.rows.finmovs.length,0);assert.equal(h.batches.length,0);
});
test('same strict documentary helper contract on browser and canonical server owner',()=>{
 const {h}=documentaryFixture(),backend=require(path.join(root,'functions/payment-inference-engine.js'));
 const base={kind:'CONTRACT_SCHEDULE',country:'GT',currency:'GTQ',identityExact:true,original:{amount:4012.30,sourceRef:'qa_contract'},documented:{amount:4012.25,sourceRef:'qa_schedule'}};
 const cases=[base,{...base,country:'CO'},{...base,currency:'USD'},{...base,identityExact:false},{...base,kind:'BANK_STATEMENT_MATCH'},
  {...base,documented:{amount:4012.24,sourceRef:'qa_schedule'}},{...base,documented:{amount:4012.304,sourceRef:'qa_schedule'}},
  {...base,original:{amount:4012.30,sourceRef:''}},{...base,documented:{amount:true,sourceRef:'qa_schedule'}}];
 for(const row of cases)assert.deepEqual(clone(h.Orbit.primas.documentaryAmountVariance(row)),backend.documentaryAmountVariance(row));
 assert.equal(backend.documentaryAmountVariance({...base,kind:'BANK_STATEMENT_MATCH'}).accepted,false);
});
test('configuration renders the GTQ policy separately from generic comparison settings',async()=>{
 const h=harness(),side=new Element('div',h.doc),body=new Element('div',h.doc),host={querySelector:s=>s==='.cfg-side'?side:s==='#cfg-body'?body:null};
 side.insertBefore=button=>side.appendChild(button);let writes=0;
 h.Orbit.domainConfig={get:async()=>({config:{amountTolerance:0.02}}),save:async()=>{writes++;return{};},defaults:()=>({})};
 h.load('orbit360-platform/modules/config-domain-v20260804-bridge.js');h.Orbit.configDomainBridge.mount(host);
 const button=side.children.find(el=>el.dataset.domainConfig==='reconciliation');assert.ok(button);await button.fire('click');await Promise.resolve();
 assert.match(body.innerHTML,/Guatemala \/ GTQ: Q0.05/);assert.match(body.innerHTML,/todas las aseguradoras/);assert.match(body.innerHTML,/los pagos se aplican por su importe real y moneda exacta/);assert.equal(body.querySelector('#rc-amount').value,'0.02');assert.equal(writes,0);
});
