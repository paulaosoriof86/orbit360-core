#!/usr/bin/env node
/**
 * Orbit 360 A&S — validar estado post-runner hotfixes P0 v1330.
 *
 * Uso desde raíz del repo, después de ejecutar el runner P0:
 *   node orbit360-platform/docs/scripts/VALIDAR-POST-RUNNER-HOTFIXES-P0-V1330.mjs
 *
 * No aplica cambios. Solo valida readiness para commit local controlado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const reportRoot = path.join(ROOT, '_orbit360_reports');
const reportFile = path.join(reportRoot, `validar_post_runner_hotfixes_p0_v1330_${stamp}.md`);
const expectedBranch = 'ays/backend-tenant-lab-v99-20260703';

const allowedChanged = [
  'orbit360-platform/modules/cobros.js',
  'orbit360-platform/modules/conciliaciones.js',
  'orbit360-platform/modules/portal.js',
  'orbit360-platform/modules/configuracion.js',
  'orbit360-platform/modules/equipo.js',
  'orbit360-platform/data/academia-plus.js'
];
const protectedFiles = [
  'orbit360-platform/index.html',
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'orbit360-platform/core/auth.js',
  'orbit360-platform/core/importa.js',
  'firestore.rules'
];
const forbidden = [
  ['Cobros readAsDataURL', 'orbit360-platform/modules/cobros.js', /readAsDataURL/g],
  ['Cobros factData', 'orbit360-platform/modules/cobros.js', /factData/g],
  ['Cobros base64', 'orbit360-platform/modules/cobros.js', /base64/gi],
  ['Portal readAsDataURL', 'orbit360-platform/modules/portal.js', /readAsDataURL/g],
  ['Portal base64', 'orbit360-platform/modules/portal.js', /base64/gi],
  ['Config ci-key', 'orbit360-platform/modules/configuracion.js', /ci-key/g],
  ['Config saved.key', 'orbit360-platform/modules/configuracion.js', /saved\.key/g],
  ['Config token/key directo', 'orbit360-platform/modules/configuracion.js', /key:\s*back\.querySelector/g],
  ['Config label Token', 'orbit360-platform/modules/configuracion.js', /Token|API key|Clave secreta|Secreto/gi]
];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  return { cmd: [cmd].concat(args).join(' '), code: r.status || 0, stdout: r.stdout || '', stderr: r.stderr || '' };
}
function branch() { return (run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout || '').trim(); }
function read(rel) { const p = path.join(ROOT, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }
function statusFiles() {
  const r = run('git', ['status', '--porcelain']);
  return r.stdout.trim().split('\n').filter(Boolean).map(line => ({ raw: line, path: line.slice(3).trim() }));
}
function checkSyntax(rel) { return run('node', ['--check', rel]); }
function has(rel, re) { const txt = read(rel); return re.test(txt); }

fs.mkdirSync(reportRoot, { recursive: true });
const lines = ['# Validación post-runner hotfixes P0 v1330', '', 'Fecha: ' + new Date().toISOString(), 'Raíz: ' + ROOT, ''];
const br = branch();
let ok = true;
const blockers = [];

lines.push('## Rama');
lines.push('- Detectada: `' + (br || 'S/D') + '`');
lines.push('- Esperada: `' + expectedBranch + '`');
if (br !== expectedBranch) { ok = false; blockers.push('rama_incorrecta'); }

lines.push(''); lines.push('## Git status');
const st = statusFiles();
if (!st.length) lines.push('- Worktree sin cambios detectados. Si acabas de correr el runner, esto significa que no aplicó cambios o ya estaban aplicados.');
else st.forEach(x => lines.push('- `' + x.raw + '`'));

const changedPaths = st.map(x => x.path).filter(p => !p.startsWith('_backups/') && !p.startsWith('_orbit360_reports/'));
const unexpected = changedPaths.filter(p => !allowedChanged.includes(p));
if (unexpected.length) { ok = false; blockers.push('cambios_fuera_de_lista_permitida'); }

lines.push(''); lines.push('## Cambios permitidos');
allowedChanged.forEach(f => lines.push('- ' + f));
if (unexpected.length) {
  lines.push(''); lines.push('## BLOQUEO — cambios inesperados');
  unexpected.forEach(f => lines.push('- ' + f));
}

lines.push(''); lines.push('## Protegidos');
const protectedChanged = changedPaths.filter(p => protectedFiles.includes(p));
if (protectedChanged.length) { ok = false; blockers.push('protegidos_modificados'); protectedChanged.forEach(f => lines.push('- BLOQUEADO: ' + f)); }
else lines.push('- OK: sin cambios en protegidos listados.');

lines.push(''); lines.push('## node --check');
for (const f of allowedChanged) {
  if (!fs.existsSync(path.join(ROOT, f))) { ok = false; blockers.push('archivo_faltante:' + f); lines.push('- ' + f + ': NO EXISTE'); continue; }
  const r = checkSyntax(f);
  if (r.code !== 0) { ok = false; blockers.push('syntax:' + f); }
  lines.push('- ' + f + ': ' + (r.code === 0 ? 'OK' : 'ERROR ' + r.code));
  if (r.stderr.trim()) lines.push('```txt\n' + r.stderr.trim().slice(0, 2000) + '\n```');
}

lines.push(''); lines.push('## Patrones prohibidos');
for (const [label, file, re] of forbidden) {
  const hit = has(file, re);
  if (hit) { ok = false; blockers.push('forbidden:' + label); }
  lines.push('- ' + label + ': ' + (hit ? 'BLOQUEADO' : 'OK'));
}

lines.push(''); lines.push('## Señales esperadas post-hotfix');
const expectedSignals = [
  ['Cobros validado por confirmar', 'orbit360-platform/modules/cobros.js', /Validada \(por confirmar\)/],
  ['Cobros factura metadata-only', 'orbit360-platform/modules/cobros.js', /facturaMetaOnly|metadata-only/],
  ['Conciliaciones validada no aplicada', 'orbit360-platform/modules/conciliaciones.js', /VALIDADA · no aplicada|validadaNoAplicada/],
  ['Portal soporteDocumentoId', 'orbit360-platform/modules/portal.js', /soporteDocumentoId/],
  ['Portal storageEstado pendiente', 'orbit360-platform/modules/portal.js', /storageEstado/],
  ['Config credentialRef', 'orbit360-platform/modules/configuracion.js', /credentialRef/],
  ['Config backend_required', 'orbit360-platform/modules/configuracion.js', /backend_required/],
  ['Equipo último admin', 'orbit360-platform/modules/equipo.js', /ultimo_admin_activo|último administrador|ultimo administrador/],
  ['Academia roles auditoría', 'orbit360-platform/data/academia-plus.js', /roles_permisos_auditoria_v1330|auditoría segura Orbit 360/]
];
for (const [label, file, re] of expectedSignals) {
  const hit = has(file, re);
  if (!hit) { ok = false; blockers.push('missing_signal:' + label); }
  lines.push('- ' + label + ': ' + (hit ? 'OK' : 'FALTA'));
}

lines.push(''); lines.push('## Commit readiness');
if (ok) {
  lines.push('OK — listo para preparar commit local controlado de los seis archivos permitidos, más reportes si Paula decide conservarlos.');
  lines.push('No autoriza deploy, merge, main ni datos reales.');
} else {
  lines.push('BLOQUEADO — no hacer commit hasta resolver:');
  blockers.forEach(b => lines.push('- ' + b));
}
fs.writeFileSync(reportFile, lines.join('\n'), 'utf8');

console.log(JSON.stringify({ ok, status: ok ? 'commit_ready' : 'blocked', branch: br || null, blockers, unexpectedChanges: unexpected, protectedChanged, reportFile: path.relative(ROOT, reportFile).replace(/\\/g, '/') }, null, 2));
process.exit(ok ? 0 : 1);
