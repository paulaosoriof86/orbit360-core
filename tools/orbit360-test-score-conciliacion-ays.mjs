#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S reconciliation score
   Creates synthetic metadata-only cases in _orbit360_tmp.
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const scorer = path.join(root, 'tools', 'orbit360-calcular-score-conciliacion-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'score-conciliacion-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function baseCase(sourceType = 'planilla_comisiones') {
  return {
    tenant_id: 'demo-tenant',
    source_type: sourceType,
    country: 'GT',
    currency: 'GTQ',
    source_reliability: 'ALTA',
    source_ref: { file: 'fuente-sintetica.xlsx', sheet: 'Hoja1', row_hash: 'synthetic-only' },
    evidence: {
      policy_match: true,
      receipt_match: true,
      client_match: true,
      insurer_match: true,
      country_match: true,
      currency_match: true,
      amount_match: true,
      period_match: true
    }
  };
}

function run(id, input, expectedExit, needles) {
  const file = path.join(tmp, `${id}.case.local.json`);
  writeJson(file, input);
  const res = spawnSync(process.execPath, [scorer, '--case', file], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && needles.every((needle) => out.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${out}`);
}

if (!fs.existsSync(scorer)) {
  console.error('No existe score conciliacion.');
  process.exit(1);
}

run('match-exacto', baseCase(), 0, ['Decision: MATCH_EXACTO', 'Score: 100']);

run('match-probable', {
  ...baseCase('planilla_aseguradora'),
  source_reliability: 'MEDIA',
  evidence: { ...baseCase().evidence, receipt_match: false }
}, 0, ['Decision: MATCH_PROBABLE']);

run('requiere-validacion', {
  ...baseCase('estado_cuenta_bancario'),
  source_reliability: 'BAJA',
  evidence: { ...baseCase().evidence, receipt_match: false, period_match: false }
}, 0, ['Decision: REQUIERE_VALIDACION']);

run('bloquea-sin-core', {
  ...baseCase('estado_cuenta_bancario'),
  evidence: { ...baseCase().evidence, policy_match: false }
}, 1, ['Decision: BLOQUEADO', 'Falta evidencia núcleo']);

run('bloquea-moneda', {
  ...baseCase(),
  currency: 'COP'
}, 1, ['Decision: BLOQUEADO', 'País/moneda incoherente']);

run('bloquea-payload', {
  ...baseCase(),
  rows: [{ any: 'NO REAL' }]
}, 1, ['Decision: BLOQUEADO', 'claves de filas prohibidas']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST SCORE CONCILIACION A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-SCORE-CONCILIACION-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
