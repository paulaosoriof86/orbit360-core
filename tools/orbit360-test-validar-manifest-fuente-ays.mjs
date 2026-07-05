#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S source manifest validator
   Creates synthetic manifests only in _orbit360_tmp.
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const validator = path.join(root, 'tools', 'orbit360-validar-manifest-fuente-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'validar-manifest-fuente-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function baseManifest(sourceType) {
  return {
    tenant_id: 'alianzas-soluciones',
    source_type: sourceType,
    files: [{ name: 'fuente-sintetica.xlsx', sheets: ['Hoja1'] }],
    file_hash: 'sha256:synthetic',
    country: 'GT',
    currency: 'GTQ',
    confidence: 0.95,
    schema: { fields: [] },
    destinations: []
  };
}

function run(id, manifest, expectedExit, needles) {
  const file = path.join(tmp, `${id}.manifest.local.json`);
  writeJson(file, manifest);
  const res = spawnSync(process.execPath, [validator, '--manifest', file], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && needles.every((needle) => out.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${out}`);
}

if (!fs.existsSync(validator)) {
  console.error('No existe validador.');
  process.exit(1);
}

run('clientes-listo', {
  ...baseManifest('clientes'),
  schema: { fields: ['nombre', 'identificacion', 'pais'] },
  destinations: ['clientes']
}, 0, ['Decision: LISTO_DRYRUN', 'RESULTADO: OK']);

run('financiero-bloquea-clientes', {
  ...baseManifest('financiero_historico'),
  schema: { fields: ['fecha', 'concepto', 'monto', 'tipo_movimiento', 'moneda', 'pais'] },
  destinations: ['finmovs', 'clientes']
}, 1, ['Decision: BLOQUEADO', 'financiero_historico no puede escribir en clientes']);

run('banco-no-cobros', {
  ...baseManifest('estado_cuenta_bancario'),
  schema: { fields: ['fecha', 'descripcion', 'monto', 'moneda', 'pais'] },
  destinations: ['cobros']
}, 1, ['Decision: BLOQUEADO', 'estado_cuenta_bancario no puede escribir en cobros']);

run('banco-listo-conciliaciones', {
  ...baseManifest('estado_cuenta_bancario'),
  schema: { fields: ['fecha', 'descripcion', 'monto', 'moneda', 'pais'] },
  destinations: ['conciliaciones']
}, 0, ['Decision: LISTO_DRYRUN', 'Destinos permitidos: conciliaciones']);

run('planilla-comisiones-conciliaciones', {
  ...baseManifest('planilla_comisiones'),
  schema: { fields: ['aseguradora', 'periodo', 'comision_pagada', 'moneda', 'pais'] },
  destinations: ['conciliaciones']
}, 0, ['Decision: LISTO_DRYRUN']);

run('pais-moneda-incoherente', {
  ...baseManifest('estado_cuenta_bancario'),
  currency: 'COP',
  schema: { fields: ['fecha', 'descripcion', 'monto', 'moneda', 'pais'] },
  destinations: ['conciliaciones']
}, 1, ['Decision: BLOQUEADO', 'Moneda incoherente']);

run('polizas-campos-faltantes', {
  ...baseManifest('polizas'),
  schema: { fields: ['numero_poliza', 'cliente'] },
  destinations: ['polizas']
}, 1, ['Decision: BLOQUEADO', 'Campos mínimos faltantes']);

run('documentos-no-clientes', {
  ...baseManifest('documentos_soporte'),
  schema: { fields: ['tipo_documento', 'archivo'] },
  destinations: ['clientes']
}, 1, ['Decision: BLOQUEADO', 'documentos_soporte no puede escribir en clientes']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST VALIDAR MANIFEST FUENTE A&S',
  `Fecha: ${new Date().toISOString()}`,
  'Restricciones: tests sintéticos, sin datos reales, sin deploy, sin merge.',
  '============================================================',
  '',
  `Casos: ${results.length}`,
  `FAIL: ${failures.length}`,
  '',
  ...results,
  '',
  ...failures,
  '',
  failures.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');

fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(path.join(reports, 'TEST-VALIDAR-MANIFEST-FUENTE-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
