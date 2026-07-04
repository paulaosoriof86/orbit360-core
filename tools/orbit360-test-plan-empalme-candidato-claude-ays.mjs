#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S Claude candidate overlay planner
   Creates synthetic candidates in _orbit360_tmp only.
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const planner = path.join(root, 'tools', 'orbit360-plan-empalme-candidato-claude-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'plan-empalme-candidato-claude-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function write(base, rel, content) {
  const abs = path.join(base, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}

function makeCandidate(id, setup) {
  const base = path.join(tmp, id, 'orbit360-platform');
  fs.rmSync(path.join(tmp, id), { recursive: true, force: true });
  fs.mkdirSync(base, { recursive: true });
  write(base, 'index.html', '<!doctype html><script src="modules/inicio.js?v=1"></script>');
  write(base, 'modules/inicio.js', 'window.Orbit = window.Orbit || {};');
  write(base, 'core/app.js', 'window.Orbit = window.Orbit || {};');
  write(base, 'styles/base.css', ':root{--red:#C5162E}');
  if (setup) setup(base);
  return base;
}

function run(id, setup, expectedExit, expectedNeedle) {
  const candidate = makeCandidate(id, setup);
  const res = spawnSync(process.execPath, [planner, '--candidate', candidate], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && out.includes(expectedNeedle);
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected needle: ${expectedNeedle}\n${out}`);
}

if (!fs.existsSync(planner)) {
  console.error('No existe planner.');
  process.exit(1);
}

run('plan-basico', null, 0, 'Decision: PLAN_CON_REVISION');

run('bloquea-fuera-alcance', (base) => {
  write(base, '../package.json', '{"scripts":{"x":"y"}}');
}, 0, 'Decision: PLAN_CON_REVISION');

run('bloquea-sensible-en-platform', (base) => {
  write(base, 'core/serviceAccount.local.js', 'export default {};');
}, 1, 'Decision: BLOQUEADO');

run('preserva-store-demo', (base) => {
  write(base, 'data/store.js', 'window.Orbit = window.Orbit || {};');
}, 0, 'PRESERVAR_BACKEND');

run('manual-core-critico', (base) => {
  write(base, 'core/importa.js', 'export function importar(){}');
}, 0, 'REVISION_MANUAL');

const output = [
  '============================================================',
  'ORBIT 360 - TEST PLAN EMPALME CANDIDATO CLAUDE A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-PLAN-EMPALME-CANDIDATO-CLAUDE-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
