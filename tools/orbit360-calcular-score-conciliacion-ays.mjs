#!/usr/bin/env node
/* Orbit 360 · A&S reconciliation confidence score
   Safe mode: reads a metadata-only reconciliation case.
   It never writes store/Firestore and never requires real source rows.

   Usage:
     node tools/orbit360-calcular-score-conciliacion-ays.mjs --case path/to/case.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-reconciliation-score';

const SOURCE_TYPES = new Set([
  'planilla_aseguradora',
  'planilla_comisiones',
  'estado_cuenta_bancario',
  'cobros_realizados'
]);

const COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };
const FORBIDDEN_KEYS = new Set(['rows', 'row', 'records', 'items', 'data', 'payload', 'sampleRows', 'previewRows', 'normalizedRows', 'rawRows']);
const WEIGHTS = {
  policy: 18,
  receipt_or_installment: 16,
  client: 14,
  insurer: 12,
  country_currency: 16,
  amount: 14,
  period_or_date: 10
};

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
  for (const key of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    out.push(full);
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) keysDeep(obj[key], full, out);
  }
  return out;
}

function forbiddenKeys(obj) {
  return keysDeep(obj).filter((keyPath) => FORBIDDEN_KEYS.has(keyPath.split('.').pop()));
}

function bool(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function num(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function evidence(input, key) {
  return bool(input.evidence?.[key] ?? input[key]);
}

function amountOk(input) {
  if (evidence(input, 'amount_match')) return true;
  const diffAbs = num(input.amount_diff_abs ?? input.difference_abs, null);
  const diffPct = num(input.amount_diff_pct ?? input.difference_pct, null);
  if (diffAbs !== null && diffAbs <= 1) return true;
  if (diffPct !== null && diffPct <= 0.01) return true;
  return false;
}

function periodOk(input) {
  return evidence(input, 'period_match') || evidence(input, 'due_date_match') || evidence(input, 'payment_date_match');
}

function countryCurrencyOk(input) {
  const countryMatch = evidence(input, 'country_match');
  const currencyMatch = evidence(input, 'currency_match');
  if (countryMatch && currencyMatch) return true;
  const country = input.country || input.pais;
  const currency = input.currency || input.moneda;
  return Boolean(country && currency && COUNTRY_CURRENCY[country] === currency);
}

function sourceReliability(input) {
  const value = String(input.source_reliability || input.reliability || '').toUpperCase();
  if (['ALTA', 'HIGH'].includes(value)) return 0;
  if (['MEDIA', 'MEDIUM'].includes(value)) return -5;
  if (['BAJA', 'LOW'].includes(value)) return -12;
  return -8;
}

const errors = [];
const warnings = [];
const caseArg = argValue('--case');
if (!caseArg) errors.push('Falta --case <archivo>.');
const casePath = caseArg ? path.resolve(root, caseArg) : null;
if (casePath && !fs.existsSync(casePath)) errors.push(`No existe case: ${caseArg}`);

let input = null;
if (!errors.length) {
  try { input = readJson(casePath); }
  catch (err) { errors.push(`JSON inválido: ${err.message}`); }
}

let score = 0;
let decision = 'BLOQUEADO';
let proposedAction = 'NO_APLICAR';
let components = {};

if (input) {
  const blockedKeys = forbiddenKeys(input);
  if (blockedKeys.length) errors.push(`El caso contiene claves de filas prohibidas: ${blockedKeys.join(', ')}`);

  const sourceType = input.source_type || input.sourceType || input.tipo_fuente;
  if (!SOURCE_TYPES.has(sourceType)) errors.push(`Tipo fuente no autorizado para score: ${sourceType || 'S/D'}`);
  if (!input.tenant_id && !input.tenantId) errors.push('Falta tenant_id/tenantId.');
  if (!input.source_ref && !input.sourceRef) warnings.push('Falta source_ref/sourceRef estructural.');

  const country = input.country || input.pais;
  const currency = input.currency || input.moneda;
  if (country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) {
    errors.push(`País/moneda incoherente: ${country}/${currency}.`);
  }

  components = {
    policy: evidence(input, 'policy_match') ? WEIGHTS.policy : 0,
    receipt_or_installment: (evidence(input, 'receipt_match') || evidence(input, 'installment_match')) ? WEIGHTS.receipt_or_installment : 0,
    client: evidence(input, 'client_match') ? WEIGHTS.client : 0,
    insurer: evidence(input, 'insurer_match') ? WEIGHTS.insurer : 0,
    country_currency: countryCurrencyOk(input) ? WEIGHTS.country_currency : 0,
    amount: amountOk(input) ? WEIGHTS.amount : 0,
    period_or_date: periodOk(input) ? WEIGHTS.period_or_date : 0
  };

  score = Object.values(components).reduce((a, b) => a + b, 0) + sourceReliability(input);
  score = Math.max(0, Math.min(100, score));

  const hasCore = components.policy > 0 && components.country_currency > 0 && components.amount > 0;
  const hasReceipt = components.receipt_or_installment > 0;
  const hasParties = components.client > 0 && components.insurer > 0;

  if (!errors.length) {
    if (!hasCore) {
      decision = 'BLOQUEADO';
      warnings.push('Falta evidencia núcleo: póliza, país/moneda y monto.');
    } else if (score >= 90 && hasReceipt && hasParties) {
      decision = 'MATCH_EXACTO';
      proposedAction = 'PROPONER_APLICACION_CON_CONFIRMACION';
    } else if (score >= 75) {
      decision = 'MATCH_PROBABLE';
      proposedAction = 'PROPONER_REVISION';
    } else if (score >= 50) {
      decision = 'REQUIERE_VALIDACION';
      proposedAction = 'ENVIAR_A_BANDEJA_VALIDACION';
    } else {
      decision = 'BLOQUEADO';
      proposedAction = 'NO_APLICAR';
    }
  }
}

if (errors.length) decision = 'BLOQUEADO';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const reportJson = path.join(REPORT_DIR, `SCORE-CONCILIACION-AYS-${stamp}.json`);
const reportTxt = path.join(REPORT_DIR, `SCORE-CONCILIACION-AYS-${stamp}.txt`);

const result = {
  version: VERSION,
  created_at: new Date().toISOString(),
  case: caseArg,
  decision,
  score,
  proposed_action: proposedAction,
  components,
  errors,
  warnings,
  restrictions: ['metadata-only', 'no store writes', 'no Firestore writes', 'no real source rows in repo']
};

const txt = [
  '============================================================',
  'ORBIT 360 - SCORE CONCILIACION A&S',
  `Version: ${VERSION}`,
  `Fecha: ${result.created_at}`,
  `Case: ${caseArg || 'S/D'}`,
  `Decision: ${decision}`,
  `Score: ${score}`,
  `Accion propuesta: ${proposedAction}`,
  'Restricciones: metadata-only, sin store/Firestore, sin filas reales en repo.',
  '============================================================',
  '',
  'Componentes:',
  ...Object.entries(components).map(([k, v]) => `- ${k}: ${v}`),
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
process.exit(errors.length || decision === 'BLOQUEADO' ? 1 : 0);
