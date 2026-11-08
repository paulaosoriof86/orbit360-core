/* Gravicentra Insurance B4-005 · Endosos v1.201
   Pruebas de contrato deterministas: memoria aislada, sin Firebase ni escrituras reales. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const platform = path.resolve(process.cwd(), 'orbit360-platform');
const source = fs.readFileSync(path.join(platform, 'core/endorsement-workflow-v1201.js'), 'utf8');
const read = file => fs.readFileSync(path.join(platform, file), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const approval = { referenciaAseguradora: 'APR-2026-1', documentRef: 'drive:aprobacion-endoso.pdf', fechaEfectiva: '2026-11-07', motivo: 'Aprobación real documentada' };
let passes = 0;
const check = (name, fn) => Promise.resolve().then(fn).then(() => { ++passes; console.log('PASS:', name); });
const deferred = () => { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };

function fixture(initialRole = 'Dirección') {
  const data = {
    clientes: [{ id: 'c1', pais: 'GT', tenantId: 't1', asesorId: 'a1', nombre: 'Cliente sintético' }],
    polizas: [{ id: 'p1', pais: 'GT', tenantId: 't1', asesorId: 'a1', clienteId: 'c1', numero: 'TEST-001', aseguradoraId: 's1',
      vehiculoId: 'v1', moneda: 'GTQ', estado: 'Vigente', frecuencia: 'Contado', historial: [] }],
    vehiculos: [{ id: 'v1', pais: 'GT', tenantId: 't1', clienteId: 'c1', asesorId: 'a1', polizaId: 'p1', estado: 'Activo', placa: 'TEST-OLD' }],
    gestiones: [], actividades: []
  };
  let role = initialRole, nextDelay = null, nextError = null, financialError = null;
  const transactions = [], audits = [], policyUpdates = [];
  const get = (collection, id) => (data[collection] || []).find(record => record.id === id) || null;
  const store = {
    get,
    all: collection => (data[collection] || []).slice(),
    async batchDurable(mutations, { requestId } = {}) {
      if (nextDelay) { const wait = nextDelay; nextDelay = null; await wait; }
      if (nextError) { const error = nextError; nextError = null; throw error; }
      const staged = clone(data);
      for (const mutation of mutations) {
        const rows = staged[mutation.collection] || (staged[mutation.collection] = []);
        const previous = rows.find(row => row.id === mutation.id);
        if (mutation.action === 'insert') {
          if (previous) throw Error('DUPLICATE_INSERT');
          rows.push(clone(mutation.payload));
        } else if (mutation.action === 'update') {
          if (!previous) throw Error('UPDATE_MISSING');
          Object.assign(previous, clone(mutation.payload));
        } else throw Error('INVALID_ACTION');
      }
      for (const collection of Object.keys(staged)) data[collection] = staged[collection];
      transactions.push({ requestId, mutations: clone(mutations) });
      return { ok: true, canonicalReadback: true, mutationCount: mutations.length };
    },
    async updateDurable(collection, id, patch) {
      if (nextDelay) { const wait = nextDelay; nextDelay = null; await wait; }
      if (nextError) { const error = nextError; nextError = null; throw error; }
      const record = get(collection, id);
      if (!record) throw Error('UPDATE_MISSING');
      Object.assign(record, clone(patch));
      return clone(record);
    }
  };
  const access = {
    tenantId: () => 't1',
    activeRole: () => role,
    actorUser: () => ({ nombre: 'Actor QA', rolActivo: role, asesorId: 'a1' }),
    actorAdvisor: () => ({ permisosExtra: [], restricciones: [] }),
    canView: (_, record) => record.pais === 'GT',
    can: (module, action) => action === 'create' && module === 'cliente360' && role !== 'Asesor',
    audit: (...args) => audits.push(args)
  };
  const policyReceipts = {
    async updatePolicy(id, patch, options) {
      policyUpdates.push({ patch: clone(patch), options: clone(options) });
      if (financialError) { const error = financialError; financialError = null; return { ok: false, errors: [error] }; }
      // Retraso realista: la transacción de pólizas/recibos resuelve en microtarea posterior.
      await Promise.resolve();
      Object.assign(get('polizas', id), clone(patch));
      return { ok: true, policy: clone(get('polizas', id)), atomicServerCommit: true };
    }
  };
  const Orbit = { store, access, policyReceipts, cat: { get: () => [] }, ui: { today: () => '2026-11-07' } };
  const context = { window: { Orbit }, Orbit, console, Date, JSON, Math, Set, Promise };
  vm.runInNewContext(source, context, { filename: 'endorsement-workflow-v1201.js' });
  return { engine: Orbit.endorsements, store, data, get, transactions, audits, policyUpdates,
    role: value => { role = value; }, delayNext: promise => { nextDelay = promise; }, failNext: msg => { nextError = new Error(msg); },
    failFinancial: msg => { financialError = msg; } };
}

await check('Solicitar endoso espera confirmación duradera y no altera póliza', async () => {
  const f = fixture(), pause = deferred(), before = clone(f.get('polizas', 'p1'));
  f.delayNext(pause.promise);
  const pending = f.engine.createRequest('p1', 'beneficiarios', { beneficiarios: ['Beneficiario sintético'] }, {});
  await Promise.resolve();
  assert.equal(f.data.gestiones.length, 0);
  pause.resolve();
  const result = await pending;
  assert.equal(result.ok, true);
  assert.equal(result.durable, true);
  assert.equal(f.data.gestiones.length, 1);
  assert.equal(f.data.actividades.length, 1);
  assert.deepEqual(f.get('polizas', 'p1'), before);
  assert.equal(f.transactions[0].mutations.length, 2);
  const again = await f.engine.createRequest('p1', 'beneficiarios', {}, {});
  assert.equal(again.reused, true);
  assert.equal(f.data.gestiones.length, 1);
});

await check('Fallo de escritura no produce solicitud, actividad ni falso PASS', async () => {
  const f = fixture();
  f.failNext('SERVER_REJECTED');
  const result = await f.engine.createRequest('p1', 'beneficiarios', { beneficiarios: ['B'] }, {});
  assert.equal(result.ok, false);
  assert.equal(f.data.gestiones.length, 0);
  assert.equal(f.data.actividades.length, 0);
  assert.equal(f.audits.length, 0);
});

await check('Asesor solicita gestión propia sin escritura prohibida en actividades; no aprueba ni aplica', async () => {
  const f = fixture('Asesor');
  const result = await f.engine.createRequest('p1', 'beneficiarios', { beneficiarios: ['B'] }, {});
  assert.equal(result.ok, true);
  assert.equal(f.transactions[0].mutations.length, 1);
  assert.equal(f.data.actividades.length, 0);
  assert.equal((await f.engine.approve(result.request.id, approval)).errors[0], 'permiso_endoso_denegado');
  assert.equal((await f.engine.apply(result.request.id, approval)).errors[0], 'permiso_endoso_denegado');
  assert.equal(f.get('gestiones', result.request.id).endorsementStage, 'SOLICITADO');
});

await check('País fuera de alcance impide crear solicitud', async () => {
  const f = fixture();
  f.get('polizas', 'p1').pais = 'CO';
  assert.equal((await f.engine.createRequest('p1', 'beneficiarios', {}, {})).errors[0], 'poliza_fuera_alcance');
  assert.equal(f.data.gestiones.length, 0);
});

await check('Aprobación exige referencia/documento/fecha y ACK; fallo mantiene estado', async () => {
  const f = fixture(), request = (await f.engine.createRequest('p1', 'beneficiarios', { beneficiarios: ['B'] }, {})).request;
  assert.equal((await f.engine.approve(request.id, {})).errors[0], 'referencia_aprobacion_requerida');
  assert.equal((await f.engine.approve(request.id, { referenciaAseguradora: 'A' })).errors[0], 'documento_endoso_aprobado_requerido');
  assert.equal((await f.engine.approve(request.id, { referenciaAseguradora: 'A', documentRef: 'doc' })).errors[0], 'fecha_efectiva_requerida');
  f.failNext('SERVER_REJECTED');
  assert.equal((await f.engine.approve(request.id, approval)).ok, false);
  assert.equal(f.get('gestiones', request.id).endorsementStage, 'SOLICITADO');
  const done = await f.engine.approve(request.id, approval);
  assert.equal(done.ok, true);
  assert.equal(f.get('gestiones', request.id).endorsementStage, 'APROBADO_PENDIENTE_APLICACION');
});

await check('Sustitución de vehículo: histórico + nuevo activo + póliza + gestión + actividad, misma transacción', async () => {
  const f = fixture();
  const request = (await f.engine.createRequest('p1', 'sustitucion_vehiculo', {
    vehiculoId: 'v1', nuevoVehiculo: { placa: 'TEST-NEW', marca: 'Marca QA', chasis: 'CH-QA' }
  }, {})).request;
  const result = await f.engine.apply(request.id, approval);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(f.get('vehiculos', 'v1').estado, 'Histórico');
  const active = f.data.vehiculos.find(row => row.id !== 'v1');
  assert.equal(active.estado, 'Activo');
  assert.equal(active.placa, 'TEST-NEW');
  assert.equal(f.get('polizas', 'p1').vehiculoId, active.id);
  assert.equal(f.get('gestiones', request.id).endorsementStage, 'APLICADO');
  assert.equal(f.transactions.at(-1).mutations.length, 5);
  assert.equal(f.data.actividades.length, 2);
  assert.equal((await f.engine.apply(request.id, approval)).alreadyApplied, true);
  assert.equal(f.data.vehiculos.length, 2);
});

await check('Rechazo del lote final no escribe póliza, vehículos ni estado de gestión', async () => {
  const f = fixture();
  const request = (await f.engine.createRequest('p1', 'sustitucion_vehiculo', {
    vehiculoId: 'v1', nuevoVehiculo: { placa: 'TEST-NEW' }
  }, {})).request;
  await f.engine.approve(request.id, approval);
  const previousPolicy = clone(f.get('polizas', 'p1'));
  f.failNext('SERVER_DENIED');
  const result = await f.engine.apply(request.id, approval);
  assert.equal(result.ok, false);
  assert.deepEqual(f.get('polizas', 'p1'), previousPolicy);
  assert.equal(f.get('vehiculos', 'v1').estado, 'Activo');
  assert.equal(f.data.vehiculos.length, 1);
  assert.equal(f.get('gestiones', request.id).endorsementStage, 'APROBADO_PENDIENTE_APLICACION');
  assert.equal((await f.engine.apply(request.id, approval)).ok, true);
});

await check('Beneficiarios y corrección de riesgo comparten lote durable sin campos ajenos', async () => {
  const f = fixture();
  const requestA = (await f.engine.createRequest('p1', 'beneficiarios', { beneficiarios: ['Persona QA'] }, {})).request;
  assert.equal((await f.engine.apply(requestA.id, approval)).ok, true);
  assert.equal(f.get('polizas', 'p1').beneficiarios[0], 'Persona QA');
  const requestB = (await f.engine.createRequest('p1', 'datos_riesgo', { patch: { direccionRiesgo: 'Zona QA', primaTotal: 0 } }, {})).request;
  assert.equal((await f.engine.apply(requestB.id, approval)).ok, true);
  assert.equal(f.get('polizas', 'p1').direccionRiesgo, 'Zona QA');
  assert.equal(f.get('polizas', 'p1').primaTotal, undefined);
  assert.equal((await f.engine.apply(requestA.id, approval)).alreadyApplied, true);
});

await check('Forma de pago: rechazo del motor no cierra gestión; reintento del lote no recalcula recibos', async () => {
  const f = fixture();
  const request = (await f.engine.createRequest('p1', 'forma_pago', {
    frecuencia: 'Mensual', cuotas: 12, formaPago: 'Transferencia'
  }, {})).request;
  await f.engine.approve(request.id, approval);
  f.failFinancial('MOTOR_DENIED');
  assert.equal((await f.engine.apply(request.id, approval)).ok, false);
  assert.equal(f.get('gestiones', request.id).endorsementStage, 'APROBADO_PENDIENTE_APLICACION');
  assert.equal(f.get('polizas', 'p1').frecuencia, 'Contado');
  f.failNext('FINAL_STAGE_FAILED');
  const partial = await f.engine.apply(request.id, approval);
  assert.equal(partial.ok, false);
  assert.equal(partial.partialCommit, true);
  assert.equal(f.get('polizas', 'p1').endosoFinancieroAplicadoId, request.id);
  assert.equal(f.get('gestiones', request.id).endorsementStage, 'APROBADO_PENDIENTE_APLICACION');
  const count = f.policyUpdates.length;
  const result = await f.engine.apply(request.id, approval);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(f.get('polizas', 'p1').frecuencia, 'Mensual');
  assert.equal(f.get('gestiones', request.id).endorsementStage, 'APLICADO');
  assert.equal(f.policyUpdates.length, count);
  assert.equal((await f.engine.apply(request.id, approval)).alreadyApplied, true);
});

await check('UI canónica enlaza solicitud y ambos modales esperan await explícito', async () => {
  const detail = read('modules/policy-receipts-v1199-detail-guard.js');
  const bridge = read('modules/issuance-endosos-v1201-bridge.js');
  const refinements = read('modules/issuance-endosos-v1201-refinements.js');
  assert.match(detail, /data-policy-endoso-request/);
  assert.match(detail, /Orbit\.modules\.cliente360\.endoso\(p\.id\)/);
  assert.match(bridge, /await E\.createRequest\(/);
  assert.match(bridge, /await E\.apply\(/);
  assert.match(refinements, /await I\.advanceRequest\(/);
});

console.log(`B4-005 ENDOSOS DURABLE CONTRACT: ${passes}/${passes} PASS · fixtures sintéticos; sin Firebase, LIVE ni datos reales`);
