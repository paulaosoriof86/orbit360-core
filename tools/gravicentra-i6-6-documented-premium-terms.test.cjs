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
const root = path.resolve(__dirname, '..');
const preimage = process.env.I66_DOCUMENTED_TERMS_PREIMAGE_ARCHIVE;
const clone = value => JSON.parse(JSON.stringify(value));
const ownerPaths = [
  'core/primas.js', 'core/policy-receipts-engine.js', 'modules/policy-receipts-v1199-bridge.js',
  'modules/policy-receipts-v1199-detail-guard.js', 'core/backend-lab-receipts-portfolio-native-bridge-v20260801.js',
  'core/issuance-workflow-v1201.js', 'modules/issuance-endosos-v1201-bridge.js', 'core/importa.js'
].map(p => 'orbit360-platform/' + p);
function read(p) {
  return preimage && ownerPaths.includes(p)
    ? cp.execFileSync('tar', ['-xOf', preimage, p], { encoding: 'utf8', maxBuffer: 5000000 })
    : fs.readFileSync(path.join(root, p), 'utf8');
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

test('before-after: a separately documented amount gives exact 978.78 without changing IVA or net commission', () => {
  const h = harness(), E = h.Orbit.policyReceipts, p = E.preparePolicy(raw(documented()), null, 'qa_calc'), rows = E.expectedReceipts(p);
  assert.equal(p.primaNeta,630); assert.equal(p.otros,200); assert.equal(p.gastosEmision,41.5); assert.equal(p.baseGravable,871.5);
  assert.equal(p.ivaMonto,104.58); assert.equal(p.primaTotal,978.78); assert.equal(p.cargoNoGravadoMonto,2.7);
  assert.equal(rows.length,1); assert.equal(rows[0].montoTotal,978.78); assert.equal(rows[0].comAseguradora,63); assert.equal(rows[0].comVendedor,37.8);
  assert.equal(rows[0].fechaVencimientoContractual,'2026-11-06'); assert.equal(rows[0].vence,'2026-11-06'); assert.equal(rows[0].fechaLimite,'2026-11-06');
  assert.equal(rows[0].fechaPago,null); assert.equal(h.batches.length,0);
});
test('before-after: exact documentary schedule survives atomic policy/receipt/portfolio commit and reload without payment', async () => {
  const h = harness(), beforeCommission = clone(h.rows.comisiones); await create(h);
  for (const c of ['polizas','recibosEsperados','carteraPrimas']) { assert.equal(h.rows[c].length,1); const r = clone(h.rows[c][0]); assert.equal(r.cargoNoGravadoMonto,2.7); assert.equal(r.cargoNoGravadoDocumentRef,'qa-issued-document'); assert.equal(r.primaTotal,978.78); }
  for (const c of ['recibosEsperados','carteraPrimas']) { assert.equal(h.rows[c][0].vence,'2026-11-06'); assert.equal(h.rows[c][0].fechaLimite,'2026-11-06'); assert.equal(h.rows[c][0].fechaVencimientoContractual,'2026-11-06'); }
  assert.deepEqual(h.rows.comisiones,beforeCommission); assert.equal(h.rows.cobros.length,0); assert.equal(h.rows.finmovs.length,0);
  assert.equal(h.rows.polizas[0].formaPago,''); assert.equal(h.rows.polizas[0].conducto,''); assert.equal(h.rows.polizas[0].requiereValidacion,true);
  assert.ok(h.rows.polizas[0].validacion.alertas.includes('forma_pago_requiere_validacion'));
});
test('before-after: blank new form does not invent credit card or CAT', async () => {
  const h = harness(), { field } = await h.newForm(); assert.equal(field('payment-form').value,''); assert.equal(field('conduct').value,''); assert.equal(h.batches.length,0);
});
test('actual new-policy form keeps optional documentary calendar in a closed details section',async()=>{
  const h=harness(),{form}=await h.newForm();
  const panel=form.innerHTML.match(/<details\b([^>]*data-contractual-calendar-panel[^>]*)>([\s\S]*?)<\/details>/);
  assert.ok(panel);assert.equal(Object.hasOwn(attrs(panel[1]),'open'),false);
  assert.match(panel[2],/<summary\b[^>]*>Vencimientos excepcionales según documento/);
  assert.match(panel[2],/<textarea\b[^>]*data-documented-calendar/);assert.equal(h.batches.length,0);
});
test('new form refuses a payment or issuance write without a user-selected real insurer', async () => {
  const h=harness(), {field}=await h.newForm();
  await field('save').fire('click');
  assert.equal(h.batches.length,0,'No server write before insurer selection');
  assert.match(field('error').textContent,/Selecciona la aseguradora real del documento/);
});

test('before-after: actual new form commits documented charge and contractual date through the canonical owner', async () => {
  const h = harness(), { field } = await h.newForm();
  for (const [key,value] of Object.entries({ insurer:'qa_insurer', number:'QA-FORM-POLICY', product:'AUTO', start:'2026-10-20', end:'2027-10-20', net:'630', issue:'41.50', other:'200', surcharge:'0', nonvat:'2.70', 'nonvat-concept':'Bomberos', 'nonvat-ref':'qa-issued-document', 'documented-calendar':'1 | 2026-11-06 | qa-issued-document', 'commission-insurer':'10', 'commission-seller':'60' })) { assert.ok(field(key),key); field(key).value=value; }
  await field('documented-calendar').fire('input'); assert.match(field('preview').innerHTML,/978\.78/); assert.match(field('preview').innerHTML,/2026-11-06/);
  await field('save').fire('click'); assert.equal(h.batches.length,1,field('error').textContent); assert.equal(h.rows.polizas[0].primaTotal,978.78); assert.equal(h.rows.recibosEsperados[0].fechaVencimientoContractual,'2026-11-06');
});
for (let count = 1; count <= 24; count++) test('non-taxed cents prorate exactly and nonnegatively across '+count+' installments', () => {
  const h=harness(),P=h.Orbit.primas,d=P.desglose(1200,'GT',{gastosEmision:0,otros:0,ivaPct:12,recargoFinPct:0,...documented(),cargoNoGravadoMonto:0.02});
  const rows=P.recibos(d,{frecuencia:'Mensual',cuotas:count,vigenciaInicio:'2026-01-01',comAseguradoraPct:10});
  assert.equal(rows.length,count); assert.ok(rows.every(r=>r.cargoNoGravadoMonto>=0)); assert.equal(rows.reduce((s,r)=>s+Math.round(r.cargoNoGravadoMonto*100),0),2);
  assert.equal(rows.reduce((s,r)=>s+Math.round(r.total*100),0),Math.round(d.total*100)); assert.equal(d.iva,144); assert.equal(d.total,1344.02);
});
for (const value of [-1,Infinity,NaN,'bad',true,{},2.701,'2.70\nBAD']) test('invalid non-taxed amount is rejected without a coercion to zero: '+String(value), async () => {
  const h=harness(), r=await h.Orbit.policyReceipts.createPolicy(raw({...documented(),cargoNoGravadoMonto:value})); assert.equal(r.ok,false); assert.equal(h.batches.length,0); assert.match(r.errors[0],/cargo_no_gravado_/);
});
for (const change of [{cargoNoGravadoConcepto:''},{cargoNoGravadoDocumentRef:''},{cargoNoGravadoConcepto:{}},{cargoNoGravadoDocumentRef:'bad\nref'}]) test('positive charge requires valid explicit concept and document '+JSON.stringify(change),async()=>{
  const h=harness(),r=await h.Orbit.policyReceipts.createPolicy(raw({...documented(),...change}));assert.equal(r.ok,false);assert.equal(h.batches.length,0);
});
const badCalendars = [
  null, {}, [{secuencia:0,fechaVencimiento:'2026-11-06',documentRef:'qa-doc'}],
  [{secuencia:2,fechaVencimiento:'2026-11-06',documentRef:'qa-doc'}],
  [{secuencia:1,fechaVencimiento:'2026-02-30',documentRef:'qa-doc'}],
  [{secuencia:1,fechaVencimiento:'2026-11-06\n',documentRef:'qa-doc'}],
  [{secuencia:1,fechaVencimiento:'2026-11-06',documentRef:''}],
  [{secuencia:1,fechaVencimiento:'2026-11-06',documentRef:'qa-doc',fechaLimiteOperativa:'2026-02-30'}],
  [{secuencia:1,fechaVencimiento:'2026-11-06',documentRef:'qa-doc',monto:978.78}],
  [{secuencia:1,fechaVencimiento:'2026-11-06',documentRef:'qa-doc'},{secuencia:2,fechaVencimiento:'2026-12-06',documentRef:'qa-doc'}]
];
badCalendars.forEach((value,i)=>test('incomplete or malformed documentary calendar fails closed '+i,async()=>{
  const h=harness(),r=await h.Orbit.policyReceipts.createPolicy(raw({...documented(),vencimientosDocumentados:value}));assert.equal(r.ok,false);assert.equal(h.batches.length,0);
}));
for(const count of [0,-1,1.5,25])test('documented installment count must be a bounded positive integer '+count,async()=>{
  const h=harness(),r=await h.Orbit.policyReceipts.createPolicy(raw({...documented(),frecuencia:'Mensual',cuotas:count}));assert.equal(r.ok,false);assert.equal(h.batches.length,0);
});
test('multiple documentary installments require a contiguous ordered complete sequence and exact total',()=>{
  const h=harness(),P=h.Orbit.primas,dues=[{secuencia:1,fechaVencimiento:'2026-11-06',documentRef:'qa-doc'},{secuencia:2,fechaVencimiento:'2026-12-09',documentRef:'qa-doc'}];
  const p=h.Orbit.policyReceipts.preparePolicy(raw({...documented(),frecuencia:'Mensual',cuotas:2,vencimientosDocumentados:dues}),null,'qa_two'),rows=h.Orbit.policyReceipts.expectedReceipts(p);
  assert.deepEqual(clone(rows.map(r=>r.vence)),dues.map(r=>r.fechaVencimiento));assert.equal(rows.reduce((s,r)=>s+Math.round(r.primaTotal*100),0),97878);
  assert.throws(()=>P.calendarioDocumentado([dues[1],dues[0]],2),/secuencia/);
  assert.throws(()=>P.calendarioDocumentado([{...dues[0],fechaVencimiento:'2026-12-10'},dues[1]],2),/orden/);
  assert.throws(()=>P.calendarioDocumentado([dues[0],{...dues[1],secuencia:1}],2),/secuencia/);
});
test('legacy schedule remains unchanged when no documentary overlay or extra charge exists',()=>{
  const h=harness(),E=h.Orbit.policyReceipts,p=E.preparePolicy(raw(),null,'qa_legacy'),r=E.expectedReceipts(p)[0];
  assert.equal(p.primaTotal,976.08);assert.equal(p.ivaMonto,104.58);assert.equal(r.vence,'2026-10-20');assert.equal(r.fechaLimite,'2026-11-04');assert.equal(r.fechaVencimientoContractual,undefined);
});
test('documentary text roundtrips exact sequence, references and independent operational limit',()=>{
  const P=harness().Orbit.primas,rows=[{secuencia:1,fechaVencimiento:'2026-11-06',documentRef:'qa-issued-document',fechaLimiteOperativa:'2026-11-20'}];
  assert.deepEqual(clone(P.parseCalendarioDocumentado(P.formatCalendarioDocumentado(rows),1)),rows);
  assert.throws(()=>P.parseCalendarioDocumentado('1 | 2026-11-06',1),/formato/);assert.throws(()=>P.parseCalendarioDocumentado('1 | 2026-11-06 | qa-doc\n3 | 2026-12-06 | qa-doc',2),/secuencia/);
});
test('idempotent replanning reuses receipt and portfolio IDs and never duplicates a commission',async()=>{
  const h=harness();await create(h);const ids=Object.fromEntries(['recibosEsperados','carteraPrimas'].map(c=>[c,h.rows[c].map(r=>r.id)])),beforeCommission=clone(h.rows.comisiones);
  const result=await h.Orbit.policyReceipts.updatePolicy('qa_policy',{...documented(),sumaAsegurada:10000},{motivo:'Actualización sintética no financiera',operationId:'qa_replan'});assert.equal(result.ok,true,JSON.stringify(result));
  for(const [c,expected]of Object.entries(ids))assert.deepEqual(h.rows[c].map(r=>r.id),expected);
  assert.deepEqual(h.rows.comisiones,beforeCommission);assert.equal(h.rows.recibosEsperados[0].cargoNoGravadoMonto,2.7);assert.equal(h.rows.recibosEsperados[0].vence,'2026-11-06');
});
for(const state of ['Pagado','Conciliado','reported'])test('paid/reported canonical receipt prevents fee or contractual-date changes '+state,async()=>{
  const h=harness();await create(h);Object.assign(h.rows.recibosEsperados[0],state==='reported'?{estadoOperativo:'pago_reportado'}:{estado:state,fechaPago:'2026-10-28'});const before=clone(h.rows),count=h.batches.length;
  for(const patch of [{cargoNoGravadoMonto:3},{vencimientosDocumentados:[{secuencia:1,fechaVencimiento:'2026-11-07',documentRef:'qa-new-doc'}]}]){const r=await h.Orbit.policyReceipts.updatePolicy('qa_policy',patch,{motivo:'Cambio contractual sintético'});assert.equal(r.ok,false);assert.ok(r.errors.includes('pagos_existentes_requieren_endoso'));}
  assert.deepEqual(h.rows,before);assert.equal(h.batches.length,count);
});
test('operational deadline edit does not rewrite the contractual due date and survives unrelated replan',async()=>{
  const h=harness();await create(h);const rid=h.rows.recibosEsperados[0].id;
  let r=await h.Orbit.policyReceipts.updateReceipt(rid,{fechaLimite:'2026-11-25'},{motivo:'Extensión operativa sintética'});assert.equal(r.ok,true);
  for(const c of ['recibosEsperados','carteraPrimas']){assert.equal(h.rows[c][0].vence,'2026-11-06');assert.equal(h.rows[c][0].fechaLimite,'2026-11-25');assert.equal(h.rows[c][0].fechaVencimientoContractual,'2026-11-06');}
  r=await h.Orbit.policyReceipts.updatePolicy('qa_policy',{sumaAsegurada:12345},{motivo:'Cambio no financiero'});assert.equal(r.ok,true);assert.equal(h.rows.recibosEsperados[0].fechaLimite,'2026-11-25');
  r=await h.Orbit.policyReceipts.updateReceipt(rid,{fechaLimite:'2026-11-05'},{motivo:'Límite operativo anticipado sintético'});assert.equal(r.ok,true);
  r=await h.Orbit.policyReceipts.updatePolicy('qa_policy',{sumaAsegurada:12346},{motivo:'Otro cambio no financiero'});assert.equal(r.ok,true);
  for(const c of ['recibosEsperados','carteraPrimas']){assert.equal(h.rows[c][0].vence,'2026-11-06');assert.equal(h.rows[c][0].fechaLimite,'2026-11-05');assert.equal(h.rows[c][0].fechaVencimientoContractual,'2026-11-06');}
  r=await h.Orbit.policyReceipts.updateReceipt(rid,{fechaLimite:'2026-02-30'},{motivo:'Fecha civil inválida sintética'});assert.equal(r.ok,false);
});
test('documented operational deadline may precede contractual due without moving the contractual calendar',async()=>{
  const h=harness();await create(h,{vencimientosDocumentados:[{secuencia:1,fechaVencimiento:'2026-11-06',fechaLimiteOperativa:'2026-10-31',documentRef:'qa-issued-document'}]});
  for(const c of ['recibosEsperados','carteraPrimas']){assert.equal(h.rows[c][0].vence,'2026-11-06');assert.equal(h.rows[c][0].fechaLimite,'2026-10-31');assert.equal(h.rows[c][0].fechaVencimientoContractual,'2026-11-06');}
});
test('individual receipt editor cannot mutate contractual charge/date independently of its policy',async()=>{
  const h=harness();await create(h);const rid=h.rows.recibosEsperados[0].id,before=clone(h.rows),count=h.batches.length;
  for(const patch of [{cargoNoGravadoMonto:4},{fechaVencimientoContractual:'2026-11-07'}]){const r=await h.Orbit.policyReceipts.updateReceipt(rid,patch,{motivo:'Cambio sintético no permitido'});assert.equal(r.ok,false);assert.ok(r.errors.includes('condicion_contractual_editar_desde_poliza'));}
  assert.equal(h.batches.length,count);assert.deepEqual(h.rows,before);
});
test('actual receipt editor/detail and policy read model display charge, provenance and both dates distinctly',async()=>{
  const h=harness();await create(h);h.load(ownerPaths[3]);h.load(ownerPaths[4]);
  const model=h.Orbit.policyVehicleReadModelV1199c,pb=model.premiumBreakdown(h.rows.polizas[0]);assert.equal(pb.nonVat,2.7);assert.equal(pb.iva,104.58);assert.equal(pb.total,978.78);
  const host=new Element('div',h.doc,{id:'host'});h.doc.ids.set('host',host);const projection=h.Orbit.receiptsPortfolioProjection;
  assert.equal(projection.renderReceiptDetail(h.rows.recibosEsperados[0].id,'qa_client'),true);assert.match(host.innerHTML,/Bomberos/);assert.match(host.innerHTML,/Q 2\.70/);assert.match(host.innerHTML,/qa-issued-document/);assert.match(host.innerHTML,/Vencimiento contractual documentado/);assert.match(host.innerHTML,/Fecha límite operativa/);
  assert.equal(projection.editReceipt(h.rows.recibosEsperados[0].id,'qa_client'),true);const edit=h.doc.getElementById('rp-edit-receipt');assert.match(edit.innerHTML,/Cargo no gravado/);assert.match(edit.innerHTML,/Editar plan de recibos/);assert.equal(edit.querySelector('[data-rp-due]').value,'2026-11-06');
});
for(const role of ['Dirección','Operativo','Admin','AdminTenant','SuperAdmin'])test('existing managed role can create the documented plan without extra privileges '+role,async()=>{const h=harness({role});await create(h);assert.equal(h.rows.cobros.length,0);});
test('Asesor cannot use new fields to elevate policy-write permissions',async()=>{const h=harness({role:'Asesor'}),r=await h.Orbit.policyReceipts.createPolicy(raw(documented()));assert.equal(r.ok,false);assert.equal(h.batches.length,0);});

function instrumentPrivate(h,p,names) {
  // Inspection-only exports of lexical helpers; the exercised function bodies
  // are unchanged. This never modifies a source file or inserts a runtime hook.
  const code=read(p), last=p===ownerPaths[7]?code.lastIndexOf('  return { open, openFor, readPaymentEvidence, close, KINDS };'):code.lastIndexOf('})();');assert.ok(last>=0);
  vm.runInContext(code.slice(0,last)+';window.__qaPrivate={'+names.join(',')+(p===ownerPaths[7]?',setState(value){state=value;}':'')+'};\n'+code.slice(last),h.context,{filename:p});
  return h.context.__qaPrivate;
}
test('policy import keeps assistance/extra charge separate and never derives conduct from payment method',async()=>{
  const h=harness(),I=instrumentPrivate(h,ownerPaths[7],['IMPORT_MAP','canonicalPolicyImportPayload','applyPolicyImport','state']);
  const rec={numero:'QA-IMPORTED',clienteId:'qa_client',asesorId:'qa_advisor',aseguradoraId:'qa_insurer',ramo:'AUTOMOVILES',producto:'AUTO',pais:'GT',moneda:'GTQ',primaNeta:630,primaTotal:978.78,gastos:41.5,iva:104.58,otros:200,...documented(),formaPago:'Transferencia',estadoPol:'Vigente',frecuencia:'Contado',cuotas:1,vencimientosDocumentadosTexto:'1 | 2026-11-06 | qa-issued-document'};
  I.IMPORT_MAP.polizas.build(rec);const p=I.canonicalPolicyImportPayload(rec);assert.equal(p.conducto,'');assert.equal(p.primaNeta,630);assert.equal(p.otros,200);assert.equal(p.cargoNoGravadoMonto,2.7);assert.equal(p.vencimientosDocumentados[0].fechaVencimiento,'2026-11-06');assert.equal(p.vencimientosDocumentadosTexto,undefined);
  const map=I.IMPORT_MAP.polizas.fields;assert.ok(map.conducto.includes('conducto'));assert.ok(!map.formaPago.includes('conducto'));
  assert.throws(()=>I.IMPORT_MAP.polizas.build({...rec,cargoNoGravadoMonto:'invalid'}),/cargo_no_gravado/);
});
test('invalid documentary import row is rejected before any canonical write while a valid next row is retained',async()=>{
  const h=harness(),I=instrumentPrivate(h,ownerPaths[7],['IMPORT_MAP','applyPolicyImport','state']);
  const headers=['numero','clienteId','asesorId','aseguradoraId','ramo','producto','pais','moneda','primaNeta','primaTotal','gastos','iva','otros','cargoNoGravadoMonto','cargoNoGravadoConcepto','cargoNoGravadoDocumentRef','vigenciaIni','vigenciaFin','estadoPol','frecuencia'];
  const valid=['QA-VALID','qa_client','qa_advisor','qa_insurer','AUTOMOVILES','AUTO','GT','GTQ','630','978.78','41.50','104.58','200','2.70','Bomberos','qa-issued-document','2026-10-20','2027-10-20','Vigente','Contado'];
  const invalid=valid.slice();invalid[0]='QA-INVALID';invalid[13]='not an amount';I.setState({parsed:{headers,rows:[invalid,valid]}});
  const out=await I.applyPolicyImport(I.IMPORT_MAP.polizas,Object.fromEntries(headers.map((key,i)=>[key,i])));
  assert.equal(out.rejected,1);assert.equal(out.created,1);assert.equal(h.rows.polizas.length,1);assert.equal(h.rows.polizas[0].numero,'QA-VALID');assert.equal(h.rows.polizas[0].primaTotal,978.78);
});
test('issuance adapter preserves current documented terms and an explicitly unknown method/conduct',async()=>{
  const h=harness();h.load(ownerPaths[5]);h.rows.gestiones.push({id:'qa_issue',workflowType:'issuance_request',clienteId:'qa_client',asesorId:'qa_advisor',aseguradoraId:'qa_insurer',pais:'GT',moneda:'GTQ',ramo:'AUTOMOVILES',producto:'AUTO',acceptedOffer:{...raw(),...documented(),formaPago:'Transferencia',conducto:'Cobro de la aseguradora'}});
  const result=await h.Orbit.issuance.issueRequest('qa_issue',{...raw(),...documented(),documentRef:'qa-issued-document',formaPago:'',conducto:''},{operationId:'qa_issue_op'});
  assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.policy.cargoNoGravadoMonto,2.7);assert.equal(result.policy.formaPago,'');assert.equal(result.policy.conducto,'');assert.equal(h.rows.recibosEsperados[0].vence,'2026-11-06');
});
test('renewal never silently copies old documentary dates or drops a positive documented charge',async()=>{
  const h=harness();await create(h);h.load(ownerPaths[5]);h.rows.gestiones.push({id:'qa_renewal',workflowType:'renewal_accepted',acceptedConfirmed:true,sourcePolicyId:'qa_policy'});
  const input={numero:'QA-RENEWED',vigenciaInicio:'2027-10-20',vigenciaFin:'2028-10-20',documentRef:'qa-renewal-document',formaPago:'',conducto:''};
  let result=await h.Orbit.issuance.createDirectRenewal('qa_renewal',input);assert.equal(result.ok,false);assert.equal(h.rows.polizas.length,1);
  result=await h.Orbit.issuance.createDirectRenewal('qa_renewal',{...input,...documented(),cargoNoGravadoDocumentRef:'qa-renewal-document',vencimientosDocumentados:[{secuencia:1,fechaVencimiento:'2027-11-09',documentRef:'qa-renewal-document'}]},{operationId:'qa_renewal_op'});
  assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.policy.cargoNoGravadoMonto,2.7);assert.equal(result.policy.formaPago,'');assert.equal(result.policy.conducto,'');assert.equal(h.rows.recibosEsperados.find(r=>r.polizaId===result.policy.id).vence,'2027-11-09');
});
test('issuance/renewal UI adapters collect the same canonical fields without copying old renewal dates',()=>{
  const h=harness();h.load(ownerPaths[5]);const adapter=instrumentPrivate(h,ownerPaths[6],['documentedFieldsHtml','documentedFieldsPayload']);
  const html=adapter.documentedFieldsHtml('qa',documented(),true);assert.match(html,/Cargo documentado no gravado/);assert.doesNotMatch(html,/2026-11-06/);
  const values={'#qa-nonvat':'2.70','#qa-nonvat-concept':'Bomberos','#qa-nonvat-ref':'','#qa-documented-calendar':'1 | 2027-11-09 | qa-new-source'};
  const out=adapter.documentedFieldsPayload(s=>({value:values[s]}),'qa',1,'qa-new-source');assert.equal(out.cargoNoGravadoDocumentRef,'qa-new-source');assert.equal(out.vencimientosDocumentados[0].fechaVencimiento,'2027-11-09');
});
