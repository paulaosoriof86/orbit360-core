#!/usr/bin/env node
/**
 * Orbit 360 A&S — runner único hotfixes P0 v1330.
 *
 * Uso desde raíz del repo:
 *   node orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
 *
 * Ejecuta en orden los hotfixes P0 preparados post-candidata Claude v1330:
 *   1. Cobros + Conciliaciones
 *   2. Portal
 *   3. Config + Equipo
 *   4. Academia post v1330
 *
 * Luego ejecuta validaciones de sintaxis y, si existe, runner agrupado.
 * No commit, no push, no deploy, no Firestore, no index.html.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const reportRoot = path.join(ROOT, '_orbit360_reports');
const reportFile = path.join(reportRoot, `runner_hotfixes_p0_v1330_${stamp}.md`);
const expectedBranch = 'ays/backend-tenant-lab-v99-20260703';

const scripts = [
  'orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs',
  'orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-PORTAL-V1330.mjs',
  'orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-CONFIG-EQUIPO-V1330.mjs',
  'orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-ACADEMIA-POST-V1330.mjs'
];
const checks = [
  'orbit360-platform/modules/cobros.js',
  'orbit360-platform/modules/conciliaciones.js',
  'orbit360-platform/modules/portal.js',
  'orbit360-platform/modules/configuracion.js',
  'orbit360-platform/modules/equipo.js',
  'orbit360-platform/data/academia-plus.js'
];
const protectedFiles = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'orbit360-platform/core/auth.js',
  'orbit360-platform/core/importa.js',
  'firestore.rules',
  'orbit360-platform/index.html'
];

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  return { cmd: [cmd].concat(args).join(' '), code: r.status || 0, stdout: r.stdout || '', stderr: r.stderr || '' };
}
function branch() { return (run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout || '').trim(); }
function exists(relPath) { return fs.existsSync(path.join(ROOT, relPath)); }
function statProtected() {
  const r = run('git', ['status', '--porcelain', '--'].concat(protectedFiles));
  return r.stdout.trim().split('\n').filter(Boolean);
}
function grepForbidden(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return [];
  const txt = fs.readFileSync(p, 'utf8');
  const hits = [];
  const patterns = [
    ['readAsDataURL', /readAsDataURL/g],
    ['base64', /base64/gi],
    ['factData', /factData/g],
    ['ci-key', /ci-key/g],
    ['saved.key', /saved\.key/g],
    ['key from integration input', /key:\s*back\.querySelector/g]
  ];
  for (const [label, re] of patterns) if (re.test(txt)) hits.push(label);
  return hits;
}

fs.mkdirSync(reportRoot, { recursive: true });
const lines = ['# Runner hotfixes P0 v1330', '', 'Fecha: ' + new Date().toISOString(), 'Raíz: ' + ROOT, ''];
const br = branch();
lines.push('## Rama');
lines.push('Detectada: `' + (br || 'S/D') + '`');
lines.push('Esperada: `' + expectedBranch + '`');
if (br && br !== expectedBranch) {
  lines.push(''); lines.push('**BLOQUEADO:** rama incorrecta.');
  fs.writeFileSync(reportFile, lines.join('\n'), 'utf8');
  console.error(JSON.stringify({ ok: false, status: 'bloqueado', reason: 'rama_incorrecta', branch: br, expectedBranch, reportFile: rel(reportFile) }, null, 2));
  process.exit(1);
}

lines.push(''); lines.push('## Preflight scripts');
for (const s of scripts) {
  const ok = exists(s);
  lines.push('- ' + s + ': ' + (ok ? 'OK' : 'NO EXISTE'));
  if (!ok) {
    fs.writeFileSync(reportFile, lines.join('\n'), 'utf8');
    console.error(JSON.stringify({ ok: false, status: 'bloqueado', reason: 'script_faltante', script: s, reportFile: rel(reportFile) }, null, 2));
    process.exit(1);
  }
}

lines.push(''); lines.push('## Ejecución hotfixes');
const executions = [];
for (const s of scripts) {
  const r = run('node', [s]);
  executions.push(r);
  lines.push('### ' + s);
  lines.push('- exit code: `' + r.code + '`');
  if (r.stdout.trim()) lines.push('```json\n' + r.stdout.trim().slice(0, 5000) + '\n```');
  if (r.stderr.trim()) lines.push('```txt\n' + r.stderr.trim().slice(0, 3000) + '\n```');
  if (r.code !== 0) {
    lines.push(''); lines.push('**BLOQUEADO:** falló hotfix.');
    fs.writeFileSync(reportFile, lines.join('\n'), 'utf8');
    console.error(JSON.stringify({ ok: false, status: 'bloqueado', reason: 'hotfix_fallo', script: s, code: r.code, reportFile: rel(reportFile) }, null, 2));
    process.exit(1);
  }
}

lines.push(''); lines.push('## Validación node --check');
const syntax = [];
for (const f of checks) {
  const r = run('node', ['--check', f]);
  syntax.push({ file: f, code: r.code, stderr: r.stderr });
  lines.push('- ' + f + ': ' + (r.code === 0 ? 'OK' : 'ERROR ' + r.code));
  if (r.stderr.trim()) lines.push('```txt\n' + r.stderr.trim().slice(0, 2000) + '\n```');
}
const syntaxFail = syntax.filter(x => x.code !== 0);

lines.push(''); lines.push('## Búsqueda patrones prohibidos post-hotfix');
const forbidden = [];
for (const f of checks) {
  const hits = grepForbidden(f);
  if (hits.length) forbidden.push({ file: f, hits });
  lines.push('- ' + f + ': ' + (hits.length ? 'HALLAZGOS ' + hits.join(', ') : 'OK'));
}

lines.push(''); lines.push('## Archivos protegidos');
const prot = statProtected();
if (prot.length) prot.forEach(x => lines.push('- ' + x));
else lines.push('- OK: sin cambios detectados en protegidos listados.');

let grouped = null;
const groupedPath = 'tools/orbit360-run-validaciones-agrupadas-v1330.mjs';
if (exists(groupedPath)) {
  grouped = run('node', [groupedPath]);
  lines.push(''); lines.push('## Runner agrupado existente');
  lines.push('- ' + groupedPath + ': exit code `' + grouped.code + '`');
  if (grouped.stdout.trim()) lines.push('```json\n' + grouped.stdout.trim().slice(0, 5000) + '\n```');
  if (grouped.stderr.trim()) lines.push('```txt\n' + grouped.stderr.trim().slice(0, 3000) + '\n```');
} else {
  lines.push(''); lines.push('## Runner agrupado existente');
  lines.push('- No encontrado; se omite.');
}

const ok = syntaxFail.length === 0 && forbidden.length === 0 && prot.length === 0 && (!grouped || grouped.code === 0);
lines.push(''); lines.push('## Resultado');
lines.push(ok ? 'OK — hotfixes P0 aplicados y validados.' : 'BLOQUEADO — revisar hallazgos antes de commit/push/deploy.');
fs.writeFileSync(reportFile, lines.join('\n'), 'utf8');

console.log(JSON.stringify({
  ok,
  status: ok ? 'ok' : 'bloqueado',
  branch: br || null,
  scripts: executions.map(x => ({ cmd: x.cmd, code: x.code })),
  syntax: syntax.map(x => ({ file: x.file, code: x.code })),
  forbidden,
  protectedChanges: prot,
  groupedRunner: grouped ? { path: groupedPath, code: grouped.code } : null,
  reportFile: rel(reportFile)
}, null, 2));
process.exit(ok ? 0 : 1);
