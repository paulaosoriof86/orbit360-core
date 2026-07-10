#!/usr/bin/env node
/* Smoke P0 directorio aseguradoras — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

global.window = global;
global.Orbit = {};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-dryrun-p0.js', 'utf8'), { filename: 'importa-dryrun-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-directorio-aseguradoras-p0.js', 'utf8'), { filename: 'importa-directorio-aseguradoras-p0.js' });

assert.ok(Orbit.importaDirectorioAseguradorasP0, 'debe registrar Orbit.importaDirectorioAseguradorasP0');

const built = Orbit.importaDirectorioAseguradorasP0.buildOperations({
  sourceFileName: 'Directorio Demo.xlsx',
  country: 'GT',
  rows: [{
    Aseguradora: 'Aseguradora Demo',
    Contacto: 'Mesa Demo 1',
    Correo: 'mesa@example.com',
    Telefono: '2222-0000',
    Ramos: 'Auto; Vida; Hogar',
    Password: 'NO_DEBE_SALIR'
  }, {
    Aseguradora: 'Aseguradora Demo',
    Contacto: 'Mesa Demo 2',
    Correo: 'duplicado@example.com'
  }]
});

assert.equal(built.sourceType, 'directorio_aseguradoras');
assert.equal(built.totalRows, 2);
assert.ok(built.warnings.some(w => w.code === 'duplicado_probable_aseguradora'), 'debe detectar duplicado probable');
assert.equal(built.operations.filter(op => op.collection === 'aseguradoras').length, 1, 'debe crear una sola aseguradora por llave');
assert.equal(built.operations.filter(op => op.collection === 'contactosAseguradora').length, 2, 'debe conservar multiples contactos de la misma aseguradora');
assert.equal(built.operations.filter(op => op.collection === 'configuracionCatalogo').length, 3, 'debe proponer catalogo/ramos sin duplicar');
const cred = built.operations.find(op => op.collection === 'gestiones' && op.data.credentialRef === 'backend_required');
assert.ok(cred, 'credenciales deben transformarse en gestion backend_required');
assert.equal(JSON.stringify(built).includes('NO_DEBE_SALIR'), false, 'no debe filtrar secreto real');

const report = Orbit.importaDirectorioAseguradorasP0.buildSanitizedDryRun({
  tenantId: 'tenant_demo',
  sourceFileName: 'Directorio Demo.xlsx',
  country: 'GT',
  rows: [{ Aseguradora: 'Aseguradora Demo 2', Contacto: 'Mesa Demo', Correo: 'mesa2@example.com', Ramos: 'Auto' }]
});

assert.equal(report.sourceType, 'directorio_aseguradoras');
assert.equal(report.totals.blocked, 0);
assert.ok(report.sanitizedPreview.length > 0, 'debe traer preview sanitizado');
assert.equal(JSON.stringify(report).includes('mesa2@example.com'), false, 'correo debe quedar sanitizado en reporte');

console.log('OK P0 insurer directory operation builder smoke passed');