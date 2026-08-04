#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const BASELINE = process.env.ORBIT360_AUDIT_BASELINE || '27cb7dfcda8568280ebef15993a953364304f29b';
const CANDIDATE = process.env.ORBIT360_AUDIT_CANDIDATE || 'b699ba329960cd830121b57452ce558399aa84fb';
const LIVE = process.env.ORBIT360_AUDIT_LIVE || 'origin/ays/backend-tenant-lab-v99-20260703';
const OUT_JSON = process.env.ORBIT360_AUDIT_JSON || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/rc12-forensic-module-audit.json');
const OUT_MD = process.env.ORBIT360_AUDIT_MD || path.join(ROOT, 'orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATA-ACUMULATIVA-MODULOS-RC12-20260803.md');
const sha = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');

function git(args, options = {}) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
  } catch (error) {
    if (options.allowFailure) return '';
    throw error;
  }
}
function show(ref, rel) { return git(['show', `${ref}:${rel}`], { allowFailure: true }); }
function exists(ref, rel) { return Boolean(git(['cat-file', '-e', `${ref}:${rel}`], { allowFailure: true }) === ''); }
function blob(ref, rel) { return git(['rev-parse', `${ref}:${rel}`], { allowFailure: true }); }
function lastTouch(ref, rel) {
  const raw = git(['log', '-1', '--format=%H|%cI|%s', ref, '--', rel], { allowFailure: true });
  if (!raw) return null;
  const [commit, date, ...message] = raw.split('|');
  return { commit, date, message: message.join('|') };
}
function lines(value) { return String(value || '').split(/\r?\n/).filter(Boolean); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function compile(source, id) {
  try { new Function(source); return { id, ok: true }; }
  catch (error) { return { id, ok: false, error: String(error?.message || error).slice(0, 240) }; }
}
function grepFiles(ref, pattern) {
  const result = git(['grep', '-Il', '-e', pattern, ref, '--', 'orbit360-platform/docs', 'orbit360-platform/runtime-gate-crm-v20260716'], { allowFailure: true });
  return lines(result).map(item => item.replace(`${ref}:`, '')).slice(0, 12);
}
function evidenceStrength(files) {
  let strong = 0;
  let indirect = 0;
  for (const rel of files) {
    const source = show(CANDIDATE, rel) || show(LIVE, rel);
    if (/\b(PASS|APROBADO|CERRADO|GO_|PRODUCTION_SMOKE_PASS)\b/i.test(source)) strong += 1;
    else indirect += 1;
  }
  return strong ? 'STRONG_REPOSITORY_EVIDENCE' : indirect ? 'INDIRECT_REPOSITORY_EVIDENCE' : 'NO_MODULE_SPECIFIC_APPROVAL_EVIDENCE';
}

const DOMAIN = Object.freeze({
  inicio: { data: ['clientes','polizas','cobros','asesores'], maturity: 'OPERATIVE_DASHBOARD_SHARED_STORE' },
  cronograma: { data: ['gestiones','leads','renovaciones'], maturity: 'FRONTEND_WORKED_BACKEND_PARTIAL' },
  ops: { data: ['gestiones'], maturity: 'RUNTIME_WORKED_EMPTY_RELATIONS_ALLOWED' },
  leads: { data: ['leads'], maturity: 'RUNTIME_WORKED_EMPTY_RELATIONS_ALLOWED' },
  aseguradoras: { data: ['aseguradoras'], maturity: 'REAL_DATA_MIGRATED_READONLY' },
  cotizador: { data: ['cotizaciones','aseguradoras','tarifas'], maturity: 'ADVANCED_PROTOTYPE_BACKEND_NOT_COMPLETE' },
  comparativo: { data: ['cotizaciones','documentos'], maturity: 'ADVANCED_PROTOTYPE_BACKEND_NOT_COMPLETE' },
  cliente360: { data: ['clientes','asesores','polizas','vehiculos','cobros'], maturity: 'REAL_DATA_MIGRATED_READONLY' },
  polizas: { data: ['polizas','vehiculos','recibosEsperados','carteraPrimas'], maturity: 'REAL_DATA_MIGRATED_READONLY_VISUAL_APPROVAL_PENDING' },
  cobros: { data: ['cobros','recibosEsperados','carteraPrimas'], maturity: 'REAL_DATA_MIGRATED_CONTROLLED_WRITES_EXIST_VISUAL_APPROVAL_PENDING' },
  conciliaciones: { data: ['cobros','polizas','finmovs'], maturity: 'LOGIC_WORKED_BACKEND_PARTIAL' },
  renovaciones: { data: ['polizas','gestiones'], maturity: 'LOGIC_WORKED_BACKEND_PARTIAL' },
  cancelaciones: { data: ['polizas','cancelaciones'], maturity: 'FRONTEND_WORKED_BACKEND_PARTIAL' },
  siniestros: { data: ['siniestros','polizas','clientes'], maturity: 'FRONTEND_WORKED_DATA_MIGRATION_PENDING' },
  historial: { data: ['historial','gestiones'], maturity: 'FRONTEND_WORKED_BACKEND_PARTIAL' },
  comisiones: { data: ['comisiones','planillaComisiones','documentos'], maturity: 'CONTROLLED_DATA_LOADED_PARTIAL_HOLD_PRESENT' },
  importar: { data: ['importaciones','auditoria'], maturity: 'IMPORTER_ARCHITECTURE_WORKED_PRODUCTIVE_GENERALIZATION_PENDING' },
  calidad: { data: ['clientes','polizas'], maturity: 'FRONTEND_WORKED_SHARED_STORE' },
  plantillas: { data: ['plantillas'], maturity: 'FRONTEND_WORKED_BACKEND_PARTIAL' },
  reportes: { data: ['clientes','polizas','cobros','comisiones'], maturity: 'FRONTEND_WORKED_EXPORT_BACKEND_PARTIAL' },
  ia: { data: ['conocimiento','aseguradoras','documentos'], maturity: 'FRONTEND_WORKED_AI_BACKEND_NOT_CONNECTED' },
  academia: { data: ['academia','progreso'], maturity: 'DEEP_CONTENT_WORKED_DURABLE_BACKEND_PARTIAL' },
  insights: { data: ['clientes','polizas','cobros','comisiones'], maturity: 'FRONTEND_WORKED_SHARED_STORE' },
  correo: { data: ['correo','plantillas'], maturity: 'FRONTEND_WORKED_INTEGRATION_NOT_PRODUCTION_CONNECTED' },
  automatizaciones: { data: ['automatizaciones'], maturity: 'FRONTEND_WORKED_EXECUTION_BACKEND_NOT_COMPLETE' },
  notificaciones: { data: ['notificaciones','plantillas'], maturity: 'FRONTEND_WORKED_WHATSAPP_BACKEND_NOT_CONNECTED' },
  marketing: { data: ['marketing','calendarioContenido'], maturity: 'FRONTEND_WORKED_PRODUCTIVE_BACKEND_NOT_COMPLETE' },
  portal: { data: ['portal','clientes','polizas','documentos'], maturity: 'FRONTEND_WORKED_EXTERNAL_AUTH_BACKEND_NOT_COMPLETE' },
  finanzas: { data: ['finmovs','cxc','cxp','liquidaciones','conciliaciones'], maturity: 'FRONTEND_DEEP_WORKED_REAL_MIGRATION_PENDING' },
  equipo: { data: ['members','asesores','roles'], maturity: 'MULTIROLE_CONTRACT_WORKED_ADMIN_WRITER_PARTIAL' },
  configuracion: { data: ['tenantConfig','catalogos'], maturity: 'FRONTEND_WORKED_PERSISTENCE_PARTIAL' }
});

const index = show(CANDIDATE, 'orbit360-platform/index.html');
const config = show(CANDIDATE, 'orbit360-platform/core/config.js');
if (!index || !config) throw new Error('CANDIDATE_INDEX_OR_CONFIG_MISSING');
const loadedScripts = unique([...index.matchAll(/<script\s+src="(modules\/[^"?]+\.js)(?:\?[^" ]*)?"/g)].map(match => match[1]));
const routes = unique([...config.matchAll(/route:\s*'([^']+)'/g)].map(match => match[1]));
const moduleFilesCandidate = lines(git(['ls-tree','-r','--name-only',CANDIDATE,'orbit360-platform/modules'])).filter(name => name.endsWith('.js'));
const moduleFilesBaseline = lines(git(['ls-tree','-r','--name-only',BASELINE,'orbit360-platform/modules'])).filter(name => name.endsWith('.js'));
const moduleFilesLive = lines(git(['ls-tree','-r','--name-only',LIVE,'orbit360-platform/modules'])).filter(name => name.endsWith('.js'));
const allModuleFiles = unique([...moduleFilesCandidate, ...moduleFilesBaseline, ...moduleFilesLive]).sort();

const bridgeRules = {
  polizas: [/policy-receipts/, /issuance-endosos/, /renewals-v1201/],
  cobros: [/policy-receipts/, /crm-v1198/],
  renovaciones: [/renewals-/, /issuance-endosos/],
  ops: [/ops-workflows/, /crm-v1198/, /issuance-endosos/],
  leads: [/crm-v1198/],
  cliente360: [/crm-v1198/],
  portal: [/portal-/],
  aseguradoras: [/aseguradoras-/],
  cotizador: [/cotizador-/],
  comparativo: [/comparativo-/]
};
function relatedScripts(route) {
  const exact = `orbit360-platform/modules/${route}.js`;
  const rules = bridgeRules[route] || [];
  return unique(allModuleFiles.filter(rel => rel === exact || rel.includes(`/modules/${route}-`) || rules.some(rule => rule.test(path.basename(rel))))).sort();
}

const moduleRows = [];
for (const route of routes) {
  const primary = `orbit360-platform/modules/${route}.js`;
  const related = relatedScripts(route);
  const source = show(CANDIDATE, primary);
  const loaded = loadedScripts.includes(`modules/${route}.js`);
  const registered = Boolean(source && (source.includes(`Orbit.modules.${route}`) || source.includes(`Orbit.modules['${route}']`) || source.includes(`Orbit.modules["${route}"]`)));
  const syntax = source ? compile(source, `${route}:primary`) : { id: `${route}:primary`, ok: false, error: 'primary-module-missing' };
  const bridgeSyntax = related.filter(rel => rel !== primary).map(rel => compile(show(CANDIDATE, rel), `${route}:${path.basename(rel)}`));
  const storeRefs = (source.match(/Orbit\.store\b/g) || []).length;
  const directStorageRefs = (source.match(/\b(?:localStorage|sessionStorage)\b/g) || []).length;
  const demoMarkers = (source.match(/\b(?:demo|mock|seed)\b|Andrea Beltr[aá]n|admin@demo/gi) || []).length;
  const todoMarkers = (source.match(/\b(?:TODO|FIXME|placeholder|roadmap|pr[oó]ximamente)\b/gi) || []).length;
  const baselineBlob = blob(BASELINE, primary);
  const candidateBlob = blob(CANDIDATE, primary);
  const liveBlob = blob(LIVE, primary);
  const parityBaseline = Boolean(candidateBlob && candidateBlob === baselineBlob);
  const parityLive = Boolean(candidateBlob && candidateBlob === liveBlob);
  const laterTouches = related.flatMap(rel => lines(git(['log','--format=%H|%cI|%s',`${BASELINE}..${LIVE}`,'--',rel], { allowFailure: true }))).slice(0, 12);
  const evidenceFiles = unique([...grepFiles(CANDIDATE, route), ...grepFiles(LIVE, route)]).slice(0, 10);
  const approval = evidenceStrength(evidenceFiles);
  const domain = DOMAIN[route] || { data: [], maturity: 'UNCLASSIFIED_REQUIRES_REVIEW' };
  const worked = Boolean(source && registered && loaded);
  let implementation = 'NOT_IMPLEMENTED';
  if (source && !loaded) implementation = 'SOURCE_PRESENT_NOT_ACTIVE';
  else if (source && loaded && !registered) implementation = 'ACTIVE_SCRIPT_WITHOUT_CANONICAL_MODULE_REGISTRATION';
  else if (worked) implementation = 'WORKED_ACTIVE_MODULE';
  let backend = 'NO_DIRECT_STORE_EVIDENCE';
  if (storeRefs > 0) backend = 'SHARED_ORBIT_STORE_INTEGRATED';
  else if (/Orbit\.(?:queries|crmkit|correo|notify|ia|importa|ciclo|tenant|access)/.test(source)) backend = 'CORE_SERVICE_INTEGRATED_NO_DIRECT_STORE';
  const backendComplete = ['REAL_DATA_MIGRATED_READONLY','REAL_DATA_MIGRATED_READONLY_VISUAL_APPROVAL_PENDING','REAL_DATA_MIGRATED_CONTROLLED_WRITES_EXIST_VISUAL_APPROVAL_PENDING'].includes(domain.maturity) ? false : false;
  const gaps = [];
  if (!worked) gaps.push('activar o completar implementación canónica');
  if (!syntax.ok || bridgeSyntax.some(item => !item.ok)) gaps.push('corregir sintaxis');
  if (!parityBaseline) gaps.push('explicar diferencia frente a baseline sellada');
  if (!parityLive) gaps.push('empalmar mejor versión de rama viva');
  if (demoMarkers) gaps.push('retirar marcadores demo/mock/seed del módulo activo');
  if (directStorageRefs) gaps.push('revisar persistencia directa fuera de Orbit.store');
  if (approval === 'NO_MODULE_SPECIFIC_APPROVAL_EVIDENCE') gaps.push('obtener evidencia runtime específica');
  if (/NOT_COMPLETE|PARTIAL|PENDING|HOLD/.test(domain.maturity)) gaps.push('completar backend/gate del dominio indicado');
  moduleRows.push({
    route,
    primary,
    relatedScripts: related,
    implementation,
    loaded,
    registered,
    syntaxOk: syntax.ok && bridgeSyntax.every(item => item.ok),
    storeRefs,
    directStorageRefs,
    demoMarkers,
    todoMarkers,
    backend,
    backendComplete,
    domainMaturity: domain.maturity,
    expectedCollections: domain.data,
    candidateBlob,
    baselineBlob,
    liveBlob,
    parityBaseline,
    parityLive,
    lastApprovedFileCommit: lastTouch(BASELINE, primary),
    lastCandidateFileCommit: lastTouch(CANDIDATE, primary),
    lastLiveFileCommit: lastTouch(LIVE, primary),
    postBaselineTouchesInLive: laterTouches,
    approvalEvidence: approval,
    evidenceFiles,
    gaps
  });
}

const moduleTreeParityBaseline = allModuleFiles.every(rel => blob(CANDIDATE, rel) === blob(BASELINE, rel));
const moduleTreeParityLive = allModuleFiles.every(rel => blob(CANDIDATE, rel) === blob(LIVE, rel));
const candidateDiffFiles = lines(git(['diff','--name-only',`${BASELINE}..${CANDIDATE}`]));
const liveDiffFiles = lines(git(['diff','--name-only',`${BASELINE}..${LIVE}`]));
const allowedCandidateFunctional = new Set([
  'orbit360-platform/core/auth.js',
  'orbit360-platform/core/backend-lab-auth-guard.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/data/store-firestore-lab.local.js'
]);
const candidateUnexpectedProductDiffs = candidateDiffFiles.filter(rel => rel.startsWith('orbit360-platform/') && !rel.includes('/docs/') && !rel.includes('/runtime-gate-') && !allowedCandidateFunctional.has(rel));
const livePostBaselineModuleDiffs = liveDiffFiles.filter(rel => rel.startsWith('orbit360-platform/modules/'));
const failedModules = moduleRows.filter(row => !row.syntaxOk || !row.parityBaseline || !row.parityLive || !row.loaded || !row.registered);
const cumulativeStatic = moduleTreeParityBaseline && moduleTreeParityLive && candidateUnexpectedProductDiffs.length === 0 && livePostBaselineModuleDiffs.length === 0 && failedModules.length === 0;
const decision = cumulativeStatic ? 'GO_STATIC_CUMULATIVE_MODULE_PARITY_WITH_MATURITY_GAPS' : 'NO_GO_CANDIDATE_MODULE_DIVERGENCE';

const result = {
  schemaVersion: 'orbit360-forensic-cumulative-module-audit-v1',
  generatedAt: new Date().toISOString(),
  baseline: BASELINE,
  candidate: CANDIDATE,
  live: LIVE,
  decision,
  classification: cumulativeStatic ? 'GO_STATIC_ARCHITECTURE' : 'PIPELINE_MECHANISM_FAILURE',
  guarantees: {
    candidateDescendsFromBaseline: git(['merge-base',BASELINE,CANDIDATE]) === BASELINE,
    moduleTreeParityBaseline,
    moduleTreeParityLive,
    noPostBaselineModuleChangesInLive: livePostBaselineModuleDiffs.length === 0,
    candidateOnlyChangesAllowedRuntimeOwners: candidateUnexpectedProductDiffs.length === 0,
    allActiveModulesSyntaxAndRegistration: failedModules.length === 0
  },
  counts: {
    routes: moduleRows.length,
    loadedModuleScripts: loadedScripts.length,
    moduleFiles: allModuleFiles.length,
    workedActiveModules: moduleRows.filter(row => row.implementation === 'WORKED_ACTIVE_MODULE').length,
    sharedStoreIntegrated: moduleRows.filter(row => row.backend === 'SHARED_ORBIT_STORE_INTEGRATED').length,
    moduleSpecificStrongEvidence: moduleRows.filter(row => row.approvalEvidence === 'STRONG_REPOSITORY_EVIDENCE').length,
    backendExplicitlyComplete: moduleRows.filter(row => row.backendComplete).length,
    modulesWithMaturityGaps: moduleRows.filter(row => row.gaps.length).length,
    failedModules: failedModules.length
  },
  limits: {
    staticAuditOnly: true,
    doesNotClaimAllModuleRuntimeApproval: true,
    doesNotClaimBackendCompleteFromFilePresence: true,
    runtimeRequiredAfterAuthentication: true
  },
  candidateDiffFiles,
  livePostBaselineModuleDiffs,
  candidateUnexpectedProductDiffs,
  modules: moduleRows,
  firestoreRead: false,
  authRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: cumulativeStatic
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2) + '\n', 'utf8');

const esc = value => String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
let md = `# Auditoría forense de candidata acumulativa RC1.2\n\n`;
md += `Fecha: ${result.generatedAt}\n\n`;
md += `## Decisión\n\n\`\`\`text\n${decision}\n\`\`\`\n\n`;
md += `- Baseline sellada: \`${BASELINE}\`\n- Candidata auditada: \`${CANDIDATE}\`\n- Rama viva: \`${LIVE}\`\n`;
md += `- Paridad completa de archivos de módulos contra baseline: **${moduleTreeParityBaseline ? 'sí' : 'no'}**\n`;
md += `- Paridad completa de archivos de módulos contra rama viva: **${moduleTreeParityLive ? 'sí' : 'no'}**\n`;
md += `- Cambios de módulo posteriores a baseline en rama viva: **${livePostBaselineModuleDiffs.length}**\n\n`;
md += `## Lectura correcta del resultado\n\nLa candidata conserva exactamente los módulos de la baseline sellada cuando la paridad es positiva. Esto demuestra ausencia de regresión estática, pero no convierte automáticamente todos los módulos en backend completo ni en aprobados visualmente. La columna de madurez separa presencia, integración al store, datos reales, aprobación y pendientes.\n\n`;
md += `## Matriz ejecutiva\n\n| Módulo | Implementación | Backend observable | Madurez de dominio | Paridad baseline/viva | Evidencia | Pendientes |\n|---|---|---|---|---|---|---|\n`;
for (const row of moduleRows) {
  md += `| ${esc(row.route)} | ${esc(row.implementation)} | ${esc(row.backend)} | ${esc(row.domainMaturity)} | ${row.parityBaseline ? 'sí' : 'no'}/${row.parityLive ? 'sí' : 'no'} | ${esc(row.approvalEvidence)} | ${esc(row.gaps.join('; ') || 'ninguno estático')} |\n`;
}
md += `\n## Detalle módulo por módulo\n\n`;
for (const row of moduleRows) {
  md += `### ${row.route}\n\n`;
  md += `- Archivo principal: \`${row.primary}\`\n`;
  md += `- Scripts relacionados activos: ${row.relatedScripts.length ? row.relatedScripts.map(item => `\`${item}\``).join(', ') : 'ninguno'}\n`;
  md += `- Estado de implementación: **${row.implementation}**\n`;
  md += `- Backend: **${row.backend}**; backend completo: **no demostrado**\n`;
  md += `- Madurez: **${row.domainMaturity}**\n`;
  md += `- Colecciones/contratos esperados: ${row.expectedCollections.length ? row.expectedCollections.map(item => `\`${item}\``).join(', ') : 'sin contrato específico identificado'}\n`;
  md += `- Paridad: baseline **${row.parityBaseline ? 'PASS' : 'FAIL'}**; rama viva **${row.parityLive ? 'PASS' : 'FAIL'}**\n`;
  md += `- Última versión aprobada utilizable: archivo contenido en la baseline sellada \`${BASELINE}\``;
  if (row.lastApprovedFileCommit) md += `, originado en \`${row.lastApprovedFileCommit.commit}\` (${row.lastApprovedFileCommit.message})`;
  md += `.\n`;
  md += `- Evidencia específica: **${row.approvalEvidence}**${row.evidenceFiles.length ? ` — ${row.evidenceFiles.map(item => `\`${item}\``).join(', ')}` : ''}\n`;
  md += `- Señales: Orbit.store=${row.storeRefs}; almacenamiento directo=${row.directStorageRefs}; demo/mock/seed=${row.demoMarkers}; TODO/placeholder=${row.todoMarkers}.\n`;
  md += `- Falta: ${row.gaps.length ? row.gaps.join('; ') : 'ningún pendiente estático; requiere smoke funcional para afirmar operación completa'}.\n\n`;
}
md += `## Conclusión y límite de garantía\n\n`;
md += cumulativeStatic
  ? `RC1.2 no retrocede archivos de módulos respecto de la baseline sellada ni de la rama viva. Puede continuar al diagnóstico de membership y al smoke focalizado. La publicación no debe presentarse como cierre de todos los módulos: varios conservan backend parcial, integraciones no conectadas o aprobación visual pendiente.\n`
  : `RC1.2 no puede publicarse hasta resolver las divergencias detalladas. Debe construirse una candidata acumulativa selectiva sin reemplazo total.\n`;
fs.writeFileSync(OUT_MD, md, 'utf8');
console.log(JSON.stringify({ decision, counts: result.counts, guarantees: result.guarantees, outJson: OUT_JSON, outMd: OUT_MD }, null, 2));
process.exit(cumulativeStatic ? 0 : 41);
