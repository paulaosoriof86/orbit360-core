import fs from 'node:fs';
import vm from 'node:vm';

const importerPath = 'orbit360-platform/modules/importar-initial-tenant-lab.js';
const writerPath = 'orbit360-platform/core/importa-write-p0.js';
const importerSource = fs.readFileSync(importerPath, 'utf8');
const writerSource = fs.readFileSync(writerPath, 'utf8');

const listeners = new Map();
const documentMock = {
  readyState: 'loading',
  addEventListener(name, fn) { listeners.set(name, fn); },
  querySelector() { return null; },
  createElement() { return { style: {}, dataset: {}, setAttribute() {}, addEventListener() {}, appendChild() {}, click() {}, remove() {} }; },
  body: { appendChild() {} },
  head: { appendChild() {} }
};

const advisor = { id: 'ase-paula', nombre: 'Paula Osorio' };
const rows = { asesores: [advisor], clientes: [], aseguradoras: [], auditoriaImportaciones: [] };
const store = {
  all(collection) { return rows[collection] || []; },
  get(collection, id) { return (rows[collection] || []).find(row => row.id === id) || null; },
  insert(collection, data) {
    rows[collection] = rows[collection] || [];
    const row = { ...data, id: data.id || `${collection}-${rows[collection].length + 1}`, _syncStatus: 'pending' };
    rows[collection].push(row);
    return row;
  },
  update(collection, id, patch) {
    rows[collection] = rows[collection] || [];
    const index = rows[collection].findIndex(row => row.id === id);
    const row = { ...(index >= 0 ? rows[collection][index] : { id }), ...patch, id, _syncStatus: 'pending' };
    if (index >= 0) rows[collection][index] = row;
    else rows[collection].push(row);
    return row;
  },
  _labStatus() { return { writeQueue: [], writeErrors: [], lastWriteOkAt: new Date().toISOString() }; }
};

const context = {
  console,
  URL,
  Blob,
  crypto: globalThis.crypto,
  setTimeout,
  setInterval,
  clearInterval,
  document: documentMock,
  location: { hash: '#/importar' },
  window: null,
  OrbitBackend: { mode: 'firestore-lab', tenantId: 'alianzas-soluciones' },
  Orbit: {
    ui: { esc: String },
    tenant: { get: () => ({ id: 'alianzas-soluciones' }) },
    importInitialProfiles: {
      'alianzas-soluciones': {
        id: 'ays-initial-lab-v1',
        tenantId: 'alianzas-soluciones',
        sourceSchemaVersion: 'orbit360.initial-tenant-batch.v1',
        expectedCounts: { clientes: 1, clientesRetenidos: 0, aseguradoras: 1 },
        allowedCollections: ['clientes', 'aseguradoras']
      }
    },
    store,
    modules: {}
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(importerSource, context, { filename: importerPath });
vm.runInContext(writerSource, context, { filename: writerPath });

const api = context.Orbit.initialTenantImport;
const writer = context.Orbit.importaWriteP0;
if (!api) throw new Error('No se exportó Orbit.initialTenantImport.');
if (!writer) throw new Error('No se exportó Orbit.importaWriteP0.');

function payload(action = 'CREAR_CON_VALIDACION') {
  return {
    schemaVersion: 'orbit360.initial-tenant-batch.v1',
    tenantId: 'alianzas-soluciones',
    sourceType: 'ays-initial-lab-v1',
    security: {
      secretValuesIncluded: false,
      credentialsAsReferencesOnly: true,
      contactsSeparatedFromAccesses: true
    },
    collections: {
      clientes: [{
        id: 'cli-1', tenantId: 'alianzas-soluciones', pais: 'GT', moneda: 'GTQ',
        nombre: 'Cliente prueba', asesorNombre: 'Paula Osorio', requiereValidacion: false
      }],
      aseguradoras: [{
        id: 'aseg-1', tenantId: 'alianzas-soluciones', pais: 'GT', moneda: 'GTQ',
        nombre: 'Aseguradora prueba', canonicalName: 'Aseguradora prueba',
        requiereValidacion: true, validationReason: 'FALTAN_CONTACTOS_OPERATIVOS',
        contactos: [], portales: [], _migration: { dryRunAction: action }
      }]
    },
    retained: { clientes: [] }
  };
}

const profile = context.Orbit.importInitialProfiles['alianzas-soluciones'];
const valid = api.validatePayload(payload(), profile);
if (!valid.ok) throw new Error(`Una alerta de aseguradora no debe bloquear el archivo: ${valid.errors.join(', ')}`);
if (valid.warnings.length !== 1) throw new Error('Debe registrar una advertencia de aseguradora.');

const dry = api.buildDryRun(payload(), profile, { name: 'test.json' }, 'hash-test');
if (dry.batch.hasBlockingErrors) throw new Error('Una aseguradora pendiente no debe bloquear el dry-run.');
if (dry.diff.counts.aseguradorasPendientesValidacion !== 1) throw new Error('Conteo de aseguradoras pendientes incorrecto.');
const insurerOp = dry.batch.operations.find(op => op.collection === 'aseguradoras');
if (!insurerOp) throw new Error('La aseguradora pendiente debe entrar como directorio restringido.');
if (insurerOp.data.requiereValidacion !== true) throw new Error('No se debe borrar requiereValidacion.');
if (insurerOp.data.validationStatus !== 'requiere_validacion') throw new Error('validationStatus incorrecto.');
if (insurerOp.data.vinculada !== false || insurerOp.data.cotizadorHabilitado !== false || insurerOp.data.comparativoHabilitado !== false || insurerOp.data.tarifasHabilitadas !== false) {
  throw new Error('La aseguradora pendiente no quedó restringida.');
}

writer.ALLOWED_COLLECTIONS.push('clientes', 'aseguradoras');
const batchErrors = writer.validateBatch(dry.batch);
if (batchErrors.length) throw new Error(`La escritura controlada bloqueó una aseguradora restringida válida: ${batchErrors.join(', ')}`);

const write = writer.writeBatch(dry.batch, {
  approved: true,
  phrase: 'CONFIRMO ESCRITURA CONTROLADA',
  userId: 'orbit-lab-user',
  reason: 'Prueba contrato pendiente restringido.'
});
if (!write.ok || write.written !== 2) throw new Error(`La escritura controlada falló: ${(write.errors || []).join(', ')}`);
const writtenInsurer = store.get('aseguradoras', 'aseg-1');
if (!writtenInsurer) throw new Error('No se escribió la aseguradora pendiente.');
if (writtenInsurer.validationStatus !== 'requiere_validacion' || writtenInsurer.requiereValidacion !== true) {
  throw new Error('La escritura convirtió indebidamente la aseguradora pendiente en validada.');
}
if (writtenInsurer.vinculada !== false || writtenInsurer.cotizadorHabilitado !== false || writtenInsurer.comparativoHabilitado !== false || writtenInsurer.tarifasHabilitadas !== false || writtenInsurer.estadoOperativo !== 'pendiente_validacion') {
  throw new Error('La escritura no preservó todas las restricciones operativas.');
}

const invalidPending = {
  collection: 'aseguradoras', action: 'insert', data: {
    id: 'aseg-mal', pais: 'GT', moneda: 'GTQ', requiereValidacion: true,
    validationStatus: 'requiere_validacion', estadoOperativo: 'pendiente_validacion',
    vinculada: false, cotizadorHabilitado: true, comparativoHabilitado: false, tarifasHabilitadas: false
  }
};
if (!writer.validateRecord(invalidPending).includes('registro_requiere_validacion')) {
  throw new Error('Una aseguradora pendiente sin restricción completa debe seguir bloqueada.');
}

const quarantine = api.buildDryRun(payload('CUARENTENA_NO_ESCRIBIR'), profile, { name: 'test.json' }, 'hash-test');
if (!quarantine.batch.hasBlockingErrors) throw new Error('Una cuarentena explícita debe bloquear el dry-run.');
if (!quarantine.diff.blockers.some(x => x.reason === 'cuarentena_fuente')) throw new Error('Falta bloqueo cuarentena_fuente.');

console.log('PASS: dry-run y escritura preservan aseguradoras pendientes restringidas; cuarentena sigue bloqueada.');