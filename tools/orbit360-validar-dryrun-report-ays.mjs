#!/usr/bin/env node
/* Orbit 360 · A&S dry-run report validator
   Safe mode: validates import/conciliation dry-run metadata only.
   It rejects raw source rows and never writes store/Firestore.

   Usage:
     node tools/orbit360-validar-dryrun-report-ays.mjs --report path/to/dryrun.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-dryrun-report-validator';

const SOURCE_TYPES = new Set([
  'clientes',
  'aseguradoras',
  'polizas',
  'vehiculos',
  'cobros_realizados',
  'planilla_aseguradora',
  'planilla_comisiones',
  'estado_cuenta_bancario',
  'financiero_historico',
  'siniestros',
  'documentos_soporte',
  'configuracion_catalogo'
]);

const RECONCILIATION_SOURCES = new Set([
  'planilla_aseguradora',
  'planilla_comisiones',
  'estado_cuenta_bancario',
  'cobros_realizados'
]);

const COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };
const ROW_STATES = new Set(['LISTO', 'REQUIERE_VALIDACION', 'BLOQUEADO', 'OMITIDO', 'DUPLICADO_PROBABLE']);
const SCORE_DECISIONS = new Set(['MATCH_EXACTO', 'MATCH_PROBABLE', 'REQUIERE_VALIDACION', 'BLOQUEADO']);
const ACTIONS = new Set(['PROPONER_APLICACION_CON_CONFIRMACION', 'PROPONER_REVISION', 'ENVIAR_A_BANDEJA_VALIDACION', 'NO_APLICAR']);
const PROHIBITED_KEYS = new Set(['rows', 'rawRows', 'normalizedRows', 'previewRows', 'sampleRows', 'records', 'payload', 'rawPayload', 'rawData', 'cellValues']);

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function keysDeep(obj, prefix = '', out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => keysDeep(v, `${prefix}[${i}]`, out));
    return out;
  }
  for (const key of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    out.push(full);
    if (obj[key] && typeof obj[key] === 'object') keysDeep(obj[key], full, out);
  }
  return out;
}

function hasProhibitedKeys(obj) {
  return keysDeep(obj).filter((keyPath) => {
    const clean = keyPath.replace(/\[\d+\]/g, '');
    const last = clean.split('.').pop();
    return PROHIBITED_KEYS.has(last);
  });
}

function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v) {
  return v === undefined || v === null ? '' : String(v).trim();
}

const errors = [];
const warnings = [];
const reportArg = argValue('--report');
if (!reportArg) errors.push('Falta --report <archivo>.');
const reportPath = reportArg ? path.resolve(root, reportArg) : null;
if (reportPath && !fs.existsSync(reportPath)) errors.push(`No existe report: ${reportArg}`);

let report = null;
if (!errors.length) {
  try { report = readJson(reportPath); }
  catch (err) { errors.push(`JSON inválido: ${err.message}`); }
}

let sourceType = null;
let candidates = [];
let stateCounts = {};

if (report) {
  const forbidden = hasProhibitedKeys(report);
  if (forbidden.length) errors.push(`El dry-run contiene claves de filas/payload prohibidas: ${forbidden.join(', ')}`);

  sourceType = report.source_type || report.sourceType || report.tipo_fuente;
  if (!SOURCE_TYPES.has(sourceType)) errors.push(`Tipo de fuente inválido o faltante: ${sourceType || 'S/D'}`);
  if (!report.tenant_id && !report.tenantId) errors.push('Falta tenant_id/tenantId.');
  if (!report.manifest_id && !report.manifestId && !report.manifest_ref && !report.manifestRef) errors.push('Falta manifest_id/manifest_ref.');
  if (!report.source_ref && !report.sourceRef) errors.push('Falta source_ref/sourceRef estructural.');

  const country = report.country || report.pais;
  const currency = report.currency || report.moneda;
  if (!country || !currency) warnings.push('País/moneda faltante en encabezado del dry-run; debe validarse por candidato.');
  if (country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) {
    errors.push(`Moneda incoherente para país ${country}: ${currency}. Esperado: ${COUNTRY_CURRENCY[country]}.`);
  }

  const summary = report.summary || report.resumen || {};
  const total = num(summary.rows_total ?? summary.total_rows ?? summary.filas_totales, null);
  const ready = num(summary.rows_ready ?? summary.filas_listas, 0);
  const validation = num(summary.rows_requires_validation ?? summary.filas_requiere_validacion, 0);
  const blocked = num(summary.rows_blocked ?? summary.filas_bloqueadas, 0);
  const omitted = num(summary.rows_omitted ?? summary.filas_omitidas, 0);
  const dup = num(summary.rows_probable_duplicate ?? summary.filas_duplicado_probable, 0);

  if (total === null) errors.push('Falta summary.rows_total/filas_totales.');
  if (total !== null && total !== ready + validation + blocked + omitted + dup) {
    errors.push(`Conteo inconsistente: total=${total}, suma=${ready + validation + blocked + omitted + dup}.`);
  }

  stateCounts = { LISTO: ready, REQUIERE_VALIDACION: validation, BLOQUEADO: blocked, OMITIDO: omitted, DUPLICADO_PROBABLE: dup };
  candidates = asArray(report.candidates || report.candidatos || report.conciliation_candidates || report.candidatos_conciliacion);

  if (RECONCILIATION_SOURCES.has(sourceType) && !candidates.length) {
    errors.push('Fuente de conciliación requiere candidates/candidatos metadata-only.');
  }

  candidates.forEach((c, idx) => {
    const prefix = `candidates[${idx}]`;
    const state = c.state || c.estado || c.row_state || c.estado_fila;
    if (!ROW_STATES.has(state)) errors.push(`${prefix}: estado inválido o faltante: ${state || 'S/D'}`);

    const sourceRef = c.source_ref || c.sourceRef || {};
    if (!str(sourceRef.file || sourceRef.archivo)) errors.push(`${prefix}: falta source_ref.file/archivo.`);
    if (!str(sourceRef.sheet || sourceRef.hoja)) warnings.push(`${prefix}: falta source_ref.sheet/hoja.`);
    if (!str(sourceRef.row_ref || sourceRef.fila || sourceRef.row_hash)) errors.push(`${prefix}: falta row_ref/fila/row_hash.`);

    const ccountry = c.country || c.pais || country;
    const ccurrency = c.currency || c.moneda || currency;
    if (!ccountry || !ccurrency) errors.push(`${prefix}: falta país/moneda.`);
    if (ccountry && ccurrency && COUNTRY_CURRENCY[ccountry] && COUNTRY_CURRENCY[ccountry] !== ccurrency) {
      errors.push(`${prefix}: moneda incoherente ${ccountry}/${ccurrency}.`);
    }

    if (RECONCILIATION_SOURCES.has(sourceType)) {
      const score = num(c.score ?? c.confidenceScore ?? c.confidence_score, null);
      const decision = c.score_decision || c.decision || c.resultado_score;
      const action = c.proposed_action || c.accion_propuesta;
      if (score === null || score < 0 || score > 100) errors.push(`${prefix}: score inválido o faltante.`);
      if (!SCORE_DECISIONS.has(decision)) errors.push(`${prefix}: decisión score inválida o faltante: ${decision || 'S/D'}`);
      if (!ACTIONS.has(action)) errors.push(`${prefix}: acción propuesta inválida o faltante: ${action || 'S/D'}`);
      if (decision === 'MATCH_EXACTO' && action !== 'PROPONER_APLICACION_CON_CONFIRMACION') warnings.push(`${prefix}: MATCH_EXACTO debería proponer aplicación con confirmación.`);
      if (decision === 'BLOQUEADO' && action !== 'NO_APLICAR') errors.push(`${prefix}: BLOQUEADO no puede proponer acción aplicativa.`);
    }
  });

  if (report.write_enabled === true || report.writeEnabled === true) errors.push('write_enabled=true no permitido en dry-run.');
}

const decision = errors.length ? 'BLOQUEADO' : (warnings.length ? 'LISTO_CON_ADVERTENCIAS' : 'LISTO_DRYRUN');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const reportJson = path.join(REPORT_DIR, `VALIDAR-DRYRUN-REPORT-AYS-${stamp}.json`);
const reportTxt = path.join(REPORT_DIR, `VALIDAR-DRYRUN-REPORT-AYS-${stamp}.txt`);

const result = {
  version: VERSION,
  created_at: new Date().toISOString(),
  report: reportArg,
  decision,
  source_type: sourceType,
  candidates_count: candidates.length,
  state_counts: stateCounts,
  errors,
  warnings,
  restrictions: ['metadata-only', 'no store writes', 'no Firestore writes', 'no raw source rows']
};

const txt = [
  '============================================================',
  'ORBIT 360 - VALIDAR DRYRUN REPORT A&S',
  `Version: ${VERSION}`,
  `Fecha: ${result.created_at}`,
  `Report: ${reportArg || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: metadata-only, sin store/Firestore, sin filas reales.',
  '============================================================',
  '',
  `Tipo fuente: ${sourceType || 'S/D'}`,
  `Candidatos: ${candidates.length}`,
  `Conteos: ${JSON.stringify(stateCounts)}`,
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w) => `WARN: ${w}`),
  '',
  `JSON: ${rel(reportJson)}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');

fs.writeFileSync(reportJson, JSON.stringify(result, null, 2), 'utf8');
fs.writeFileSync(reportTxt, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
