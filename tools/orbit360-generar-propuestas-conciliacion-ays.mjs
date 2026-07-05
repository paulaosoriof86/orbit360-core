#!/usr/bin/env node
/* Orbit 360 · A&S reconciliation proposal generator
   Safe mode: converts a metadata-only dryRunReport into reconciliation proposals.
   It never writes store/Firestore and never applies payments.

   Usage:
     node tools/orbit360-generar-propuestas-conciliacion-ays.mjs --dryrun path/to/dryrun.local.json [--out path/out.local.json]
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-conciliation-proposal-generator';

const SOURCE_TYPES = new Set(['planilla_aseguradora', 'planilla_comisiones', 'estado_cuenta_bancario', 'cobros_realizados']);
const COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };
const SCORE_DECISIONS = new Set(['MATCH_EXACTO', 'MATCH_PROBABLE', 'REQUIERE_VALIDACION', 'BLOQUEADO']);
const ACTIONS = new Set(['PROPONER_APLICACION_CON_CONFIRMACION', 'PROPONER_REVISION', 'ENVIAR_A_BANDEJA_VALIDACION', 'NO_APLICAR']);
const FORBIDDEN_KEYS = new Set(['rows', 'rawRows', 'normalizedRows', 'previewRows', 'sampleRows', 'records', 'payload', 'rawPayload', 'rawData', 'cellValues', 'secret', 'token', 'apiKey', 'webhook']);

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
function stableId(...parts) {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 20);
}
function pickSourceRef(c, report) {
  const local = c.source_ref || c.sourceRef || {};
  const global = report.source_ref || report.sourceRef || {};
  return {
    file: str(local.file || local.archivo || global.file || global.archivo || global.name || 'S/D'),
    sheet: str(local.sheet || local.hoja || global.sheet || global.hoja || asArray(global.sheets || global.hojas)[0] || 'S/D'),
    row_ref: str(local.row_ref || local.fila || local.row_hash || c.row_ref || c.fila || c.row_hash || '')
  };
}
function proposedStates(decision) {
  if (decision === 'MATCH_EXACTO') return { queue_state: 'PROPUESTA', review_state: 'PENDIENTE' };
  if (decision === 'MATCH_PROBABLE') return { queue_state: 'EN_REVISION', review_state: 'PENDIENTE' };
  if (decision === 'REQUIERE_VALIDACION') return { queue_state: 'EN_REVISION', review_state: 'REQUIERE_VALIDACION' };
  return { queue_state: 'BLOQUEADA', review_state: 'BLOQUEADA' };
}
function normalizeAction(decision, action) {
  if (decision === 'BLOQUEADO') return 'NO_APLICAR';
  if (ACTIONS.has(action)) return action;
  if (decision === 'MATCH_EXACTO') return 'PROPONER_APLICACION_CON_CONFIRMACION';
  if (decision === 'MATCH_PROBABLE') return 'PROPONER_REVISION';
  if (decision === 'REQUIERE_VALIDACION') return 'ENVIAR_A_BANDEJA_VALIDACION';
  return 'NO_APLICAR';
}
function cleanLinks(c) {
  const src = c.links || c.relations || c.relaciones || c.match || {};
  const out = {};
  for (const [from, to] of [
    ['poliza_id', 'poliza_id'], ['polizaId', 'poliza_id'],
    ['cobro_id', 'cobro_id'], ['cobroId', 'cobro_id'],
    ['comision_id', 'comision_id'], ['comisionId', 'comision_id'],
    ['cliente_id', 'cliente_id'], ['clienteId', 'cliente_id'],
    ['aseguradora_id', 'aseguradora_id'], ['aseguradoraId', 'aseguradora_id']
  ]) {
    if (str(src[from])) out[to] = str(src[from]);
  }
  return out;
}

const errors = [];
const warnings = [];
const dryrunArg = argValue('--dryrun');
const outArg = argValue('--out');
if (!dryrunArg) errors.push('Falta --dryrun <archivo>.');
const dryrunPath = dryrunArg ? path.resolve(root, dryrunArg) : null;
if (dryrunPath && !fs.existsSync(dryrunPath)) errors.push(`No existe dryRunReport: ${dryrunArg}`);

let dryrun = null;
if (!errors.length) {
  try { dryrun = readJson(dryrunPath); }
  catch (err) { errors.push(`JSON inválido: ${err.message}`); }
}

let proposals = [];
let sourceType = null;

if (dryrun) {
  const forbidden = forbiddenKeys(dryrun);
  if (forbidden.length) errors.push(`El dryRunReport contiene claves prohibidas: ${forbidden.join(', ')}`);
  if (dryrun.write_enabled === true || dryrun.writeEnabled === true) errors.push('write_enabled=true no permitido.');

  const tenantId = str(dryrun.tenant_id || dryrun.tenantId);
  sourceType = dryrun.source_type || dryrun.sourceType || dryrun.tipo_fuente;
  const manifestId = str(dryrun.manifest_id || dryrun.manifestId || dryrun.manifest_ref || dryrun.manifestRef);
  const dryrunId = str(dryrun.dryrun_id || dryrun.dryRunId || dryrun.id || stableId('dryrun', tenantId, manifestId, sourceType));
  const country = str(dryrun.country || dryrun.pais);
  const currency = str(dryrun.currency || dryrun.moneda);

  if (!tenantId) errors.push('Falta tenant_id/tenantId.');
  if (!SOURCE_TYPES.has(sourceType)) errors.push(`Fuente no autorizada para propuestas: ${sourceType || 'S/D'}`);
  if (!manifestId) errors.push('Falta manifest_id/manifest_ref.');
  if (country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) errors.push(`País/moneda incoherente: ${country}/${currency}.`);

  const candidates = asArray(dryrun.candidates || dryrun.candidatos || dryrun.conciliation_candidates || dryrun.candidatos_conciliacion);
  if (!candidates.length) errors.push('No hay candidatos para convertir a propuestas.');

  if (!errors.length) {
    proposals = candidates.map((c, idx) => {
      const sourceRef = pickSourceRef(c, dryrun);
      const cCountry = str(c.country || c.pais || country);
      const cCurrency = str(c.currency || c.moneda || currency);
      const score = num(c.score ?? c.confidenceScore ?? c.confidence_score, 0);
      const scoreDecision = c.score_decision || c.decision || c.resultado_score || (score >= 90 ? 'MATCH_EXACTO' : score >= 75 ? 'MATCH_PROBABLE' : score >= 50 ? 'REQUIERE_VALIDACION' : 'BLOQUEADO');
      const proposedAction = normalizeAction(scoreDecision, c.proposed_action || c.accion_propuesta);
      const states = proposedStates(scoreDecision);
      const rowRef = sourceRef.row_ref || stableId('candidate', idx, sourceRef.file, sourceRef.sheet);
      const proposalId = `conc-${stableId(tenantId, manifestId, dryrunId, sourceType, sourceRef.file, sourceRef.sheet, rowRef)}`;
      const proposalErrors = [];
      const proposalWarnings = [];

      if (!sourceRef.file || sourceRef.file === 'S/D') proposalErrors.push('Falta archivo fuente.');
      if (!sourceRef.row_ref) proposalErrors.push('Falta row_ref/fila/hash.');
      if (!cCountry || !cCurrency) proposalErrors.push('Falta país/moneda.');
      if (cCountry && cCurrency && COUNTRY_CURRENCY[cCountry] && COUNTRY_CURRENCY[cCountry] !== cCurrency) proposalErrors.push(`País/moneda incoherente: ${cCountry}/${cCurrency}.`);
      if (!SCORE_DECISIONS.has(scoreDecision)) proposalErrors.push(`score_decision inválido: ${scoreDecision}`);
      if (!ACTIONS.has(proposedAction)) proposalErrors.push(`proposed_action inválida: ${proposedAction}`);
      if (scoreDecision === 'MATCH_EXACTO' && proposedAction !== 'PROPONER_APLICACION_CON_CONFIRMACION') proposalWarnings.push('MATCH_EXACTO exige confirmación antes de aplicar.');

      return {
        id: proposalId,
        proposal_id: proposalId,
        tenant_id: tenantId,
        source_type: sourceType,
        manifest_id: manifestId,
        dryrun_id: dryrunId,
        source_ref: sourceRef,
        country: cCountry,
        currency: cCurrency,
        score,
        score_decision: scoreDecision,
        proposed_action: proposedAction,
        queue_state: states.queue_state,
        review_state: states.review_state,
        links: cleanLinks(c),
        origin_candidate_state: c.state || c.estado || c.row_state || c.estado_fila || 'S/D',
        validation: {
          status: proposalErrors.length ? 'BLOQUEADO' : (proposalWarnings.length ? 'LISTO_CON_ADVERTENCIAS' : 'LISTO_PROPUESTA'),
          errors: proposalErrors,
          warnings: proposalWarnings
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  }
}

const blocked = proposals.filter((p) => p.validation?.status === 'BLOQUEADO' || p.queue_state === 'BLOQUEADA').length;
const warn = proposals.filter((p) => p.validation?.status === 'LISTO_CON_ADVERTENCIAS' && p.queue_state !== 'BLOQUEADA').length;
const ready = proposals.filter((p) => p.validation?.status === 'LISTO_PROPUESTA' && p.queue_state !== 'BLOQUEADA').length;
if (blocked) warnings.push(`${blocked} propuestas quedaron bloqueadas/no aplicables dentro del lote.`);

const decision = errors.length ? 'BLOQUEADO' : (blocked || warn || warnings.length ? 'LISTO_CON_ADVERTENCIAS' : 'LISTO_PROPUESTAS');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const outPath = outArg ? path.resolve(root, outArg) : path.join(REPORT_DIR, `CONCILIACIONES-PROPUESTAS-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `CONCILIACIONES-PROPUESTAS-AYS-${stamp}.txt`);

const payload = {
  version: VERSION,
  created_at: new Date().toISOString(),
  dryrun: dryrunArg,
  decision,
  source_type: sourceType,
  summary: { total: proposals.length, ready, warnings: warn, blocked },
  proposals,
  errors,
  warnings,
  restrictions: ['metadata-only', 'no store writes', 'no Firestore writes', 'no payment application']
};

if (!errors.length) fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 - GENERAR PROPUESTAS CONCILIACION A&S',
  `Version: ${VERSION}`,
  `Fecha: ${payload.created_at}`,
  `DryRun: ${dryrunArg || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: metadata-only, sin store/Firestore, sin aplicar pagos.',
  '============================================================',
  '',
  `Tipo fuente: ${sourceType || 'S/D'}`,
  `Propuestas: ${proposals.length}`,
  `Listas: ${ready}`,
  `Advertencias internas: ${warn}`,
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
