#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S reconciliation proposal validator
   Creates synthetic metadata-only proposals in _orbit360_tmp.
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const validator = path.join(root, 'tools', 'orbit360-validar-conciliacion-propuesta-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'validar-conciliacion-propuesta-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function baseProposal() {
  return {
    tenant_id: 'demo-tenant',
    proposal_id: 'proposal-sintetica',
    source_type: 'planilla_comisiones',
    manifest_id: 'manifest-sintetico',
    dryrun_id: 'dryrun-sintetico',
    source_ref: { file: 'fuente-sintetica.xlsx', sheet: 'Hoja1', row_ref: 'hash-1' },
    country: 'GT',
    currency: 'GTQ',
    score: 96,
    score_decision: 'MATCH_EXACTO',
    proposed_action: 'PROPONER_APLICACION_CON_CONFIRMACION',
    queue_state: 'PROPUESTA',
    review_state: 'PENDIENTE',
    links: { poliza_id: 'poliza-demo', cobro_id: 'cobro-demo' },
    write_enabled: false
  };
}

function run(id, proposal, expectedExit, needles) {
  const file = path.join(tmp, `${id}.proposal.local.json`);
  writeJson(file, proposal);
  const res = spawnSync(process.execPath, [validator, '--proposal', file], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && needles.every((needle) => out.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${out}`);
}

if (!fs.existsSync(validator)) {
  console.error('No existe validador propuesta conciliación.');
  process.exit(1);
}

run('propuesta-lista', baseProposal(), 0, ['Decision: LISTO_PROPUESTA', 'Score: 96']);

run('bloquea-moneda', {
  ...baseProposal(),
  currency: 'COP'
}, 1, ['Decision: BLOQUEADO', 'País/moneda incoherente']);

run('bloquea-aplicada', {
  ...baseProposal(),
  queue_state: 'APLICADA'
}, 1, ['Decision: BLOQUEADO', 'no puede venir como APLICADA']);

run('bloquea-write', {
  ...baseProposal(),
  write_enabled: true
}, 1, ['Decision: BLOQUEADO', 'write_enabled=true no permitido']);

run('bloquea-apply-payment', {
  ...baseProposal(),
  apply_payment: true
}, 1, ['Decision: BLOQUEADO', 'apply_payment/aplicar_pago=true no permitido']);

run('bloquea-payload', {
  ...baseProposal(),
  rawRows: [{ any: 'NO REAL' }]
}, 1, ['Decision: BLOQUEADO', 'claves prohibidas']);

run('advertencia-sin-links', {
  ...baseProposal(),
  links: {}
}, 0, ['Decision: LISTO_CON_ADVERTENCIAS', 'no incluye poliza/cobro/comision vinculada']);

run('bloquea-fuente', {
  ...baseProposal(),
  source_type: 'financiero_historico'
}, 1, ['Decision: BLOQUEADO', 'Tipo fuente no autorizado']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST VALIDAR PROPUESTA CONCILIACION A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-VALIDAR-CONCILIACION-PROPUESTA-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
