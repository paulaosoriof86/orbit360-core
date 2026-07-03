#!/usr/bin/env node
/* Orbit 360 · Validador empalme frontend v1.104
   Ejecuta validaciones estáticas antes/después de empalmar un candidato Claude.
   Sin red, sin Firebase, sin secretos, sin datos reales. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = path.join(root, 'orbit360-platform');
const reportDir = path.join(root, '_orbit360_reports');
const errors = [];
const warnings = [];
const info = [];

const protectedFiles = [
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

const requiredFrontendFiles = [
  'orbit360-platform/core/integraciones.js',
  'orbit360-platform/core/integraciones-panel.js',
  'orbit360-platform/core/integraciones-lab-mock.js',
  'orbit360-platform/modules/marketing.js',
  'orbit360-platform/modules/automatizaciones.js',
  'orbit360-platform/modules/configuracion.js',
  'orbit360-platform/core/ia.js',
  'orbit360-platform/core/importa.js',
  'orbit360-platform/modules/ia.js',
  'orbit360-platform/modules/importar.js'
];

const forbiddenExact = [
  'White-label para Alianzas',
  'Gemini por defecto',
  'motor simulado',
  'backend en producción'
];

const sensitivePatterns = [
  { name: 'api key visible', re: /API key|apiKey|apikey/ },
  { name: 'secret visible', re: /secret|client_secret|private_key/i },
  { name: 'token visible', re: /bearer token|access token|refresh token/i },
  { name: 'persistencia directa frontend', re: /localStorage\.setItem|sessionStorage\.setItem/ }
];

function rel(p){ return path.relative(root, p).replaceAll(path.sep, '/'); }
function exists(r){ return fs.existsSync(path.join(root, r)); }
function read(r){ return fs.readFileSync(path.join(root, r), 'utf8'); }
function walk(dir){
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

for (const file of protectedFiles) {
  if (!exists(file)) errors.push(`Falta protegido: ${file}`);
}

for (const file of requiredFrontendFiles) {
  if (!exists(file)) errors.push(`Falta frontend requerido: ${file}`);
}

const jsFiles = [
  ...walk(path.join(app, 'core')).filter(p => p.endsWith('.js')),
  ...walk(path.join(app, 'modules')).filter(p => p.endsWith('.js')),
  ...walk(path.join(app, 'data')).filter(p => p.endsWith('.js'))
];

for (const p of jsFiles) {
  const text = fs.readFileSync(p, 'utf8');
  const r = rel(p);
  for (const exact of forbiddenExact) {
    if (text.includes(exact)) errors.push(`${r}: contiene texto prohibido: ${exact}`);
  }
  if (/Â|â†|â€œ|â€|Ã/.test(text.slice(0, 3000))) warnings.push(`${r}: posible mojibake/codificacion en primeros 3000 caracteres`);
  if (/fetch\s*\(|XMLHttpRequest|axios\s*\./.test(text) && /integracion|webhook|token|secret|api/i.test(text)) {
    warnings.push(`${r}: posible llamada externa relacionada con integraciones; revisar manualmente`);
  }
}

const securitySensitiveScope = [
  'orbit360-platform/modules/marketing.js',
  'orbit360-platform/core/integraciones.js',
  'orbit360-platform/core/integraciones-panel.js',
  'orbit360-platform/core/integraciones-lab-mock.js'
];

for (const file of securitySensitiveScope) {
  if (!exists(file)) continue;
  const text = read(file);
  for (const item of sensitivePatterns) {
    if (item.re.test(text)) errors.push(`${file}: patrón sensible no permitido en alcance seguro: ${item.name}`);
  }
}

const indexFile = 'orbit360-platform/index.html';
if (exists(indexFile)) {
  const index = read(indexFile);
  const scripts = [...index.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1].split('?')[0]);
  for (const s of ['core/integraciones.js','data/store.js','data/seed.js']) {
    if (!scripts.includes(s)) errors.push(`index.html: falta script ${s}`);
  }
  const moduleScripts = scripts.filter(s => s.startsWith('modules/') && s.endsWith('.js'));
  info.push(`Scripts locales: ${scripts.length}`);
  info.push(`Módulos cargados en index: ${moduleScripts.length}`);
}

const output = [
  '============================================================',
  'ORBIT 360 - VALIDACION EMPALME FRONTEND v1.104',
  `Fecha: ${new Date().toISOString()}`,
  `Root: ${root}`,
  'Restricciones: sin red, sin Firebase, sin secretos, sin datos reales.',
  '============================================================',
  '',
  ...info.map(x => `INFO: ${x}`),
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  '',
  `Warnings: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');

console.log(output);

try {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'VALIDACION-EMPALME-FRONTEND-V104.txt'), output, 'utf8');
} catch {}

process.exit(errors.length ? 1 : 0);
