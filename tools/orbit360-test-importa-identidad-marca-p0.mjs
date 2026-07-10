#!/usr/bin/env node
/* Smoke P0 identidad de marca — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

global.window = global;
global.Orbit = {};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-dryrun-p0.js', 'utf8'), { filename: 'importa-dryrun-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-identidad-marca-p0.js', 'utf8'), { filename: 'importa-identidad-marca-p0.js' });

assert.ok(Orbit.importaIdentidadMarcaP0, 'debe registrar Orbit.importaIdentidadMarcaP0');

const built = Orbit.importaIdentidadMarcaP0.buildOperations({
  tenantId: 'tenant_demo',
  sourceFileName: 'Manual Identidad Demo.docx',
  rows: [{
    'Marca cliente': 'Cliente Demo',
    'Color primario': '#C5162E',
    'Color secundario': '#1E2227',
    'Tipografía': 'Manrope / Source Sans 3',
    'Logo cliente': 'logo-demo.png',
    'Versión': '1',
    'Token': 'NO_DEBE_SALIR'
  }]
});

assert.equal(built.sourceType, 'identidad_marca');
assert.equal(built.totalRows, 1);
assert.ok(built.operations.some(op => op.collection === 'configuracionCatalogo'), 'debe proponer configuracion');
assert.ok(built.operations.some(op => op.collection === 'gestiones' && op.data.credentialRef === 'backend_required'), 'secreto debe quedar como gestion segura');
assert.equal(JSON.stringify(built).includes('NO_DEBE_SALIR'), false, 'no debe filtrar secreto real');
assert.equal(JSON.stringify(built).includes('finmovs'), false, 'no debe proponer finmovs');
assert.equal(JSON.stringify(built).includes('polizas'), false, 'no debe proponer polizas');

const report = Orbit.importaIdentidadMarcaP0.buildSanitizedDryRun({
  tenantId: 'tenant_demo',
  sourceFileName: 'Manual Identidad Demo.docx',
  rows: [{ 'Clave': 'marca.color.primario', 'Valor': '#C5162E' }]
});

assert.equal(report.sourceType, 'identidad_marca');
assert.ok(report.operations.some(op => op.collection === 'configuracionCatalogo'), 'dry-run debe traer configuracion');
assert.equal(report.byCollection.configuracionCatalogo >= 1, true);
assert.ok(report.totals.blocked >= 1, 'pendiente_revision debe requerir validacion humana');

const blocked = Orbit.importaDryRunP0.buildDryRun({
  sourceType: 'identidad_marca',
  operations: [{ action: 'insert', collection: 'finmovs', data: { tenantId: 'tenant_demo', clave: 'x', monto: 100 } }]
});
assert.equal(blocked.hasBlockingErrors, true, 'identidad de marca no puede crear finmovs');

console.log('OK P0 brand identity operation builder smoke passed');