#!/usr/bin/env node
/* Orbit 360 · A&S reconciliation proposal validator
   Safe mode: validates one metadata-only proposal for the conciliaciones queue.
   It never writes store/Firestore and never applies payments.

   Usage:
     node tools/orbit360-validar-conciliacion-propuesta-ays.mjs --proposal path/to/proposal.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-conciliation-proposal-validator';

const SOURCE_TYPES = new Set(['planilla_aseguradora', 'planilla_comisiones', 'estado_cuenta_bancario', 'cobros_realizados']);
const COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };
const SCORE_DECISIONS = new Set(['MATCH_EXACTO', 'MATCH_PROBABLE', 'REQUIERE_VALIDACION', 'BLOQUEADO']);
const ACTIONS = new Set(['PROPONER_APLICACION_CON_CONFIRMACION', 'PROPONER_REVISION', 'ENVIAR_A_BANDEJA_VALIDACION', 'NO_APLICAR']);
const QUEUE_STATES = new Set(['PROPUESTA', 'EN_REVISION', 'VALIDADA', 'RECHAZADA', 'APLICADA', 'BLOQUEADA', 'ANULADA']);
const REVIEW_STATES = new Set(['PENDIENTE', 'REQUIERE_VALIDACION', 'VALIDADA', 'RECHAZADA', 'BLOQUEADA']);
const FORBIDDEN_KEYS = new Set(['rows', 'rawRows', 'normalizedRows', 'previewRows', 'sampleRows', 'records', 'payload', 'rawPayload', 'rawData', 'cellValues', 'secret', 'token', 'apiKey', 'webhook']);

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

function forbiddenKeys(obj) {
  return keysDeep(obj).filter((keyPath) => {
    const clean = keyPath.replace(/\[\d+\]/g, '');
    const last = clean.split('.').pop();
    return FORBIDDEN_KEYS.has(last);
  });
}

function num(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function has(obj, keys) {
  return keys.some((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '');
}

const errors = [];
const warnings = [];
const proposalArg = argValue('--proposal');
if (!proposalArg) errors.push('Falta --proposal <archivo>.');
const proposalPath = proposalArg ? path.resolve(root, proposalArg) : null;
if (proposalPath && !fs.existsSync(proposalPath)) errors.push(`No existe proposal: ${proposalArg}`);

let proposal = null;
if (!errors.length) {
  try { proposal = readJson(proposalPath); }
  catch (err) { errors.push(`JSON inválido: ${err.message}`); }
}

let sourceType = null;
let queueState = null;
let reviewState = null;
let scoreDecision = null;
let proposedAction = null;
let score = null;

if (proposal) {
  const forbidden = forbiddenKeys(proposal);
  if (forbidden.length) errors.push(`La propuesta contiene claves prohibidas: ${forbidden.join(', ')}`);

  if (!proposal.tenant_id && !proposal.tenantId) errors.push('Falta tenant_id/tenantId.');
  if (!proposal.proposal_id && !proposal.id) warnings.push('Falta proposal_id/id; backend debe asignarlo antes de persistir.');
  if (!proposal.manifest_id && !proposal.manifestId && !proposal.manifest_ref && !proposal.manifestRef) errors.push('Falta manifest_id/manifest_ref.');
  if (!proposal.dryrun_id && !proposal.dryRunId && !proposal.dryrun_ref && !proposal.dryRunRef) errors.push('Falta dryrun_id/dryrun_ref.');

  sourceType = proposal.source_type || proposal.sourceType || proposal.tipo_fuente;
  if (!SOURCE_TYPES.has(sourceType)) errors.push(`Tipo fuente no autorizado para conciliación: ${sourceType || 'S/D'}`);

  const sourceRef = proposal.source_ref || proposal.sourceRef || {};
  if (!sourceRef.file && !sourceRef.archivo) errors.push('Falta source_ref.file/archivo.');
  if (!sourceRef.sheet && !sourceRef.hoja) warnings.push('Falta source_ref.sheet/hoja.');
  if (!sourceRef.row_ref && !sourceRef.fila && !sourceRef.row_hash) errors.push('Falta source_ref.row_ref/fila/row_hash.');

  const country = proposal.country || proposal.pais;
  const currency = proposal.currency || proposal.moneda;
  if (!country || !currency) errors.push('Falta país/moneda.');
  if (country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) {
    errors.push(`País/moneda incoherente: ${country}/${currency}. Esperado: ${COUNTRY_CURRENCY[country]}.`);
  }

  score = num(proposal.score ?? proposal.confidenceScore ?? proposal.confidence_score, null);
  scoreDecision = proposal.score_decision || proposal.decision || proposal.resultado_score;
  proposedAction = proposal.proposed_action || proposal.accion_propuesta;
  if (score === null || score < 0 || score > 100) errors.push('Score inválido o faltante.');
  if (!SCORE_DECISIONS.has(scoreDecision)) errors.push(`score_decision inválido o faltante: ${scoreDecision || 'S/D'}`);
  if (!ACTIONS.has(proposedAction)) errors.push(`proposed_action inválida o faltante: ${proposedAction || 'S/D'}`);

  queueState = proposal.queue_state || proposal.estado_bandeja || proposal.estado;
  reviewState = proposal.review_state || proposal.estado_revision;
  if (!QUEUE_STATES.has(queueState)) errors.push(`queue_state inválido o faltante: ${queueState || 'S/D'}`);
  if (!REVIEW_STATES.has(reviewState)) errors.push(`review_state inválido o faltante: ${reviewState || 'S/D'}`);

  if (scoreDecision === 'MATCH_EXACTO' && proposedAction !== 'PROPONER_APLICACION_CON_CONFIRMACION') {
    warnings.push('MATCH_EXACTO debe proponer aplicación con confirmación, no aplicación directa ni no aplicar.');
  }
  if (scoreDecision === 'BLOQUEADO' && proposedAction !== 'NO_APLICAR') {
    errors.push('BLOQUEADO no puede proponer acción aplicativa.');
  }
  if (queueState === 'APLICADA') {
    errors.push('Una propuesta metadata-only no puede venir como APLICADA; la aplicación requiere flujo aprobado posterior.');
  }
  if (queueState === 'VALIDADA' && reviewState !== 'VALIDADA') warnings.push('queue_state VALIDADA debería tener review_state VALIDADA.');

  const links = proposal.links || proposal.relations || proposal.relaciones || {};
  if (!has(links, ['poliza_id', 'polizaId', 'cobro_id', 'cobroId', 'comision_id', 'comisionId']) && !has(proposal, ['poliza_id', 'polizaId', 'cobro_id', 'cobroId', 'comision_id', 'comisionId'])) {
    warnings.push('La propuesta no incluye poliza/cobro/comision vinculada; quedará en revisión manual.');
  }

  if (proposal.write_enabled === true || proposal.writeEnabled === true) errors.push('write_enabled=true no permitido en propuesta de conciliación.');
  if (proposal.apply_payment === true || proposal.aplicar_pago === true) errors.push('apply_payment/aplicar_pago=true no permitido en propuesta.');
}

const decision = errors.length ? 'BLOQUEADO' : (warnings.length ? 'LISTO_CON_ADVERTENCIAS' : 'LISTO_PROPUESTA');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const reportJson = path.join(REPORT_DIR, `VALIDAR-CONCILIACION-PROPUESTA-AYS-${stamp}.json`);
const reportTxt = path.join(REPORT_DIR, `VALIDAR-CONCILIACION-PROPUESTA-AYS-${stamp}.txt`);

const result = {
  version: VERSION,
  created_at: new Date().toISOString(),
  proposal: proposalArg,
  decision,
  source_type: sourceType,
  queue_state: queueState,
  review_state: reviewState,
  score,
  score_decision: scoreDecision,
  proposed_action: proposedAction,
  errors,
  warnings,
  restrictions: ['metadata-only', 'no store writes', 'no Firestore writes', 'no payment application']
};

const txt = [
  '============================================================',
  'ORBIT 360 - VALIDAR PROPUESTA CONCILIACION A&S',
  `Version: ${VERSION}`,
  `Fecha: ${result.created_at}`,
  `Proposal: ${proposalArg || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: metadata-only, sin store/Firestore, sin aplicar pagos.',
  '============================================================',
  '',
  `Tipo fuente: ${sourceType || 'S/D'}`,
  `Estado bandeja: ${queueState || 'S/D'}`,
  `Estado revisión: ${reviewState || 'S/D'}`,
  `Score: ${score ?? 'S/D'}`,
  `Decisión score: ${scoreDecision || 'S/D'}`,
  `Acción propuesta: ${proposedAction || 'S/D'}`,
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
