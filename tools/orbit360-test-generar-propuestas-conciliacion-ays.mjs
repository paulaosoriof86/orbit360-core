#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S reconciliation proposal generator
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const generator = path.join(root, 'tools', 'orbit360-generar-propuestas-conciliacion-ays.mjs');
const validator = path.join(root, 'tools', 'orbit360-validar-conciliacion-propuesta-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'generar-propuestas-conciliacion-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function dryRunBase(sourceType = 'planilla_comisiones') {
  return {
    tenant_id: 'demo-tenant',
    source_type: sourceType,
    manifest_id: 'manifest-sintetico',
    dryrun_id: 'dryrun-sintetico',
    country: 'GT',
    currency: 'GTQ',
    write_enabled: false,
    source_ref: { file: 'fuente-sintetica.xlsx', sheets: ['Hoja1'] },
    summary: { rows_total: 3, rows_ready: 1, rows_requires_validation: 1, rows_blocked: 1, rows_omitted: 0, rows_probable_duplicate: 0 },
    candidates: [
      { state: 'LISTO', country: 'GT', currency: 'GTQ', source_ref: { file: 'fuente-sintetica.xlsx', sheet: 'Hoja1', row_ref: 'hash-1' }, score: 96, score_decision: 'MATCH_EXACTO', proposed_action: 'PROPONER_APLICACION_CON_CONFIRMACION', links: { poliza_id: 'poliza-demo', cobro_id: 'cobro-demo' } },
      { state: 'REQUIERE_VALIDACION', country: 'GT', currency: 'GTQ', source_ref: { file: 'fuente-sintetica.xlsx', sheet: 'Hoja1', row_ref: 'hash-2' }, score: 55, score_decision: 'REQUIERE_VALIDACION', proposed_action: 'ENVIAR_A_BANDEJA_VALIDACION' },
      { state: 'BLOQUEADO', country: 'GT', currency: 'GTQ', source_ref: { file: 'fuente-sintetica.xlsx', sheet: 'Hoja1', row_ref: 'hash-3' }, score: 20, score_decision: 'BLOQUEADO', proposed_action: 'NO_APLICAR' }
    ]
  };
}
function run(id, dryrun, expectedExit, needles, validateGenerated = false) {
  const file = path.join(tmp, `${id}.dryrun.local.json`);
  const out = path.join(tmp, `${id}.proposals.local.json`);
  writeJson(file, dryrun);
  const res = spawnSync(process.execPath, [generator, '--dryrun', file, '--out', out], { cwd: root, encoding: 'utf8' });
  const stdout = `${res.stdout || ''}\n${res.stderr || ''}`;
  let passed = res.status === expectedExit && needles.every((needle) => stdout.includes(needle));
  if (passed && validateGenerated && fs.existsSync(out) && fs.existsSync(validator)) {
    const payload = JSON.parse(fs.readFileSync(out, 'utf8'));
    for (const proposal of payload.proposals || []) {
      const proposalFile = path.join(tmp, `${id}-${proposal.proposal_id}.proposal.local.json`);
      writeJson(proposalFile, proposal);
      const vres = spawnSync(process.execPath, [validator, '--proposal', proposalFile], { cwd: root, encoding: 'utf8' });
      if (vres.status !== 0) {
        passed = false;
        failures.push(`VALIDATOR FAIL ${id} ${proposal.proposal_id}\n${vres.stdout}\n${vres.stderr}`);
      }
    }
  }
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${stdout}`);
}

if (!fs.existsSync(generator)) {
  console.error('No existe generador de propuestas.');
  process.exit(1);
}

run('genera-tres-propuestas', dryRunBase(), 0, ['Decision: LISTO_CON_ADVERTENCIAS', 'Propuestas: 3', 'Bloqueadas internas: 1'], true);
run('bloquea-fuente-no-autorizada', dryRunBase('financiero_historico'), 1, ['Decision: BLOQUEADO', 'Fuente no autorizada']);
run('bloquea-write-enabled', { ...dryRunBase(), write_enabled: true }, 1, ['Decision: BLOQUEADO', 'write_enabled=true no permitido']);
run('bloquea-rawrows', { ...dryRunBase(), rawRows: [{ any: 'NO REAL' }] }, 1, ['Decision: BLOQUEADO', 'claves prohibidas']);
run('bloquea-moneda', { ...dryRunBase(), currency: 'COP' }, 1, ['Decision: BLOQUEADO', 'País/moneda incoherente']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST GENERAR PROPUESTAS CONCILIACION A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-GENERAR-PROPUESTAS-CONCILIACION-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
