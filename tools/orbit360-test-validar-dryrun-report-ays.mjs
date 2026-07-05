#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S dry-run report validator
   Creates synthetic metadata-only reports in _orbit360_tmp.
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const validator = path.join(root, 'tools', 'orbit360-validar-dryrun-report-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'validar-dryrun-report-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function baseReport(sourceType = 'planilla_comisiones') {
  return {
    tenant_id: 'demo-tenant',
    source_type: sourceType,
    manifest_id: 'manifest-sintetico',
    country: 'GT',
    currency: 'GTQ',
    write_enabled: false,
    source_ref: { file: 'fuente-sintetica.xlsx', sheets: ['Hoja1'] },
    summary: {
      rows_total: 2,
      rows_ready: 1,
      rows_requires_validation: 1,
      rows_blocked: 0,
      rows_omitted: 0,
      rows_probable_duplicate: 0
    },
    candidates: [
      {
        state: 'LISTO',
        country: 'GT',
        currency: 'GTQ',
        source_ref: { file: 'fuente-sintetica.xlsx', sheet: 'Hoja1', row_ref: 'hash-1' },
        score: 95,
        score_decision: 'MATCH_EXACTO',
        proposed_action: 'PROPONER_APLICACION_CON_CONFIRMACION'
      },
      {
        state: 'REQUIERE_VALIDACION',
        country: 'GT',
        currency: 'GTQ',
        source_ref: { file: 'fuente-sintetica.xlsx', sheet: 'Hoja1', row_ref: 'hash-2' },
        score: 55,
        score_decision: 'REQUIERE_VALIDACION',
        proposed_action: 'ENVIAR_A_BANDEJA_VALIDACION'
      }
    ]
  };
}

function run(id, report, expectedExit, needles) {
  const file = path.join(tmp, `${id}.dryrun.local.json`);
  writeJson(file, report);
  const res = spawnSync(process.execPath, [validator, '--report', file], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && needles.every((needle) => out.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${out}`);
}

if (!fs.existsSync(validator)) {
  console.error('No existe validador dry-run.');
  process.exit(1);
}

run('conciliacion-lista', baseReport(), 0, ['Decision: LISTO_DRYRUN', 'Candidatos: 2']);

run('bloquea-conteo', {
  ...baseReport(),
  summary: { ...baseReport().summary, rows_total: 99 }
}, 1, ['Decision: BLOQUEADO', 'Conteo inconsistente']);

run('bloquea-moneda', {
  ...baseReport(),
  currency: 'COP'
}, 1, ['Decision: BLOQUEADO', 'Moneda incoherente']);

run('bloquea-payload', {
  ...baseReport(),
  rawRows: [{ any: 'NO REAL' }]
}, 1, ['Decision: BLOQUEADO', 'filas/payload prohibidas']);

run('bloquea-score', {
  ...baseReport(),
  candidates: [{ ...baseReport().candidates[0], score_decision: 'MATCH_EXACTO', proposed_action: 'NO_APLICAR' }]
}, 0, ['Decision: LISTO_CON_ADVERTENCIAS', 'MATCH_EXACTO debería proponer aplicación con confirmación']);

run('clientes-sin-candidatos', {
  ...baseReport('clientes'),
  summary: {
    rows_total: 1,
    rows_ready: 1,
    rows_requires_validation: 0,
    rows_blocked: 0,
    rows_omitted: 0,
    rows_probable_duplicate: 0
  },
  candidates: []
}, 0, ['Decision: LISTO_DRYRUN', 'Tipo fuente: clientes']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST VALIDAR DRYRUN REPORT A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-VALIDAR-DRYRUN-REPORT-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
