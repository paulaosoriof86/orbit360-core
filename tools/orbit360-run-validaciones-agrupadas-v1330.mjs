#!/usr/bin/env node
/**
 * Orbit 360 A&S — runner agrupado de validaciones v1330.
 *
 * Uso local futuro:
 *   node tools/orbit360-run-validaciones-agrupadas-v1330.mjs
 *   node tools/orbit360-run-validaciones-agrupadas-v1330.mjs --candidate "RUTA_CANDIDATA_EXTRAIDA"
 *
 * No hace commit. No hace push. No hace deploy. No escribe Firestore. No toca producción.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const candidateIdx = args.indexOf('--candidate');
const candidatePath = candidateIdx >= 0 ? args[candidateIdx + 1] : '';
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const reportsDir = path.join(ROOT, '_orbit360_reports');
const reportMd = path.join(reportsDir, `validaciones_agrupadas_v1330_${stamp}.md`);
const reportJson = path.join(reportsDir, `validaciones_agrupadas_v1330_${stamp}.json`);

const expectedBranch = 'ays/backend-tenant-lab-v99-20260703';
const protectedPaths = [
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

const jsTargets = [
  'orbit360-platform/modules/portal.js',
  'orbit360-platform/modules/cobros.js',
  'orbit360-platform/modules/cliente360.js',
  'orbit360-platform/modules/finanzas.js',
  'orbit360-platform/modules/equipo.js',
  'orbit360-platform/modules/configuracion.js',
  'tools/orbit360-validar-modelo-documentos-storage-ays.mjs',
  'tools/orbit360-test-validar-modelo-documentos-storage-ays.mjs',
  'tools/orbit360-validar-portal-cobros-cliente360-documentos-v1330.mjs',
  'tools/orbit360-auditar-candidata-claude-v1330.mjs'
];

const commands = [];
const results = [];

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function sh(label, cmd, args, opts = {}) {
  const started = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: false, ...opts });
  const item = {
    label,
    cmd: [cmd, ...args].join(' '),
    exitCode: r.status ?? 999,
    ms: Date.now() - started,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim()
  };
  results.push(item);
  return item;
}
function addCommand(label, cmd, args, condition = true) {
  if (condition) commands.push({ label, cmd, args });
}
function statusShort() {
  const r = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || '').trim().split(/\r?\n/).filter(Boolean);
}

const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const statusBefore = statusShort();
const protectedDirty = statusBefore.filter(line => {
  const rel = line.slice(3).trim();
  return protectedPaths.includes(rel) || /^tools\/orbit360-/.test(rel) && !/run-validaciones-agrupadas-v1330/.test(rel);
});

for (const rel of jsTargets) addCommand(`node --check ${rel}`, 'node', ['--check', rel], exists(rel));
addCommand('contrato backend LAB', 'node', ['tools/orbit360-validar-backend-lab-contrato.mjs'], exists('tools/orbit360-validar-backend-lab-contrato.mjs'));
addCommand('tests documentos/storage', 'node', ['tools/orbit360-test-validar-modelo-documentos-storage-ays.mjs'], exists('tools/orbit360-test-validar-modelo-documentos-storage-ays.mjs'));
addCommand('validador portal/cobros/cliente360', 'node', ['tools/orbit360-validar-portal-cobros-cliente360-documentos-v1330.mjs'], exists('tools/orbit360-validar-portal-cobros-cliente360-documentos-v1330.mjs'));
if (candidatePath) addCommand('auditor candidata Claude', 'node', ['tools/orbit360-auditar-candidata-claude-v1330.mjs', candidatePath], exists('tools/orbit360-auditar-candidata-claude-v1330.mjs'));

for (const c of commands) sh(c.label, c.cmd, c.args);
const statusAfter = statusShort();

const errors = [];
const warnings = [];
if (branch !== expectedBranch) errors.push(`Rama incorrecta: ${branch}. Esperada: ${expectedBranch}`);
if (protectedDirty.length) errors.push(`Hay archivos protegidos/tooling backend modificados antes del runner: ${protectedDirty.join(' | ')}`);
for (const r of results) {
  if (r.exitCode !== 0) {
    const expectedWarn = r.label === 'contrato backend LAB' && /warning/i.test(r.stdout + r.stderr) && !/error/i.test(r.stdout + r.stderr);
    if (expectedWarn) warnings.push(`${r.label}: revisar warning esperado`);
    else errors.push(`${r.label}: exit ${r.exitCode}`);
  }
}

const summary = {
  ok: errors.length === 0,
  status: errors.length ? 'bloqueado' : warnings.length ? 'ok_con_warnings' : 'ok',
  branch,
  expectedBranch,
  head,
  candidatePath: candidatePath || null,
  statusBefore,
  statusAfter,
  protectedDirty,
  errors,
  warnings,
  results: results.map(r => ({ label: r.label, cmd: r.cmd, exitCode: r.exitCode, ms: r.ms }))
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(reportJson, JSON.stringify(summary, null, 2), 'utf8');

const md = [];
md.push(`# Orbit 360 A&S — validaciones agrupadas v1330`);
md.push('');
md.push(`Fecha: ${new Date().toISOString()}`);
md.push(`Rama: ${branch}`);
md.push(`HEAD: ${head}`);
md.push(`Estado: ${summary.status}`);
md.push('');
md.push(`Reporte JSON: ${path.relative(ROOT, reportJson)}`);
md.push('');
md.push(`## Resultado`);
md.push('');
md.push(`- OK: ${summary.ok ? 'sí' : 'no'}`);
md.push(`- Errores: ${errors.length}`);
md.push(`- Warnings: ${warnings.length}`);
md.push('');
if (errors.length) { md.push('### Errores'); errors.forEach(e => md.push(`- ${e}`)); md.push(''); }
if (warnings.length) { md.push('### Warnings'); warnings.forEach(w => md.push(`- ${w}`)); md.push(''); }
md.push('## Comandos');
md.push('');
for (const r of results) {
  md.push(`### ${r.label}`);
  md.push('');
  md.push('```txt');
  md.push(`${r.cmd}`);
  md.push(`EXIT_CODE=${r.exitCode}`);
  if (r.stdout) md.push(r.stdout.slice(0, 4000));
  if (r.stderr) md.push(r.stderr.slice(0, 4000));
  md.push('```');
  md.push('');
}
md.push('## Git status final');
md.push('');
md.push('```txt');
md.push(statusAfter.join('\n') || 'clean');
md.push('```');
fs.writeFileSync(reportMd, md.join('\n'), 'utf8');

console.log(JSON.stringify({ ...summary, reportMd: path.relative(ROOT, reportMd), reportJson: path.relative(ROOT, reportJson) }, null, 2));
process.exit(summary.ok ? 0 : 1);
