#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S conciliaciones persistence plan builder
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const planner = path.join(root, 'tools', 'orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'preparar-persistencia-conciliaciones-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function baseProposal(id = 'conc-demo-1', overrides = {}) {
  return {
    id,
    proposal_id: id,
    tenant_id: 'alianzas-soluciones',
    source_type: 'planilla_comisiones',
    manifest_id: 'manifest-sintetico',
    dryrun_id: 'dryrun-sintetico',
    source_ref: { file: 'fuente-sintetica.xlsx', sheet: 'Hoja1', row_ref: id },
    country: 'GT',
    currency: 'GTQ',
    score: 94,
    score_decision: 'MATCH_EXACTO',
    proposed_action: 'PROPONER_APLICACION_CON_CONFIRMACION',
    queue_state: 'PROPUESTA',
    review_state: 'PENDIENTE',
    links: { poliza_id: 'poliza-demo', cobro_id: 'cobro-demo' },
    origin_candidate_state: 'LISTO',
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z',
    ...overrides
  };
}
function batch(proposals) {
  return {
    version: 'synthetic',
    dryrun: 'dryrun-sintetico',
    source_type: 'planilla_comisiones',
    proposals
  };
}
function run(id, payload, expectedExit, needles) {
  const file = path.join(tmp, `${id}.proposals.local.json`);
  const out = path.join(tmp, `${id}.plan.local.json`);
  writeJson(file, payload);
  const res = spawnSync(process.execPath, [planner, '--proposals', file, '--tenant', 'alianzas-soluciones', '--out', out], { cwd: root, encoding: 'utf8' });
  const stdout = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && needles.every((needle) => stdout.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${stdout}`);
}

if (!fs.existsSync(planner)) {
  console.error('No existe preparador de persistencia conciliaciones.');
  process.exit(1);
}

run('plan-listo', batch([baseProposal('conc-1'), baseProposal('conc-2', { score: 55, score_decision: 'REQUIERE_VALIDACION', proposed_action: 'ENVIAR_A_BANDEJA_VALIDACION', queue_state: 'EN_REVISION', review_state: 'REQUIERE_VALIDACION' })]), 0, ['Decision: PLAN_LISTO', 'Operaciones: 2', 'Listas: 2']);
run('bloquea-aplicada', batch([baseProposal('conc-aplicada', { queue_state: 'APLICADA' })]), 0, ['Decision: PLAN_CON_ADVERTENCIAS', 'Bloqueadas internas: 1']);
run('bloquea-rawrows', { ...batch([baseProposal('conc-raw')]), rawRows: [{ any: 'NO REAL' }] }, 1, ['Decision: BLOQUEADO', 'claves prohibidas']);
run('bloquea-tenant-mix', batch([baseProposal('conc-tenant', { tenant_id: 'otro-tenant' })]), 1, ['Decision: BLOQUEADO', 'Tenant mismatch']);
run('bloquea-duplicado', batch([baseProposal('conc-dupe'), baseProposal('conc-dupe')]), 0, ['Decision: PLAN_CON_ADVERTENCIAS', 'Bloqueadas internas: 1']);
run('bloquea-fuente', batch([baseProposal('conc-fuente', { source_type: 'financiero_historico' })]), 0, ['Decision: PLAN_CON_ADVERTENCIAS', 'Bloqueadas internas: 1']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST PLAN PERSISTENCIA CONCILIACIONES A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-PLAN-PERSISTENCIA-CONCILIACIONES-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
