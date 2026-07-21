import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let role = 'Dirección';
const db = {
  aseguradoras: [],
  gestiones: [],
  actividades: [],
  auditLog: []
};

const store = {
  all(collection) {
    return (db[collection] || []).slice();
  },
  get(collection, id) {
    return (db[collection] || []).find((row) => row.id === id) || null;
  },
  insert(collection, row) {
    db[collection] = db[collection] || [];
    const persisted = JSON.parse(JSON.stringify(row || {}));
    db[collection].push(persisted);
    return persisted;
  },
  update(collection, id, patch) {
    db[collection] = db[collection] || [];
    const current = this.get(collection, id);
    if (!current) {
      const created = Object.assign({ id }, JSON.parse(JSON.stringify(patch || {})));
      db[collection].push(created);
      return created;
    }
    Object.assign(current, JSON.parse(JSON.stringify(patch || {})));
    return current;
  }
};

const Orbit = {
  store,
  ui: { today: () => '2026-07-21', toast: () => {} },
  access: {
    activeRole: () => role,
    tenantId: () => 'tenant-a',
    actorUser: () => ({ id: 'u1', nombre: 'Dirección', rolActivo: role }),
    actorAdvisor: () => ({}),
    audit: (...args) => { db.auditLog.push(args); }
  },
  importaDryRunP0: {
    buildDryRun(input) {
      const operations = input.operations.map((op, index) => ({
        index,
        action: op.action,
        collection: op.collection,
        id: op.id,
        blocked: op.data.requiereValidacion || op.data.validationStatus !== 'validado',
        errors: op.data.validacionAlertas || [],
        warnings: [],
        data: { nombre: '***', pais: op.data.pais }
      }));
      return {
        reportId: 'dry_' + String(input.sourceHash || 'nohash'),
        sourceType: input.sourceType,
        sourceFileName: input.sourceFileName,
        sourceHash: input.sourceHash,
        status: 'dry_run_pendiente_revision',
        totals: {
          operations: operations.length,
          insert: operations.filter((item) => item.action === 'insert').length,
          update: operations.filter((item) => item.action === 'update').length,
          blocked: operations.filter((item) => item.blocked).length,
          warnings: 0
        },
        operations,
        blockers: [],
        warnings: []
      };
    }
  }
};

const document = {
  getElementById: () => null,
  addEventListener: () => {},
  createElement: () => ({ className: '', textContent: '', remove() {} }),
  body: { appendChild() {} }
};

const windowObject = {
  Orbit,
  addEventListener: () => {},
  removeEventListener: () => {}
};

const sandbox = {
  window: windowObject,
  Orbit,
  document,
  console,
  Date,
  Math,
  JSON,
  Set,
  Map,
  URL,
  Promise,
  setTimeout,
  clearTimeout,
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
};
windowObject.window = windowObject;
windowObject.document = document;

function load(rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

// Orden real del runtime: importador especializado, contrato canónico y listener P0.
load('core/insurer-directory-import-v1202.js');
load('core/importer-controlled-write-contract-v20260721.js');
load('core/importa-dryrun-p0-wire.js');

assert.ok(Orbit.insurerDirectoryImport, 'Debe existir el owner especializado');
assert.ok(Orbit.importerControlledWriteContractV20260721, 'Debe existir el contrato canónico');
assert.ok(Orbit.importaDryRunP0Wire, 'Debe existir el listener P0');
assert.equal(Orbit.store.__p0DryRunWireContractVersion, '20260721.1');

const gt = {
  'ÍNDICE': [['Resumen']],
  'ASEGURADORA UNO': [
    ['ASEGURADORA UNO'],
    ['Código: C-1 | NIT: N-1'],
    ['Dirección: Zona 1'],
    ['Nombre', 'Cargo', 'Área', 'Ext', 'Email', 'Celular', 'Observaciones'],
    ['Contacto', 'Ejecutivo', 'Comercial', '', 'contacto@example.com', '5555', ''],
    ['Accesos al sistema en línea'],
    ['Producto', 'Link', 'Usuario', 'Contraseña'],
    ['Cotizador', 'https://portal.example.com/login', 'user-real', 'secret-real'],
    ['Datos para transferencias'],
    ['Banco', 'No. de cuenta', 'Tipo de cuenta', 'Notas'],
    ['Banco Uno', '123456789', 'Monetaria', 'Pago de primas']
  ],
  'HOJA INCONSISTENTE': [
    ['ASEGURADORA DOS'],
    ['Nombre', 'Cargo', 'Área', 'Ext', 'Email', 'Celular', 'Observaciones'],
    ['Contacto Dos', 'Ejecutivo', 'Comercial', '', 'dos@example.com', '7777', '']
  ]
};

const parsed = Orbit.insurerDirectoryImport.parseMatrices(gt, {
  country: 'GT',
  fileName: 'directorio-gt-prueba.xlsx',
  sourceHash: '0123456789abcdef',
  captureSecure: true
});

assert.equal(parsed.candidates.length, 2, 'Debe conservar ambos candidatos');
assert.equal(parsed.excluded.length, 1, 'Debe excluir la hoja soporte');
assert.equal(parsed.report.totals.blocked, 1, 'Debe retener la identidad inconsistente');

const applied = await Orbit.insurerDirectoryImport.applyApproved(parsed, {
  approved: true,
  phrase: 'CONFIRMO DIRECTORIO',
  reason: 'Regresión integral de escritura controlada',
  applyValidOnly: true
});

assert.equal(applied.ok, true, 'La confirmación válida debe finalizar correctamente');
assert.equal(applied.inserted, 1, 'Debe declarar una aseguradora creada');
assert.equal(applied.updated, 0, 'No debe declarar actualizaciones inexistentes');
assert.equal(applied.blocked, 1, 'Debe conservar un registro pendiente');
assert.equal(db.aseguradoras.length, 1, 'Una aseguradora debe quedar realmente insertada');
assert.equal(db.gestiones.length, 1, 'La hoja retenida debe dejar una gestión trazable');
assert.equal(db.actividades.length, 1, 'La ejecución debe dejar actividad de auditoría');
assert.equal(db.auditLog.length, 1, 'La ejecución debe invocar auditoría del owner');
assert.equal(applied.inserted, db.aseguradoras.length, 'El resultado no puede declarar éxito sin escritura real');

const persisted = db.aseguradoras[0];
assert.equal(persisted.createdByImport, true, 'Debe persistir marcador canónico de importación');
assert.ok(persisted.importBatchId, 'Debe persistir identificador de lote');
assert.equal(persisted.sourceType, 'directorio_aseguradoras');
assert.equal(persisted.importControl.owner, 'insurer-directory-import-v1202');
assert.equal(persisted.importControl.confirmedBeforeWrite, true);
assert.equal(persisted.fuenteDirectorio.archivo, 'directorio-gt-prueba.xlsx');
assert.equal(persisted.fuenteDirectorio.hoja, 'ASEGURADORA UNO');
assert.equal(persisted.fuenteDirectorio.pais, 'GT');

const serializedStore = JSON.stringify({
  aseguradoras: db.aseguradoras,
  gestiones: db.gestiones,
  actividades: db.actividades
});
assert.ok(!serializedStore.includes('secret-real'), 'La contraseña no debe llegar al store');
assert.ok(!serializedStore.includes('123456789'), 'El número bancario completo no debe llegar al store');
assert.ok(!serializedStore.includes('user-real'), 'El usuario de portal no debe llegar al store');

const pendingAfterConfirmed = Orbit.importaDryRunP0Wire.pending();
assert.equal(Object.keys(pendingAfterConfirmed).length, 0, 'La escritura confirmada no debe generar un segundo dry-run');
assert.equal(Orbit.importaDryRunP0Wire.lastReport(), null, 'No debe existir reporte P0 secundario');

// Caso negativo: una escritura marcada como importada, pero sin contrato ni trazabilidad,
// debe continuar interceptada y no llegar al store.
const unauthorized = Orbit.store.insert('aseguradoras', {
  id: 'asg_no_autorizada',
  nombre: 'Registro sin contrato',
  pais: 'GT',
  importado: true
});
assert.equal(unauthorized._p0DryRunCaptured, true, 'La escritura no autorizada debe quedar capturada');
assert.equal(db.aseguradoras.length, 1, 'La escritura no autorizada no debe persistirse');
assert.equal(Object.keys(Orbit.importaDryRunP0Wire.pending()).length, 1, 'Debe existir un dry-run para la escritura no autorizada');

role = 'Asesor';
const denied = await Orbit.insurerDirectoryImport.applyApproved(parsed, {
  approved: true,
  phrase: 'CONFIRMO DIRECTORIO',
  reason: 'Intento sin permiso',
  applyValidOnly: true
});
assert.equal(denied.ok, false, 'Asesor no debe aplicar directorios');
assert.ok(denied.errors.includes('permiso_importacion_denegado'));

console.log('ORBIT360 DIRECTORIOS ASEGURADORAS CONTROLLED WRITE: OK');
console.log('- orden real de carga reproducido');
console.log('- una aseguradora realmente insertada');
console.log('- cero segundo dry-run y cero falso éxito');
console.log('- secretos y cuentas completas fuera del store');
console.log('- auditoría, trazabilidad y gestión retenida presentes');
console.log('- escrituras sin contrato continúan interceptadas');
