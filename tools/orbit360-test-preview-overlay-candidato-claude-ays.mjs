#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for A&S Claude candidate overlay preview builder
   Creates synthetic candidate + plan in _orbit360_tmp only.
   No real data, no deploy, no merge, no backend writes.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const preview = path.join(root, 'tools', 'orbit360-preview-overlay-candidato-claude-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'preview-overlay-candidato-claude-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function setupCase(id) {
  const base = path.join(tmp, id);
  const candidate = path.join(base, 'candidate', 'orbit360-platform');
  fs.rmSync(base, { recursive: true, force: true });
  fs.mkdirSync(candidate, { recursive: true });

  write(path.join(candidate, 'modules', 'inicio.js'), 'window.Orbit = window.Orbit || {};');
  write(path.join(candidate, 'modules', 'nuevo.js'), 'window.OrbitNuevo = true;');
  write(path.join(candidate, 'core', 'importa.js'), 'export function importar(){}');
  write(path.join(candidate, 'docs', 'nota.md'), '# Nota');
  write(path.join(candidate, 'assets', 'logo.svg'), '<svg></svg>');
  write(path.join(candidate, 'data', 'store.js'), 'window.StoreDemo = true;');

  const plan = {
    version: 'synthetic',
    decision: 'PLAN_CON_REVISION',
    rows: [
      { path: 'orbit360-platform/modules/inicio.js', action: 'CANDIDATO_REEMPLAZABLE_PREVIA_REVISION' },
      { path: 'orbit360-platform/modules/nuevo.js', action: 'CANDIDATO_NUEVO' },
      { path: 'orbit360-platform/core/importa.js', action: 'REVISION_MANUAL' },
      { path: 'orbit360-platform/docs/nota.md', action: 'CANDIDATO_DOC_REVISAR' },
      { path: 'orbit360-platform/assets/logo.svg', action: 'CANDIDATO_ASSET_REVISAR' },
      { path: 'orbit360-platform/data/store.js', action: 'PRESERVAR_BACKEND' }
    ]
  };
  const planPath = path.join(base, 'plan.json');
  write(planPath, JSON.stringify(plan, null, 2));
  return { candidate, planPath };
}

function run(id, extraArgs, expectedExit, expectedNeedles) {
  const { candidate, planPath } = setupCase(id);
  const res = spawnSync(process.execPath, [preview, '--plan', planPath, '--candidate', candidate, ...extraArgs], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && expectedNeedles.every((needle) => out.includes(needle));
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if (!passed) failures.push(`CASE ${id}\nExpected: ${expectedNeedles.join(' | ')}\n${out}`);
}

if (!fs.existsSync(preview)) {
  console.error('No existe preview builder.');
  process.exit(1);
}

run('default-preview', [], 0, ['RESULTADO: OK_PREVIEW', 'Copiados a preview: 2', 'CANDIDATO_NUEVO: 1', 'CANDIDATO_REEMPLAZABLE_PREVIA_REVISION: 1']);
run('include-manual', ['--include-manual'], 0, ['Copiados a preview: 3', 'REVISION_MANUAL: 1']);
run('include-docs-assets', ['--include-docs', '--include-assets'], 0, ['Copiados a preview: 4', 'CANDIDATO_DOC_REVISAR: 1', 'CANDIDATO_ASSET_REVISAR: 1']);

const output = [
  '============================================================',
  'ORBIT 360 - TEST PREVIEW OVERLAY CANDIDATO CLAUDE A&S',
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
fs.writeFileSync(path.join(reports, 'TEST-PREVIEW-OVERLAY-CANDIDATO-CLAUDE-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
