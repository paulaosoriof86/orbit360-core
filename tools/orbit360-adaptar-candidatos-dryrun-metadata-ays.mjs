#!/usr/bin/env node
/* Orbit 360 A&S — Adaptador de candidatos metadata-only para dryRunReport
   Combina un dryRun envelope con candidates metadata-only.
   No lee filas reales, no escribe store/Firestore, no aplica pagos, no hace deploy.

   Uso:
     node tools/orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs --dryrun dryrun.local.json --candidates candidates.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-adaptador-candidatos-metadata-dryrun';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const TENANT = 'alianzas-soluciones';
const COUNTRY_CURRENCY = { GT:'GTQ', CO:'COP' };
const RECONCILIATION_SOURCES = new Set(['planilla_aseguradora','planilla_comisiones','estado_cuenta_bancario','cobros_realizados']);
const ROW_STATES = new Set(['LISTO','REQUIERE_VALIDACION','BLOQUEADO','OMITIDO','DUPLICADO_PROBABLE']);
const SCORE_DECISIONS = new Set(['MATCH_EXACTO','MATCH_PROBABLE','REQUIERE_VALIDACION','BLOQUEADO']);
const ACTIONS = new Set(['PROPONER_APLICACION_CON_CONFIRMACION','PROPONER_REVISION','ENVIAR_A_BANDEJA_VALIDACION','NO_APLICAR']);
const FORBIDDEN_KEYS = new Set(['rows','rawRows','normalizedRows','previewRows','sampleRows','records','payload','rawPayload','cellValues','dataRows','items','sourceRows','fullRows']);

function argValue(flag){ const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null; }
function readJson(file){ return JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8')); }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function str(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function num(v, fallback=null){ const n=Number(v); return Number.isFinite(n) ? n : fallback; }
function keysDeep(obj, prefix='', out=[]){
  if(!obj || typeof obj !== 'object') return out;
  if(Array.isArray(obj)){ obj.forEach((v,i)=>keysDeep(v, `${prefix}[${i}]`, out)); return out; }
  for(const k of Object.keys(obj)){ const p=prefix?`${prefix}.${k}`:k; out.push(p); keysDeep(obj[k], p, out); }
  return out;
}
function forbidden(obj){ return keysDeep(obj).filter(p => FORBIDDEN_KEYS.has(p.replace(/\[\d+\]/g,'').split('.').pop())); }
function asArray(v){ if(!v) return []; return Array.isArray(v) ? v : [v]; }
function candidateList(raw){ return asArray(raw.candidates || raw.candidatos || raw.conciliation_candidates || raw.candidatos_conciliacion || raw); }
function sourceRef(c, dryrun){
  const s = c.source_ref || c.sourceRef || {};
  const d = dryrun.source_ref || dryrun.sourceRef || {};
  return {
    file: str(s.file || s.archivo || d.file || d.archivo || dryrun.manifest_ref?.source_name || 'fuente_sin_nombre'),
    sheet: str(s.sheet || s.hoja || d.sheet || d.hoja || 'Hoja1'),
    row_ref: str(s.row_ref || s.fila || s.row_hash || s.rowRef || '')
  };
}
function normalizeCandidate(c, idx, dryrun, errors, warnings){
  const sourceType = dryrun.source_type || dryrun.sourceType;
  const country = str(c.country || c.pais || dryrun.country || dryrun.pais);
  const currency = str(c.currency || c.moneda || dryrun.currency || dryrun.moneda);
  const state = str(c.state || c.estado || c.row_state || c.estado_fila || 'REQUIERE_VALIDACION');
  const sr = sourceRef(c, dryrun);
  const prefix = `candidate[${idx}]`;
  if(!ROW_STATES.has(state)) errors.push(`${prefix}: estado inválido ${state || 'S/D'}.`);
  if(!sr.file) errors.push(`${prefix}: falta source_ref.file.`);
  if(!sr.row_ref) errors.push(`${prefix}: falta source_ref.row_ref/fila/hash.`);
  if(!country || !currency) errors.push(`${prefix}: falta país/moneda.`);
  if(country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) errors.push(`${prefix}: país/moneda incoherente ${country}/${currency}.`);
  const out = {
    candidate_id: str(c.candidate_id || c.id || `cand_${String(idx+1).padStart(4,'0')}`),
    state,
    source_ref: sr,
    country,
    currency,
    profile_ref: c.profile_ref || c.profileRef || null,
    links: c.links || {},
    notes: str(c.notes || c.notas || '')
  };
  if(RECONCILIATION_SOURCES.has(sourceType)){
    const score = num(c.score ?? c.confidenceScore ?? c.confidence_score, null);
    const decision = str(c.score_decision || c.decision || c.resultado_score || '');
    const action = str(c.proposed_action || c.accion_propuesta || '');
    if(score === null || score < 0 || score > 100) errors.push(`${prefix}: score inválido o faltante.`);
    if(!SCORE_DECISIONS.has(decision)) errors.push(`${prefix}: decisión score inválida o faltante.`);
    if(!ACTIONS.has(action)) errors.push(`${prefix}: acción propuesta inválida o faltante.`);
    if(decision === 'BLOQUEADO' && action !== 'NO_APLICAR') errors.push(`${prefix}: candidato bloqueado no puede proponer acción aplicativa.`);
    if(decision === 'MATCH_EXACTO' && action !== 'PROPONER_APLICACION_CON_CONFIRMACION') warnings.push(`${prefix}: match exacto debería proponer aplicación con confirmación.`);
    out.score = score;
    out.score_decision = decision;
    out.proposed_action = action;
  }
  return out;
}
function counts(candidates){
  const c = { LISTO:0, REQUIERE_VALIDACION:0, BLOQUEADO:0, OMITIDO:0, DUPLICADO_PROBABLE:0 };
  for(const item of candidates){ if(c[item.state] !== undefined) c[item.state] += 1; }
  return {
    rows_total: candidates.length,
    rows_ready: c.LISTO,
    rows_requires_validation: c.REQUIERE_VALIDACION,
    rows_blocked: c.BLOQUEADO,
    rows_omitted: c.OMITIDO,
    rows_probable_duplicate: c.DUPLICADO_PROBABLE
  };
}
function build(dryrunRaw, candidatesRaw){
  const errors=[]; const warnings=[];
  const fk = [...forbidden(dryrunRaw), ...forbidden(candidatesRaw)];
  if(fk.length) errors.push(`Entrada contiene payload/filas prohibidas: ${fk.slice(0,12).join(', ')}.`);
  const dryrun = dryrunRaw.dryrun || dryrunRaw.report || dryrunRaw;
  const tenant = str(dryrun.tenant_id || dryrun.tenantId);
  const sourceType = str(dryrun.source_type || dryrun.sourceType);
  if(tenant !== TENANT) errors.push(`Tenant inválido: ${tenant || 'S/D'}.`);
  if(!sourceType) errors.push('Falta source_type en dryRun.');
  const rawCandidates = candidateList(candidatesRaw);
  if(!rawCandidates.length) errors.push('No hay candidates metadata-only.');
  const candidates = rawCandidates.map((c, idx) => normalizeCandidate(c, idx, dryrun, errors, warnings));
  const summary = counts(candidates);
  const hasValidCandidates = candidates.length && !errors.length;
  const decision = errors.length ? 'DRYRUN_CANDIDATES_BLOQUEADO' : (warnings.length ? 'DRYRUN_CANDIDATES_LISTO_CON_ADVERTENCIAS' : 'DRYRUN_CANDIDATES_LISTO');
  const finalReport = {
    ...(dryrun || {}),
    version: VERSION,
    tenant_id: TENANT,
    created_at: new Date().toISOString(),
    decision,
    source_type: sourceType,
    manifest_id: dryrun.manifest_id || dryrun.manifestId || dryrun.manifest_ref?.id || 'manifest_sin_id',
    source_ref: dryrun.source_ref || dryrun.sourceRef || {},
    country: dryrun.country || dryrun.pais || null,
    currency: dryrun.currency || dryrun.moneda || null,
    summary,
    candidates,
    readiness: {
      can_validate_with_dryrun_validator: hasValidCandidates,
      can_score: hasValidCandidates && RECONCILIATION_SOURCES.has(sourceType),
      can_generate_conciliaciones: hasValidCandidates && RECONCILIATION_SOURCES.has(sourceType),
      can_write: false,
      reason: errors.length ? 'Candidatos metadata-only bloqueados.' : 'Candidatos metadata-only listos para validador dryRun.'
    },
    errors,
    warnings,
    restrictions: ['metadata-only','no-row-reading','no-writes','no-Firestore','no-payment-application','no-production','no-deploy','no-merge']
  };
  return finalReport;
}

const dryrunArg = argValue('--dryrun');
const candidatesArg = argValue('--candidates');
let report;
try {
  if(!dryrunArg) throw new Error('Falta --dryrun <archivo>.');
  if(!candidatesArg) throw new Error('Falta --candidates <archivo>.');
  report = build(readJson(dryrunArg), readJson(candidatesArg));
} catch(e) {
  report = { version: VERSION, created_at: new Date().toISOString(), decision:'DRYRUN_CANDIDATES_BLOQUEADO', errors:[e.message], warnings:[], restrictions:['metadata-only','no-row-reading','no-writes'] };
}
fs.mkdirSync(REPORT_DIR, { recursive:true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(REPORT_DIR, `DRYRUN-CANDIDATES-METADATA-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `DRYRUN-CANDIDATES-METADATA-AYS-${stamp}.txt`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — ADAPTAR CANDIDATOS METADATA-ONLY DRYRUN',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  'Restricciones: metadata-only, sin filas, sin writes, sin Firestore, sin pagos, sin deploy.',
  '============================================================',
  '',
  `Fuente: ${report.source_type || 'S/D'}`,
  `Candidatos: ${(report.candidates || []).length}`,
  `Readiness score: ${report.readiness?.can_score ? 'SI' : 'NO'}`,
  '',
  `Errores: ${(report.errors || []).length}`,
  ...(report.errors || []).map(e => `ERROR: ${e}`),
  '',
  `Advertencias: ${(report.warnings || []).length}`,
  ...(report.warnings || []).map(w => `WARN: ${w}`),
  '',
  `JSON: ${rel(jsonPath)}`,
  (report.errors || []).length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit((report.errors || []).length ? 1 : 0);
