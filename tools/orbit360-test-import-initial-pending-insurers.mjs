import fs from 'node:fs';
import vm from 'node:vm';

const modulePath = 'orbit360-platform/modules/importar-initial-tenant-lab.js';
const source = fs.readFileSync(modulePath, 'utf8');

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
        tenantId: 'alianzas-soluciones',
        sourceSchemaVersion: 'orbit360.initial-tenant-batch.v1',
        expectedCounts: { clientes: 1, clientesRetenidos: 0, aseguradoras: 1 },
        allowedCollections: ['clientes', 'aseguradoras']
      }
    },
    store: {
      all(collection) {
        if (collection === 'asesores') return [advisor];
        return [];
      }
    },
    modules: {}
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: modulePath });

const api = context.Orbit.initialTenantImport;
if (!api) throw new Error('No se exportó Orbit.initialTenantImport.');

function payload(action = 'CREAR_CON_VALIDACION') {
  return {
    schemaVersion: 'orbit360.initial-tenant-batch.v1',
    tenantId: 'alianzas-soluciones',
    sourceType: 'test',
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

const quarantine = api.buildDryRun(payload('CUARENTENA_NO_ESCRIBIR'), profile, { name: 'test.json' }, 'hash-test');
if (!quarantine.batch.hasBlockingErrors) throw new Error('Una cuarentena explícita debe bloquear el dry-run.');
if (!quarantine.diff.blockers.some(x => x.reason === 'cuarentena_fuente')) throw new Error('Falta bloqueo cuarentena_fuente.');

console.log('PASS: contrato de aseguradoras pendientes/cuarentena en carga inicial A&S.');
