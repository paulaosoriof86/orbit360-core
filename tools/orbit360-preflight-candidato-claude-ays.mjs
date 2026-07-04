#!/usr/bin/env node
/* Orbit 360 · A&S Claude candidate preflight guard
   Safe mode: validates a decompressed candidate folder BEFORE any overlay/empalme.
   No network, no Firebase, no Firestore, no deploy, no writes outside _orbit360_reports.

   Usage:
     node tools/orbit360-preflight-candidato-claude-ays.mjs --candidate C:\path\to\orbit360-platform
     node tools/orbit360-preflight-candidato-claude-ays.mjs --candidate ./_tmp/candidate/orbit360-platform --strict
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-claude-candidate-preflight';

const PROTECTED_EXACT = [
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'firestore.rules',
  'tools/orbit360-smoke-ays-lab-v99.ps1',
  'tools/orbit360-integrar-backend-lab-index.ps1',
  'tools/orbit360-run-flujo-ays-lab-v99.ps1',
  'tools/orbit360-validar-backend-lab-contrato.mjs'
];

const FRONTEND_ALLOWED_TOP = new Set([
  'orbit360-platform/index.html',
  'orbit360-platform/core',
  'orbit360-platform/modules',
  'orbit360-platform/styles',
  'orbit360-platform/docs',
  'orbit360-platform/assets',
  'orbit360-platform/README.md',
  'orbit360-platform/CHANGELOG.md'
]);

const BANNED_UI_TERMS = [
  /pendiente de backend/i,
  /backend seguro/i,
  /laboratorio/i,
  /firestore/i,
  /firebase/i,
  /demo user/i,
  /credenciales demo/i,
  /modo lab/i,
  /lab backend/i
];

const BANNED_IMPORTER_PATTERNS = [
  /normPais\s*\([^)]*\)\s*\{[\s\S]{0,400}?return\s+['"]GT['"]/i,
  /pais\s*[:=]\s*['"]GT['"]\s*[,;}]/i,
  /estado\s*[:=]\s*['"]Vigente['"]/i,
  /primaNeta\s*[:=]\s*[^\n;]*prima\b/i
];

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function normalizePath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function readTextSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function findPlatformRoot(candidateArg) {
  const abs = path.resolve(root, candidateArg || '');
  if (!fs.existsSync(abs)) return null;
  if (fs.existsSync(path.join(abs, 'index.html')) && fs.existsSync(path.join(abs, 'core')) && fs.existsSync(path.join(abs, 'modules'))) return abs;
  const nested = path.join(abs, 'orbit360-platform');
  if (fs.existsSync(path.join(nested, 'index.html')) && fs.existsSync(path.join(nested, 'core')) && fs.existsSync(path.join(nested, 'modules'))) return nested;
  return abs;
}

function mapCandidateRel(platformRoot, file) {
  return `orbit360-platform/${path.relative(platformRoot, file).replace(/\\/g, '/')}`;
}

function jsCheck(file) {
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  return { ok: res.status === 0, output: `${res.stdout || ''}${res.stderr || ''}`.trim() };
}

const errors = [];
const warnings = [];
const notes = [];
const candidateArg = argValue('--candidate');

if (!candidateArg) errors.push('Falta argumento obligatorio --candidate <ruta_carpeta_descomprimida>.');
const platformRoot = candidateArg ? findPlatformRoot(candidateArg) : null;
if (!platformRoot || !fs.existsSync(platformRoot)) errors.push(`No existe candidato o no se pudo ubicar orbit360-platform: ${candidateArg || 'S/D'}`);

const files = platformRoot ? walk(platformRoot) : [];
const relFiles = platformRoot ? files.map((f) => mapCandidateRel(platformRoot, f)) : [];
const fileSet = new Set(relFiles.map(normalizePath));

if (platformRoot) {
  if (!fs.existsSync(path.join(platformRoot, 'index.html'))) errors.push('Candidato sin index.html.');
  if (!fs.existsSync(path.join(platformRoot, 'core'))) errors.push('Candidato sin core/.');
  if (!fs.existsSync(path.join(platformRoot, 'modules'))) errors.push('Candidato sin modules/.');
  if (!fs.existsSync(path.join(platformRoot, 'styles'))) warnings.push('Candidato sin styles/.');

  const modules = relFiles.filter((p) => /^orbit360-platform\/modules\/[^/]+\.js$/.test(p));
  const core = relFiles.filter((p) => /^orbit360-platform\/core\/[^/]+\.js$/.test(p));
  const jsFiles = relFiles.filter((p) => p.endsWith('.js')).map((p) => path.join(platformRoot, p.replace('orbit360-platform/', '')));

  if (modules.length < 25) warnings.push(`Módulos detectados bajos: ${modules.length}. Esperado cercano a 30.`);
  if (core.length < 12) warnings.push(`Core detectado bajo: ${core.length}. Esperado cercano a 20.`);

  for (const protectedPath of PROTECTED_EXACT) {
    if (fileSet.has(normalizePath(protectedPath))) {
      if (protectedPath === 'orbit360-platform/data/store.js') {
        warnings.push('El candidato trae data/store.js demo. No copiar sobre backend LAB; preservar store del branch backend.');
      } else {
        warnings.push(`El candidato incluye archivo protegido o potencialmente protegido: ${protectedPath}. Empalme debe preservarlo desde rama backend.`);
      }
    }
  }

  for (const p of relFiles) {
    const normalized = normalizePath(p);
    if (normalized.startsWith('orbit360-platform/data/') && normalized !== 'orbit360-platform/data/seed.js' && normalized !== 'orbit360-platform/data/store.js') {
      warnings.push(`Archivo data/ adicional en candidato: ${normalized}. Revisar antes de copiar.`);
    }
    if (/firebase|firestore|secret|credential|serviceAccount/i.test(normalized)) {
      errors.push(`Nombre sensible detectado en candidato: ${normalized}`);
    }
  }

  for (const jsFile of jsFiles) {
    const check = jsCheck(jsFile);
    if (!check.ok) errors.push(`JS inválido: ${rel(jsFile)} :: ${check.output.slice(0, 260)}`);
  }

  const textFiles = files.filter((f) => /\.(html|js|css|md|json|txt)$/i.test(f));
  for (const f of textFiles) {
    const content = readTextSafe(f);
    const r = mapCandidateRel(platformRoot, f);
    for (const pattern of BANNED_UI_TERMS) {
      if (pattern.test(content)) warnings.push(`Texto técnico visible o riesgoso detectado en ${r}: ${pattern}`);
    }
    if (/apiKey\s*[:=]\s*['"][^'"]{10,}/i.test(content)) warnings.push(`Posible apiKey visible en ${r}. Debe estar en config demo o eliminarse antes de producción.`);
  }

  const importerFiles = files.filter((f) => /core[\\/]importa\.js$|modules[\\/]importar\.js$|finanzas|polizas/i.test(f));
  for (const f of importerFiles) {
    const content = readTextSafe(f);
    const r = mapCandidateRel(platformRoot, f);
    for (const pattern of BANNED_IMPORTER_PATTERNS) {
      if (pattern.test(content)) warnings.push(`Regla de importador a revisar en ${r}: ${pattern}`);
    }
    if (/sheet_to_json\s*\([^)]*\)/i.test(content) && !/_origenHoja|origenHoja|sheetName|nombreHoja/i.test(content)) {
      warnings.push(`Parseo Excel sin trazabilidad clara de hoja en ${r}.`);
    }
  }

  const indexContent = readTextSafe(path.join(platformRoot, 'index.html'));
  const scriptRefs = Array.from(indexContent.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)).map((m) => m[1]);
  const missingRefs = scriptRefs
    .filter((src) => !/^https?:|^data:/.test(src))
    .map((src) => src.split('?')[0].replace(/^\.\//, ''))
    .filter((src) => src && !fs.existsSync(path.join(platformRoot, src)));
  for (const src of missingRefs) warnings.push(`index.html referencia script inexistente: ${src}`);

  const digest = crypto.createHash('sha256').update(relFiles.sort().join('\n')).digest('hex').slice(0, 16);
  notes.push(`candidate_digest=${digest}`);
  notes.push(`files=${relFiles.length}`);
  notes.push(`modules=${modules.length}`);
  notes.push(`core=${core.length}`);
  notes.push(`js=${jsFiles.length}`);
}

const decision = errors.length ? 'BLOQUEADO' : warnings.length || strict ? 'REQUIERE_REVISION' : 'LISTO_PREFLIGHT';

const lines = [
  '============================================================',
  'ORBIT 360 - PREFLIGHT CANDIDATO CLAUDE A&S',
  `Version: ${VERSION}`,
  `Fecha: ${new Date().toISOString()}`,
  `Root repo: ${root}`,
  `Candidate: ${candidateArg || 'S/D'}`,
  `Platform root: ${platformRoot || 'S/D'}`,
  'Restricciones: sin deploy, sin merge, sin Firestore, sin carga LAB, sin modificar backend.',
  '============================================================',
  '',
  `Decision: ${decision}`,
  '',
  `Errores bloqueantes: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w) => `WARN: ${w}`),
  '',
  `Notas: ${notes.length}`,
  ...notes.map((n) => `NOTE: ${n}`),
  '',
  'Archivos protegidos que NO deben pisarse por candidato:',
  ...PROTECTED_EXACT.map((p) => `- ${p}`),
  '',
  decision === 'BLOQUEADO' ? 'RESULTADO: FAIL' : 'RESULTADO: OK_CON_REVISION'
];

fs.mkdirSync(REPORT_DIR, { recursive: true });
const report = path.join(REPORT_DIR, `PREFLIGHT-CANDIDATO-CLAUDE-AYS-${Date.now()}.txt`);
fs.writeFileSync(report, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
console.log(`\nReporte: ${rel(report)}`);
process.exit(errors.length ? 1 : 0);
