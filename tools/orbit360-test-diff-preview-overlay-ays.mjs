#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for overlay preview diff reporter
   Creates synthetic preview files in _orbit360_tmp only and compares against repo.
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const diff = path.join(root, 'tools', 'orbit360-diff-preview-overlay-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'diff-preview-overlay-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function setup(id, files) {
  const base = path.join(tmp, id);
  const preview = path.join(base, 'preview');
  const filesRoot = path.join(preview, 'files');
  fs.rmSync(base, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(files)) write(path.join(filesRoot, rel), content);
  return preview;
}

function run(id, files, expectedExit, needles) {
  const preview = setup(id, files);
  const res = spawnSync(process.execPath, [diff, '--preview', preview], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && needles.every((needle) => out.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${needles.join(' | ')}\n${out}`);
}

if (!fs.existsSync(diff)) {
  console.error('No existe diff reporter.');
  process.exit(1);
}

run('nuevo-modulo-bajo', {
  'orbit360-platform/modules/modulo_sintetico.js': 'window.Orbit = window.Orbit || {};'
}, 0, ['Decision: DIFERENCIAS_LISTAS_PARA_REVISION', 'Archivos analizados: 1']);

run('core-critical-medio', {
  'orbit360-platform/core/importa.js': 'export function importar(){ return true; }'
}, 0, ['Riesgo ALTO/MEDIO:', 'critical-path']);

run('default-negocio-alto', {
  'orbit360-platform/modules/polizas.js': 'const estado = "Vigente"; const pais = "GT";'
}, 0, ['Decision: REQUIERE_REVISION_ALTA', 'business-default-risk']);

run('storage-directo-alto', {
  'orbit360-platform/modules/clientes.js': 'localStorage.setItem("x", "y");'
}, 0, ['Decision: REQUIERE_REVISION_ALTA', 'direct-storage-pattern']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST DIFF PREVIEW OVERLAY A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-DIFF-PREVIEW-OVERLAY-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
