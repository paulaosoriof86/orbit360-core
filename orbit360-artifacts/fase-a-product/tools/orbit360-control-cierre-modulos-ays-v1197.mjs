import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const reportDir = path.join(root, '_orbit360_reports');
const reportPath = path.join(reportDir, 'CONTROL-CIERRE-MODULOS-AYS-V1197.md');

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function strip(code) {
  return String(code || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '');
}

const index = read('index.html');
const hardErrors = [];
const warnings = [];
const groups = [];

const protectedLoads = [
  'core/backend-lab-loader.js',
  'core/backend-lab-init.js',
  'data/store.js',
  'data/store-firestore-lab.local.js',
  'core/auth.js',
  'core/importa.js',
  'modules/portal-v1142-copyfix.js'
];
for (const rel of protectedLoads) {
  if (!index.includes(rel)) hardErrors.push(`index.html no carga protegido/hotfix: ${rel}`);
}

const groupsSpec = [
  {
    id: 'CRM',
    files: ['modules/cliente360.js','modules/polizas.js','modules/cobros.js','modules/conciliaciones.js','modules/comisiones.js','modules/portal.js','modules/calidad.js','modules/renovaciones.js','modules/cancelaciones.js','modules/historial.js'],
    data: 'Clientes/Pólizas/Vehículos/Recibos/Cobros/Cartera/Comisiones sanitizados',
    close: 'Expediente, scopes, calidad, estados derivados y conciliación coherentes'
  },
  {
    id: 'ASEGURADORAS',
    files: ['modules/aseguradoras.js','modules/aseguradoras-v1197-ux-bridge.js','core/document-viewer.js','core/credential-vault.js','core/backend-resource-contracts.js'],
    data: 'Directorios GT/CO sanitizados',
    close: 'Directorio operativo, permisos, documentos, accesos y relación Cotizador/Comparativo'
  },
  {
    id: 'COTIZADOR_COMPARATIVO',
    files: ['modules/cotizador.js','modules/comparativo.js','modules/aseguradoras.js'],
    data: 'comparativo_final_v110.html como referencia funcional',
    close: 'DTO canónico, gate validado, país/moneda y fuentes versionadas'
  },
  {
    id: 'OPS_LEADS',
    files: ['modules/ops.js','modules/leads.js','core/ciclo.js'],
    data: 'Clientes/gestiones sanitizados',
    close: 'Kanban/lista/ficha, cadencias, responsables, conversión y scopes'
  },
  {
    id: 'FINANZAS',
    files: ['modules/finanzas.js','modules/comisiones.js','modules/conciliaciones.js','core/comisiones-eng.js','core/primas.js'],
    data: 'Movimientos GT/CO por fuente separada',
    close: 'Finmovs, CxC/CxP, comisiones y conciliación sin mezclar recaudo/caja'
  },
  {
    id: 'MARKETING',
    files: ['modules/marketing.js','modules/automatizaciones.js','core/integraciones.js'],
    data: 'Calendario 2026 + manual de marca tenant',
    close: 'Calendario, piezas, segmentación y estados honestos de integración'
  }
];

for (const spec of groupsSpec) {
  const missing = spec.files.filter(f => !exists(f));
  const notLoaded = spec.files.filter(f => f.startsWith('modules/') && !index.includes(f));
  groups.push({ ...spec, missing, notLoaded, structural: missing.length === 0 && notLoaded.length === 0 });
  if (missing.length) hardErrors.push(`${spec.id}: faltan archivos ${missing.join(', ')}`);
  if (notLoaded.length) hardErrors.push(`${spec.id}: index no carga ${notLoaded.join(', ')}`);
}

const operationalModules = [...new Set(groupsSpec.flatMap(g => g.files).filter(f => f.startsWith('modules/')))];
for (const rel of operationalModules) {
  const code = strip(read(rel));
  if (/\blocalStorage\b|\bsessionStorage\b/.test(code)) warnings.push(`${rel}: almacenamiento navegador directo detectado`);
  if (/firebase\.|firestore\(|getFirestore\(|initializeApp\(/.test(code)) hardErrors.push(`${rel}: acceso directo a proveedor/backend detectado`);
}

const asg = read('modules/aseguradoras.js');
const bridge = read('modules/aseguradoras-v1197-ux-bridge.js');
if (!/_fuentes/.test(asg)) hardErrors.push('Aseguradoras base no expone _fuentes');
if (!/base\._fuentes/.test(bridge)) hardErrors.push('Bridge Aseguradoras no conserva base._fuentes');
if (!/documentRef/.test(bridge)) warnings.push('Bridge Aseguradoras no usa documentRef');
if (!/credentialRef/.test(bridge)) warnings.push('Bridge Aseguradoras no usa credentialRef');

const docsRequired = [
  'docs/AUDITORIA-FORENSE-Y-EMPALME-CANDIDATA-V1197-20260711.md',
  'docs/DELTA-CANDIDATA-V1197-VS-RAMA-VIVA-20260711.md',
  'docs/PLAN-RETOMA-BACKEND-POST-EMPALME-V1197-20260711.md',
  'docs/MATRIZ-FUENTES-REALES-RECIBIDAS-FALTANTES-AYS-20260709.md'
];
for (const rel of docsRequired) if (!exists(rel)) warnings.push(`Falta control vivo: ${rel}`);

const technicalCopyTerms = ['Firebase','Firestore','localStorage','backend LAB','mock','smoke'];
for (const rel of operationalModules) {
  const raw = read(rel);
  for (const term of technicalCopyTerms) {
    const re = new RegExp(`>[^<]{0,100}${term}|['\"\`][^'\"\`]{0,100}${term}`, 'i');
    if (re.test(raw)) warnings.push(`${rel}: revisar copy visible potencialmente técnico (${term})`);
  }
}

const now = new Date().toISOString();
const lines = [
  '# Control de cierre operativo — Orbit 360 A&S v1.197',
  '',
  `Generado: ${now}`,
  '',
  'Este reporte valida estructura y regresiones estáticas. No sustituye el smoke con datos sanitizados ni la validación visual.',
  '',
  '## Resumen',
  '',
  `- Errores bloqueantes: ${hardErrors.length}`,
  `- Advertencias: ${warnings.length}`,
  '',
  '## Grupos',
  '',
  '| Grupo | Estructura | Datos operativos | Condición de cierre |',
  '|---|---|---|---|',
  ...groups.map(g => `| ${g.id} | ${g.structural ? 'OK' : 'INCOMPLETA'} | ${g.data} | ${g.close} |`),
  '',
  '## Errores bloqueantes',
  '',
  ...(hardErrors.length ? hardErrors.map(x => `- ${x}`) : ['- Ninguno detectado.']),
  '',
  '## Advertencias',
  '',
  ...(warnings.length ? warnings.map(x => `- ${x}`) : ['- Ninguna detectada.']),
  '',
  '## Siguiente validación',
  '',
  '```txt',
  '1. Cargar dataset sanitizado del módulo activo.',
  '2. Ejecutar flujos y permisos.',
  '3. Validar relaciones entre módulos.',
  '4. Realizar una validación visual consolidada.',
  '5. Marcar cierre o registrar deltas concretos.',
  '```',
  ''
];

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
console.log(`Reporte: ${reportPath}`);
console.log(`Errores bloqueantes: ${hardErrors.length}`);
console.log(`Advertencias: ${warnings.length}`);
if (hardErrors.length) process.exitCode = 1;
