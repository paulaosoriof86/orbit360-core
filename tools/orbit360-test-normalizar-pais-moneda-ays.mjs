#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S country/currency normalizer
   Metadata only. No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const normalizer = path.join(root, 'tools', 'orbit360-normalizar-pais-moneda-ays.mjs');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function run(id, cliArgs, expectedExit, needles) {
  const res = spawnSync(process.execPath, [normalizer, ...cliArgs], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && needles.every((needle) => out.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${out}`);
}

if (!fs.existsSync(normalizer)) {
  console.error('No existe normalizador.');
  process.exit(1);
}

run('gt-listo', ['--country', 'Guatemala', '--currency', 'GTQ', '--sheet-name', 'GT Enero'], 0, ['Decision: LISTO_METADATA', 'País normalizado: GT', 'Moneda normalizada: GTQ']);
run('co-listo', ['--country', 'Colombia', '--currency', 'COP', '--sheet-name', 'CO Enero'], 0, ['Decision: LISTO_METADATA', 'País normalizado: CO', 'Moneda normalizada: COP']);
run('gt-sin-moneda', ['--country', 'Guatemala', '--sheet-name', 'GT Enero'], 0, ['Decision: REQUIERE_VALIDACION', 'Moneda sugerida: GTQ']);
run('incoherente', ['--country', 'Guatemala', '--currency', 'COP'], 1, ['Decision: BLOQUEADO', 'País/moneda incoherente']);
run('ambiguo', ['--text-hint', 'Guatemala y Colombia'], 1, ['Decision: BLOQUEADO', 'País ambiguo']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST NORMALIZAR PAIS/MONEDA A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-NORMALIZAR-PAIS-MONEDA-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
