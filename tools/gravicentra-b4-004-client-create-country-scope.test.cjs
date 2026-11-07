'use strict';

// Runs the real CRM owner, access owner, operational facade and server command.
// Only the DOM and Firebase SDK/storage are in-memory adapters. No network or
// operational writes are possible. This is not signed-in Preview/LIVE UAT.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const bridge = read('orbit360-platform/modules/crm-v1198-operational-bridge.js');
const accessSource = read('orbit360-platform/core/access-scope.js');
const facadeSource = read('orbit360-platform/data/store-firestore-product-operational-p0.js');
const serverSource = read('functions/product-operational-domain.js');
const roles = require(path.join(root, 'functions/product-active-role-contract.js'));
const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
const tenant = 'tenant_client_create_qa';
const actorUid = 'uid_direction_qa';
const docPath = (collection, id) => `tenants/${tenant}/data/${collection}/items/${id}`;

function serverFixture(memberPatch = {}) {
  const member = Object.assign({ tenantId: tenant, status: 'active', active: true,
    roles: ['Dirección'], activeRole: 'Dirección', advisorId: 'advisor_qa', countries: ['GT'] }, memberPatch);
  const docs = new Map([[`tenants/${tenant}/members/${actorUid}`, clone(member)]]);
  let commits = 0, aborts = 0;
  const snapshot = key => ({ id: key.split('/').pop(), exists: docs.has(key), data: () => clone(docs.get(key)) });
  const ref = key => ({ path: key,
    collection: part => ref(key + '/' + part), doc: part => ref(key + '/' + part),
    get: async () => snapshot(key) });
  const db = { collection: part => ref(part), async runTransaction(fn) {
    const staged = new Map();
    try {
      const value = await fn({ get: async target => snapshot(target.path),
        set(target, value, options = {}) {
          const base = staged.has(target.path) ? staged.get(target.path) : docs.get(target.path);
          staged.set(target.path, options.merge ? Object.assign({}, clone(base || {}), clone(value)) : clone(value));
        }, delete(target) { staged.set(target.path, undefined); } });
      for (const [key, value] of staged) value === undefined ? docs.delete(key) : docs.set(key, value);
      commits++; return value;
    } catch (error) { aborts++; throw error; }
  }};
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const unused = name => () => { throw new Error('UNEXPECTED_NONCLIENT_PATH_' + name); };
  const imports = {
    'node:crypto': crypto,
    'firebase-admin/app': { getApps: () => [{ options: {} }], initializeApp: unused('initializeApp') },
    'firebase-admin/firestore': { getFirestore: () => db, FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP_QA' } },
    'firebase-admin/storage': { getStorage: () => ({ bucket: unused('storage') }) },
    'firebase-functions/v2/https': { HttpsError, onCall: (_options, fn) => fn },
    './product-active-role-contract': roles,
    './goal-participation-contract': { validarCambioParticipacion: unused('goalParticipation') },
    './b4-003-scoped-bootstrap-reader': { projectInsurerActivity: unused('insurerProjection') }
  };
  const context = { exports: {}, require(name) { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; },
    process: { env: {} }, Buffer, Date };
  vm.runInNewContext(serverSource, context, { filename: 'functions/product-operational-domain.js' });
  const command = context.exports.orbit360ProductOperationalCommand;
  const invoke = input => command({ auth: { uid: actorUid, token: { email: 'direction@example.invalid' } }, data: input });
  return { docs, member, invoke, metrics: () => ({ commits, aborts }) };
}

function browserFixture(source = bridge, options = {}) {
  const backend = serverFixture(options.member);
  const messages = [], batches = [], calls = [], auxiliaryInserts = [], errors = [];
  const elements = new Map(), mounted = new Map();
  class Element {
    constructor() { this.value = ''; this.style = {}; this.handlers = {}; this.classList = { add() {}, remove() {} }; this.removed = false; }
    addEventListener(kind, fn) { (this.handlers[kind] ||= []).push(fn); }
    remove() { this.removed = true; mounted.delete(this.id); }
    focus() { this.focused = true; }
    querySelector(selector) { return elements.get(selector) || null; }
    querySelectorAll() { return []; }
  }
  for (const id of ['nombre','tipo','pais','id','tel','email','dep','ciu','dir','canal','ase','notas','save'])
    elements.set('#v1198-' + id, new Element());
  const document = { getElementById: id => mounted.get(id) || null, createElement: () => new Element(),
    body: { appendChild: element => mounted.set(element.id, element) }, addEventListener() {}, dispatchEvent() {} };
  const member = Object.assign({}, backend.member, { uid: actorUid, email: 'direction@example.invalid', productReadOnly: true });
  const advisor = { id: 'advisor_qa', nombre: 'Asesor de prueba', pais: 'GT' };
  backend.docs.set(docPath('asesores', advisor.id), advisor);
  for (const row of options.clients || []) backend.docs.set(docPath('clientes', row.id), clone(row));
  const readStore = { __productReadOnlyP0: true,
    _productStatus: () => ({ ready: true, status: 'ready-read-only', noFallback: true, writeEnabled: false }),
    all(collection) { const prefix = docPath(collection, ''); return [...backend.docs].filter(([key]) => key.startsWith(prefix)).map(([,value]) => clone(value)); },
    get: (collection, id) => clone(backend.docs.get(docPath(collection, id))),
    where(collection, pred) { return this.all(collection).filter(pred); }, on() {} };
  const orbit = { modules: { cliente360: { nuevoCliente() { throw new Error('INACTIVE_LEGACY_HANDLER'); } } }, store: readStore,
    PAISES: [{ id:'TODOS', label:'Todos' }, { id:'GT', label:'Guatemala', moneda:'GTQ' }, { id:'CO', label:'Colombia', moneda:'COP' }],
    GEO: { GT: { Guatemala: ['Guatemala'] } }, tenant: { id: tenant },
    auth: { productUser: member, user: () => ({ uid: actorUid, nombre: 'Dirección de prueba', email: member.email }) },
    session: { rol: () => member.activeRole, rolesAsignados: () => member.roles, asesorId: () => 'advisor_qa' },
    ui: { esc: String, toast: value => messages.push(value), today: () => '2026-11-07', confirm: async () => false },
    cat: { get: key => key === 'canales' ? ['Referido','Cliente actual','Cliente antiguo'] : [], all: () => ({}) },
    productRuntimeBrowserProvidersP0: { browserFirestoreWriteAuthorized:false, serverWriteTransport:'firebase-functions', noFallback:true,
      initialize: async () => ({ auth: { currentUser: { uid: actorUid } } }),
      async callFunction(name, input, region) {
        calls.push({ name, input: clone(input), region });
        assert.equal(name, 'orbit360ProductOperationalCommand'); assert.equal(region, 'us-central1');
        return backend.invoke(input);
      } }
  };
  const window = { Orbit: orbit, addEventListener() {}, dispatchEvent() {} };
  const context = { window, Orbit: orbit, document, location: { hostname:'example.invalid', hash:'#/cliente360' },
    CustomEvent: class { constructor(type, value) { this.type = type; this.detail = value && value.detail; } },
    Date, setTimeout, clearTimeout, console };
  vm.createContext(context);
  vm.runInContext(accessSource, context, { filename: 'orbit360-platform/core/access-scope.js' });
  vm.runInContext(facadeSource, context, { filename: 'orbit360-platform/data/store-firestore-product-operational-p0.js' });
  orbit.productOperationalWriteP0.install(readStore);
  const durable = orbit.store.batchDurable;
  orbit.store.batchDurable = async (mutations, config) => {
    batches.push({ mutations: clone(mutations), config: clone(config) });
    try { return await durable(mutations, config); } catch (error) { errors.push(error); throw error; }
  };
  const insert = orbit.store.insert;
  orbit.store.insert = (collection, row) => { auxiliaryInserts.push({ collection, row: clone(row) }); return insert(collection, row); };
  vm.runInContext(source, context, { filename: 'orbit360-platform/modules/crm-v1198-operational-bridge.js' });
  orbit.modules.cliente360.nuevoCliente();
  const form = mounted.get('crm-new-client-v1198');
  const values = Object.assign({ nombre:'Cliente sintético de prueba', tipo:'Persona', pais:'GT', id:'QA-ID-CLIENT',
    tel:'', email:'', dep:'Guatemala', ciu:'Guatemala', dir:'', canal:'Cliente actual', ase:'advisor_qa', notas:'Sólo memoria' }, options.values);
  for (const [id, value] of Object.entries(values)) elements.get('#v1198-' + id).value = value;
  return { backend, orbit, context, messages, batches, calls, errors, auxiliaryInserts, form, elements,
    async click() { for (const fn of elements.get('#v1198-save').handlers.click || []) await fn(); } };
}

const field = 'clienteId: row.id, pais: row.pais, asesorId: row.asesorId,';
assert.equal(bridge.split(field).length, 2, 'Expected one country-binding change in the active CRM create owner');
const beforeBridge = bridge.replace(field, 'clienteId: row.id, asesorId: row.asesorId,');

test('the active CRM owner reproduces the original complete-batch failure without any write', async () => {
  const x = browserFixture(beforeBridge); await x.click();
  assert.ok(x.form.innerHTML.includes('Identidad y contacto'));
  assert.equal(x.batches.length, 1); assert.deepEqual(x.batches[0].mutations.map(m => m.collection), ['clientes','actividades']);
  assert.equal(x.batches[0].mutations[1].payload.pais, undefined);
  assert.equal(x.errors[0].code, 'PRODUCT_WRITE_RECORD_SCOPE_DENIED');
  assert.equal(x.calls.length, 0); assert.equal(x.backend.metrics().commits, 0);
  assert.equal(x.orbit.store.all('clientes').length, 0); assert.equal(x.orbit.store.all('actividades').length, 0);
  assert.equal(x.form.removed, false); assert.equal(x.elements.get('#v1198-save').disabled, false);
  assert.ok(x.messages.some(m => m.includes('formulario permanece abierto')));
});

test('the unchanged backend independently rejects the old batch and rolls back the staged client', async () => {
  const x = browserFixture(beforeBridge); await x.click();
  const batch = x.batches[0];
  await assert.rejects(x.backend.invoke({ tenantId:tenant, activeRole:'Dirección', requestId:batch.config.requestId,
    mutations:batch.mutations }), error => error.code === 'permission-denied' && error.message.includes('actividades/'));
  assert.deepEqual(x.backend.metrics(), { commits:0, aborts:1 });
  assert.equal(x.orbit.store.all('clientes').length, 0); assert.equal(x.orbit.store.all('actividades').length, 0);
  assert.equal([...x.backend.docs.keys()].filter(k => /operationalRequests|operationalEvents/.test(k)).length, 0);
});

test('the fixed active form commits one client and one country-bound activity with canonical readback and server actor', async () => {
  const x = browserFixture(); await x.click();
  assert.equal(x.errors.length, 0); assert.equal(x.calls.length, 1); assert.equal(x.backend.metrics().commits, 1);
  const clients=x.orbit.store.all('clientes'), activities=x.orbit.store.all('actividades');
  assert.equal(clients.length,1); assert.equal(activities.length,1);
  const c=clients[0], a=activities[0];
  assert.match(c.id,/^cli_[a-z0-9]+$/); assert.equal(c.pais,'GT'); assert.equal(c.moneda,'GTQ');
  assert.equal(c.canal,'Cliente actual'); assert.equal(c.estadoOperativo,'pendiente_polizas');
  assert.equal(a.clienteId,c.id); assert.equal(a.pais,c.pais); assert.equal(a.asesorId,c.asesorId);
  const canonicalActivity=x.backend.docs.get(docPath('actividades',a.id));
  assert.equal(canonicalActivity.createdByUid,actorUid); assert.equal(canonicalActivity.updatedByUid,actorUid); assert.equal(canonicalActivity.ownerUid,actorUid);
  assert.ok(c.calidad.alertas.includes('falta_telefono')); assert.equal(c.requiereValidacion,true);
  assert.ok(x.form.removed); assert.equal(x.context.location.hash,'#/cliente360?c='+c.id);
  const events=[...x.backend.docs].filter(([key])=>key.includes('/operationalEvents/'));
  assert.equal(events.length,1); assert.equal(events[0][1].actorUid,actorUid); assert.equal(events[0][1].mutationCount,2);
  assert.equal(events[0][1].activeRole,'direccion');
  const requests=[...x.backend.docs].filter(([key])=>key.includes('/operationalRequests/'));
  assert.equal(requests.length,1); assert.equal(requests[0][1].status,'committed');
  assert.deepEqual(x.orbit.store._operationalWriteStatus().committed,2);
  for(const collection of ['polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','comisiones','finmovs'])
    assert.equal(x.orbit.store.all(collection).length,0,collection+' must not be created by client registration');
  // Existing best-effort access.audit is not the authoritative commit evidence:
  // auditLog is outside this operational contract; its unscoped activity fallback is denied.
  assert.deepEqual(x.auxiliaryInserts.map(i=>i.collection),['auditLog','actividades']);
  const replay=await x.backend.invoke(x.calls[0].input);
  assert.equal(replay.reused,true); assert.equal(replay.canonicalReadback,true); assert.equal(replay.canonicalReadbackCount,2);
  assert.equal(x.orbit.store.all('clientes').length,1); assert.equal(x.orbit.store.all('actividades').length,1);
});

test('foreign country remains denied by both facade and server after the fix', async () => {
  const x=browserFixture(bridge,{values:{pais:'CO'}}); await x.click();
  assert.equal(x.errors[0].code,'PRODUCT_WRITE_RECORD_SCOPE_DENIED'); assert.equal(x.calls.length,0);
  const batch=x.batches[0];
  await assert.rejects(x.backend.invoke({tenantId:tenant,activeRole:'Dirección',requestId:batch.config.requestId,mutations:batch.mutations}),
    error=>error.code==='permission-denied');
  assert.equal(x.orbit.store.all('clientes').length,0); assert.equal(x.backend.metrics().commits,0);
});

test('exact duplicate retains the existing client and never starts the batch', async () => {
  const x=browserFixture(bridge,{clients:[{id:'existing_client',nombre:'Ya registrado',pais:'GT',identificacion:'QA-ID-CLIENT',asesorId:'advisor_qa'}]});
  await x.click(); assert.equal(x.batches.length,0); assert.equal(x.calls.length,0);
  assert.equal(x.orbit.store.all('clientes').length,1); assert.equal(x.form.removed,false);
  assert.ok(x.messages.some(m=>m.includes('identificación o correo coincidente')));
});

test('an unassigned active role cannot use the unchanged backend', async () => {
  const x=browserFixture(); await x.click();
  const request=clone(x.calls[0].input); request.activeRole='SuperAdmin'; request.requestId+='role_reject';
  await assert.rejects(x.backend.invoke(request),error=>error.code==='permission-denied'&&error.message.includes('rol activo'));
  assert.equal(x.orbit.store.all('clientes').length,1); assert.equal(x.orbit.store.all('actividades').length,1);
});
