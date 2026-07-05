#!/usr/bin/env node
/* Orbit 360 · A&S reconciliation persistence plan builder
   Safe mode: prepares a metadata-only persistence plan for conciliaciones.
   It never writes Orbit.store/Firestore and never applies payments.

   Usage:
     node tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs --proposals path/to/proposals.local.json [--tenant alianzas-soluciones] [--out path/out.local.json]
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-conciliaciones-persistence-plan';

const SOURCE_TYPES = new Set(['planilla_aseguradora', 'planilla_comisiones', 'estado_cuenta_bancario', 'cobros_realizados']);
const COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };
const SCORE_DECISIONS = new Set(['MATCH_EXACTO', 'MATCH_PROBABLE', 'REQUIERE_VALIDACION', 'BLOQUEADO']);
const ACTIONS = new Set(['PROPONER_APLICACION_CON_CONFIRMACION', 'PROPONER_REVISION', 'ENVIAR_A_BANDEJA_VALIDACION', 'NO_APLICAR']);
const QUEUE_STATES = new Set(['PROPUESTA', 'EN_REVISION', 'VALIDADA', 'RECHAZADA', 'BLOQUEADA', 'ANULADA']);
const REVIEW_STATES = new Set(['PENDIENTE', 'REQUIERE_VALIDACION', 'VALIDADA', 'RECHAZADA', 'BLOQUEADA']);
const FORBIDDEN_KEYS = new Set(['rows', 'rawRows', 'normalizedRows', 'previewRows', 'sampleRows', 'records', 'payload', 'rawPayload', 'rawData', 'cellValues', 'secret', 'token', 'apiKey', 'webhook', 'password', 'credential']);
const DROP_KEYS = new Set(['write_enabled', 'writeEnabled', 'apply_payment', 'aplicar_pago']);

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function rel(p) { return path.relative(root, p).replace(/\\/g, '/'); }
function str(v) { return v === undefined || v === null ? '' : String(v).trim(); }
function num(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function asArray(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
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
function cleanObject(obj) {
  if (Array.isArray(obj)) return obj.map(cleanObject);
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (DROP_KEYS.has(key)) continue;
    if (FORBIDDEN_KEYS.has(key)) continue;
    out[key] = cleanObject(value);
  }
  return out;
}
function loadProposalsShape(payload) {
  if (Array.isArray(payload)) return { envelope: {}, proposals: payload };
  const proposals = payload.proposals || payload.conciliaciones || payload.items || payload.candidatos || [];
  return { envelope: payload, proposals: asArray(proposals) };
}
function defaultReviewState(queueState, scoreDecision) {
  if (queueState === 'BLOQUEADA' || scoreDecision === 'BLOQUEADO') return 'BLOQUEADA';
  if (scoreDecision === 'REQUIERE_VALIDACION') return 'REQUIERE_VALIDACION';
  return 'PENDIENTE';
}

const errors = [];
const warnings = [];
const proposalsArg = argValue('--proposals');
const tenantArg = argValue('--tenant');
const outArg = argValue('--out');
if (!proposalsArg) errors.push('Falta --proposals <archivo>.');
const proposalsPath = proposalsArg ? path.resolve(root, proposalsArg) : null;
if (proposalsPath && !fs.existsSync(proposalsPath)) errors.push(`No existe proposals: ${proposalsArg}`);

let payload = null;
if (!errors.length) {
  try { payload = readJson(proposalsPath); }
  catch (err) { errors.push(`JSON inválido: ${err.message}`); }
}

let proposals = [];
let envelope = {};
let operations = [];
let detectedTenant = null;

if (payload) {
  const forbidden = forbiddenKeys(payload);
  if (forbidden.length) errors.push(`El lote contiene claves prohibidas: ${forbidden.join(', ')}`);
  if (payload.write_enabled === true || payload.writeEnabled === true) errors.push('write_enabled=true no permitido en lote.');
  if (payload.apply_payment === true || payload.aplicar_pago === true) errors.push('apply_payment/aplicar_pago=true no permitido en lote.');

  ({ envelope, proposals } = loadProposalsShape(payload));
  if (!proposals.length) errors.push('No hay propuestas para preparar persistencia.');

  const ids = new Set();
  const tenants = new Set();

  if (!errors.length) {
    operations = proposals.map((raw) => {
      const p = cleanObject(raw);
      const validationErrors = [];
      const validationWarnings = [];
      const id = str(p.id || p.proposal_id || p.proposalId);
      const tenantId = str(p.tenant_id || p.tenantId || tenantArg);
      const sourceType = p.source_type || p.sourceType || p.tipo_fuente;
      const country = str(p.country || p.pais);
      const currency = str(p.currency || p.moneda);
      const score = num(p.score ?? p.confidenceScore ?? p.confidence_score, null);
      const scoreDecision = p.score_decision || p.decision || p.resultado_score;
      const proposedAction = p.proposed_action || p.accion_propuesta;
      const queueState = p.queue_state || p.estado_bandeja || p.estado;
      const reviewState = p.review_state || p.estado_revision || defaultReviewState(queueState, scoreDecision);
      const sourceRef = p.source_ref || p.sourceRef || {};

      if (!id) validationErrors.push('Falta id/proposal_id.');
      if (id && ids.has(id)) validationErrors.push(`ID duplicado en lote: ${id}.`);
      if (id) ids.add(id);
      if (!tenantId) validationErrors.push('Falta tenant_id/tenantId.');
      if (tenantId) tenants.add(tenantId);
      if (!SOURCE_TYPES.has(sourceType)) validationErrors.push(`Fuente no autorizada: ${sourceType || 'S/D'}.`);
      if (!sourceRef.file && !sourceRef.archivo) validationErrors.push('Falta source_ref.file/archivo.');
      if (!sourceRef.sheet && !sourceRef.hoja) validationWarnings.push('Falta source_ref.sheet/hoja.');
      if (!sourceRef.row_ref && !sourceRef.fila && !sourceRef.row_hash) validationErrors.push('Falta source_ref.row_ref/fila/row_hash.');
      if (!country || !currency) validationErrors.push('Falta país/moneda.');
      if (country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) validationErrors.push(`País/moneda incoherente: ${country}/${currency}.`);
      if (score === null || score < 0 || score > 100) validationErrors.push('Score inválido o faltante.');
      if (!SCORE_DECISIONS.has(scoreDecision)) validationErrors.push(`score_decision inválido: ${scoreDecision || 'S/D'}.`);
      if (!ACTIONS.has(proposedAction)) validationErrors.push(`proposed_action inválida: ${proposedAction || 'S/D'}.`);
      if (!QUEUE_STATES.has(queueState)) validationErrors.push(`queue_state no persistible: ${queueState || 'S/D'}.`);
      if (!REVIEW_STATES.has(reviewState)) validationErrors.push(`review_state inválido: ${reviewState || 'S/D'}.`);
      if ((raw.write_enabled === true || raw.writeEnabled === true) || (raw.apply_payment === true || raw.aplicar_pago === true)) {
        validationErrors.push('La propuesta incluye banderas de escritura/aplicación no permitidas.');
      }
      if (queueState === 'APLICADA') validationErrors.push('No se preparan propuestas APLICADAS en este plan; aplicación es flujo posterior.');
      if (scoreDecision === 'BLOQUEADO' && proposedAction !== 'NO_APLICAR') validationErrors.push('BLOQUEADO debe proponer NO_APLICAR.');

      const normalized = {
        id,
        proposal_id: id,
        tenant_id: tenantId,
        source_type: sourceType,
        manifest_id: str(p.manifest_id || p.manifestId || p.manifest_ref || p.manifestRef),
        dryrun_id: str(p.dryrun_id || p.dryRunId || p.dryrun_ref || p.dryRunRef),
        source_ref: {
          file: str(sourceRef.file || sourceRef.archivo),
          sheet: str(sourceRef.sheet || sourceRef.hoja),
          row_ref: str(sourceRef.row_ref || sourceRef.fila || sourceRef.row_hash)
        },
        country,
        currency,
        score,
        score_decision: scoreDecision,
        proposed_action: proposedAction,
        queue_state: queueState,
        review_state: reviewState,
        links: cleanObject(p.links || p.relations || p.relaciones || {}),
        origin_candidate_state: str(p.origin_candidate_state || p.originCandidateState || p.state || p.estado || 'S/D'),
        validation: {
          status: validationErrors.length ? 'BLOQUEADO' : (validationWarnings.length ? 'LISTO_CON_ADVERTENCIAS' : 'LISTO_PARA_PERSISTENCIA_LAB'),
          errors: validationErrors,
          warnings: validationWarnings
        },
        createdAt: str(p.createdAt) || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        op: 'upsert_conciliacion_propuesta',
        collection: 'conciliaciones',
        tenant_id: tenantId,
        document_id: id,
        path_hint: `tenantId/${tenantId}/conciliaciones/${id}`,
        allowed_store_api: 'Orbit.store.insert/update only after LAB approval',
        document: normalized,
        audit_event: {
          type: 'CONCILIACION_PROPUESTA_PREPARADA',
          tenant_id: tenantId,
          proposal_id: id,
          source_type: sourceType,
          queue_state: queueState,
          review_state: reviewState,
          score_decision: scoreDecision,
          createdAt: new Date().toISOString()
        }
      };
    });
  }

  if (tenantArg) {
    const mismatch = operations.filter((op) => op.tenant_id !== tenantArg).map((op) => op.document_id || 'S/D');
    if (mismatch.length) errors.push(`Tenant mismatch contra --tenant ${tenantArg}: ${mismatch.join(', ')}`);
    detectedTenant = tenantArg;
  } else if (tenants.size === 1) {
    detectedTenant = [...tenants][0];
  } else if (tenants.size > 1) {
    errors.push(`El lote mezcla tenants: ${[...tenants].join(', ')}`);
  }

  const blockedOps = operations.filter((op) => op.document.validation.status === 'BLOQUEADO');
  if (blockedOps.length) warnings.push(`${blockedOps.length} operaciones quedan bloqueadas dentro del plan y no deben persistirse.`);
}

const blocked = operations.filter((op) => op.document.validation.status === 'BLOQUEADO').length;
const ready = operations.filter((op) => op.document.validation.status === 'LISTO_PARA_PERSISTENCIA_LAB').length;
const warn = operations.filter((op) => op.document.validation.status === 'LISTO_CON_ADVERTENCIAS').length;
const decision = errors.length ? 'BLOQUEADO' : (blocked || warn || warnings.length ? 'PLAN_CON_ADVERTENCIAS' : 'PLAN_LISTO');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const outPath = outArg ? path.resolve(root, outArg) : path.join(REPORT_DIR, `PLAN-PERSISTENCIA-CONCILIACIONES-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `PLAN-PERSISTENCIA-CONCILIACIONES-AYS-${stamp}.txt`);

const plan = {
  version: VERSION,
  created_at: new Date().toISOString(),
  source_file: proposalsArg,
  decision,
  tenant_id: detectedTenant,
  dryrun_ref: str(envelope.dryrun || envelope.dryrun_id || envelope.dryRunId || envelope.dryrun_ref || envelope.dryRunRef),
  source_type: envelope.source_type || envelope.sourceType || null,
  summary: { total: operations.length, ready, warnings: warn, blocked },
  operations,
  errors,
  warnings,
  restrictions: ['metadata-only', 'plan-only', 'no Orbit.store writes', 'no Firestore writes', 'no payment application', 'no cobros mutation']
};

if (!errors.length) fs.writeFileSync(outPath, JSON.stringify(plan, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 - PLAN PERSISTENCIA CONCILIACIONES A&S',
  `Version: ${VERSION}`,
  `Fecha: ${plan.created_at}`,
  `Source: ${proposalsArg || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: plan-only, sin Orbit.store/Firestore, sin aplicar pagos.',
  '============================================================',
  '',
  `Tenant: ${detectedTenant || 'S/D'}`,
  `Operaciones: ${operations.length}`,
  `Listas: ${ready}`,
  `Con advertencias: ${warn}`,
  `Bloqueadas internas: ${blocked}`,
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w) => `WARN: ${w}`),
  '',
  `Salida JSON: ${errors.length ? 'NO GENERADA' : rel(outPath)}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
