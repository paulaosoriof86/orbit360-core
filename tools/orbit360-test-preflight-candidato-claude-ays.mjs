#!/usr/bin/env node
/* Orbit 360 · Synthetic tests for Claude candidate preflight
   Creates synthetic candidate folders in _orbit360_tmp only.
   No real data, no Firebase, no Firestore, no deploy.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const preflight = path.join(root, 'tools', 'orbit360-preflight-candidato-claude-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'preflight-candidato-claude-ays');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function write(file, content) {
  const abs = path.join(tmp, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

function resetCase(id) {
  const dir = path.join(tmp, id, 'orbit360-platform');
  fs.rmSync(path.join(tmp, id), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function baseCandidate(id) {
  const dir = resetCase(id);
  write(`${id}/orbit360-platform/index.html`, '<!doctype html><script src="core/app.js?v=1"></script><script src="modules/inicio.js?v=1"></script>');
  write(`${id}/orbit360-platform/core/app.js`, 'window.Orbit = window.Orbit || {};');
  write(`${id}/orbit360-platform/core/importa.js`, 'export function ok(){ return true; }');
  write(`${id}/orbit360-platform/modules/inicio.js`, 'window.Orbit = window.Orbit || {}; Orbit.inicio = true;');
  write(`${id}/orbit360-platform/styles/base.css`, ':root{--red:#C5162E}');
  return dir;
}

function run(id, expectedExit, expectedDecision, setup) {
  const candidate = setup(id);
  const res = spawnSync(process.execPath, [preflight, '--candidate', candidate], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const passed = res.status === expectedExit && out.includes(`Decision: ${expectedDecision}`);
  results.push(`${passed ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit} decision=${expectedDecision}`);
  if (!passed) failures.push(`CASE ${id}\n${out}`);
}

if (!fs.existsSync(preflight)) {
  console.error('No existe preflight.');
  process.exit(1);
}

run('ok-minimo', 0, 'REQUIERE_REVISION', (id) => baseCandidate(id));

run('bloquea-nombre-sensible', 1, 'BLOQUEADO', (id) => {
  const dir = baseCandidate(id);
  write(`${id}/orbit360-platform/core/firebase-secret-config.js`, 'export const x = true;');
  return dir;
});

run('advierte-store-demo', 0, 'REQUIERE_REVISION', (id) => {
  const dir = baseCandidate(id);
  write(`${id}/orbit360-platform/data/store.js`, 'window.Orbit = window.Orbit || {};');
  return dir;
});

run('js-invalido', 1, 'BLOQUEADO', (id) => {
  const dir = baseCandidate(id);
  write(`${id}/orbit360-platform/modules/roto.js`, 'function(){');
  return dir;
});

run('texto-tecnico-visible', 0, 'REQUIERE_REVISION', (id) => {
  const dir = baseCandidate(id);
  write(`${id}/orbit360-platform/modules/configuracion.js`, 'export const label = "Pendiente de backend";');
  return dir;
});

const output = [
  '============================================================',
  'ORBIT 360 - TEST PREFLIGHT CANDIDATO CLAUDE A&S',
  `Fecha: ${new Date().toISOString()}`,
  'Restricciones: tests sintéticos, sin datos reales, sin Firebase, sin Firestore.',
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
fs.writeFileSync(path.join(reports, 'TEST-PREFLIGHT-CANDIDATO-CLAUDE-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
