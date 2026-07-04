#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S safe overlay pipeline
   Creates a synthetic candidate in _orbit360_tmp only.
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pipeline = path.join(root, 'tools', 'orbit360-pipeline-empalme-candidato-claude-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'pipeline-empalme-candidato-claude-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function setupCandidate(id, opts = {}) {
  const base = path.join(tmp, id);
  const candidate = path.join(base, 'orbit360-platform');
  fs.rmSync(base, { recursive: true, force: true });
  write(path.join(candidate, 'index.html'), '<!doctype html><script src="modules/inicio.js"></script>');
  write(path.join(candidate, 'modules', 'inicio.js'), 'window.Orbit = window.Orbit || {};');
  write(path.join(candidate, 'modules', 'clientes.js'), opts.storage ? 'localStorage.setItem("x","y");' : 'window.Clientes = true;');
  write(path.join(candidate, 'core', 'app.js'), 'window.Orbit = window.Orbit || {};');
  write(path.join(candidate, 'styles', 'base.css'), ':root{--red:#C5162E}');
  return candidate;
}

function run(id, opts, expectedExit, needles) {
  const candidate = setupCandidate(id, opts);
  const res = spawnSync(process.execPath, [pipeline, '--candidate', candidate], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && needles.every((needle) => out.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${out}`);
}

if (!fs.existsSync(pipeline)) {
  console.error('No existe pipeline.');
  process.exit(1);
}

run('pipeline-basico', {}, 0, ['PIPELINE', 'preflight:', 'plan:', 'preview:', 'diff:']);
run('pipeline-storage-review', { storage: true }, 0, ['PIPELINE_REQUIERE_REVISION', 'direct-storage-pattern']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST PIPELINE EMPALME CANDIDATO CLAUDE A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-PIPELINE-EMPALME-CANDIDATO-CLAUDE-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
