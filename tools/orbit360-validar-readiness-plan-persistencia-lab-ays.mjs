#!/usr/bin/env node
/* Orbit 360 A&S — Validador readiness plan persistencia LAB.
   Revisa un plan de persistencia de conciliaciones antes de cualquier adapter Firestore LAB.
   No escribe Orbit.store/Firestore, no aplica pagos, no muta cobros, no deploy/merge. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-readiness-plan-persistencia-lab';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const TENANT_DEFAULT = 'alianzas-soluciones';
const SOURCE_TYPES = new Set(['planilla_aseguradora','planilla_comisiones','estado_cuenta_bancario','cobros_realizados']);
const COUNTRY_CURRENCY = { GT:'GTQ', CO:'COP' };
const SCORE_DECISIONS = new Set(['MATCH_EXACTO','MATCH_PROBABLE','REQUIERE_VALIDACION','BLOQUEADO']);
const ACTIONS = new Set(['PROPONER_APLICACION_CON_CONFIRMACION','PROPONER_REVISION','ENVIAR_A_BANDEJA_VALIDACION','NO_APLICAR']);
const QUEUE_STATES = new Set(['PROPUESTA','EN_REVISION','VALIDADA','RECHAZADA','BLOQUEADA','ANULADA']);
const REVIEW_STATES = new Set(['PENDIENTE','REQUIERE_VALIDACION','VALIDADA','RECHAZADA','BLOQUEADA']);
const VALIDATION_STATES = new Set(['LISTO_PARA_PERSISTENCIA_LAB','LISTO_CON_ADVERTENCIAS','BLOQUEADO']);
const FORBIDDEN_KEYS = new Set(['rows','row','records','items','data','payload','rawPayload','rawData','sampleRows','previewRows','normalizedRows','rawRows','cellValues','secret','token','apiKey','webhook','password','credential','privateKey']);
const WRITE_FLAGS = new Set(['write_enabled','writeEnabled','apply_payment','aplicar_pago','execute','execute_writes','firestore_write','store_write','commit','deploy','merge']);

function argValue(flag){ const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), { recursive:true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function asArray(v){ return Array.isArray(v) ? v : (v ? [v] : []); }
function str(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function num(v){ if(v === undefined || v === null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function keysDeep(obj, prefix='', out=[]){
  if(!obj || typeof obj !== 'object') return out;
  if(Array.isArray(obj)){ obj.forEach((v, i) => keysDeep(v, `${prefix}[${i}]`, out)); return out; }
  for(const k of Object.keys(obj)){
    const p = prefix ? `${prefix}.${k}` : k;
    out.push(p);
    keysDeep(obj[k], p, out);
  }
  return out;
}
function lastKey(pathName){ return pathName.replace(/\[\d+\]/g, '').split('.').pop(); }
function forbiddenKeys(obj){ return keysDeep(obj).filter(p => FORBIDDEN_KEYS.has(lastKey(p))); }
function enabledWriteFlags(obj){
  return keysDeep(obj).filter((p) => {
    if(!WRITE_FLAGS.has(lastKey(p))) return false;
    const value = p.split('.').reduce((acc, part) => {
      const clean = part.replace(/\[\d+\]/g, '');
      return acc && typeof acc === 'object' ? acc[clean] : undefined;
    }, obj);
    return value === true || value === 'true' || value === 1 || value === '1';
  });
}
function sourceRefOk(ref){ return Boolean(ref && str(ref.file || ref.archivo) && str(ref.row_ref || ref.fila || ref.row_hash)); }
function countryCurrencyOk(country, currency){ return Boolean(country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] === currency); }
function operationStatus(errors, warnings){ return errors.length ? 'BLOQUEADO' : (warnings.length ? 'LISTO_CON_ADVERTENCIAS' : 'READY_FOR_LAB_REVIEW'); }

const errors = [];
const warnings = [];
const planArg = argValue('--plan');
const tenantArg = argValue('--tenant') || TENANT_DEFAULT;
if(!planArg) errors.push('Falta --plan <archivo>.');
const planPath = planArg ? path.resolve(root, planArg) : null;
if(planPath && !fs.existsSync(planPath)) errors.push(`No existe plan: ${planArg}`);

let plan = null;
if(!errors.length){
  try { plan = readJson(planPath); }
  catch(err){ errors.push(`JSON inválido: ${err.message}`); }
}

let readiness = [];
let operations = [];
if(plan){
  const fk = forbiddenKeys(plan);
  if(fk.length) errors.push(`El plan contiene claves prohibidas: ${fk.slice(0, 20).join(', ')}.`);
  const flags = enabledWriteFlags(plan);
  if(flags.length) errors.push(`El plan trae banderas de escritura/aplicación habilitadas: ${flags.join(', ')}.`);

  const planDecision = str(plan.decision || plan.status || plan.estado);
  if(planDecision === 'BLOQUEADO' || planDecision === 'ORQUESTADOR_PLAN_BLOQUEADO') errors.push(`Plan bloqueado de origen: ${planDecision}.`);
  const planTenant = str(plan.tenant_id || plan.tenantId || tenantArg);
  if(planTenant && planTenant !== tenantArg) errors.push(`Tenant del plan no coincide con --tenant: ${planTenant} != ${tenantArg}.`);

  operations = asArray(plan.operations || plan.ops || plan.plan || []);
  if(!operations.length) errors.push('El plan no contiene operations.');
  const ids = new Set();
  readiness = operations.map((op, idx) => {
    const e = [];
    const w = [];
    const document = op.document || {};
    const tenantId = str(op.tenant_id || document.tenant_id || document.tenantId);
    const documentId = str(op.document_id || document.id || document.proposal_id);
    const sourceType = str(document.source_type || op.source_type || document.sourceType);
    const country = str(document.country || document.pais);
    const currency = str(document.currency || document.moneda);
    const score = num(document.score);
    const scoreDecision = str(document.score_decision || document.decision);
    const proposedAction = str(document.proposed_action || document.accion_propuesta);
    const queueState = str(document.queue_state || document.estado_bandeja || document.estado);
    const reviewState = str(document.review_state || document.estado_revision);
    const validationStatus = str(document.validation?.status || document.validation_status);
    const pathHint = str(op.path_hint || op.pathHint);

    if(str(op.op) !== 'upsert_conciliacion_propuesta') e.push(`op inválido: ${str(op.op) || 'S/D'}`);
    if(str(op.collection) !== 'conciliaciones') e.push(`collection inválida: ${str(op.collection) || 'S/D'}`);
    if(!tenantId) e.push('Falta tenant_id.');
    if(tenantId && tenantId !== tenantArg) e.push(`Tenant mismatch: ${tenantId}.`);
    if(!documentId) e.push('Falta document_id/id/proposal_id.');
    if(documentId && ids.has(documentId)) e.push(`document_id duplicado: ${documentId}.`);
    if(documentId) ids.add(documentId);
    if(!SOURCE_TYPES.has(sourceType)) e.push(`source_type no autorizado: ${sourceType || 'S/D'}.`);
    if(!sourceRefOk(document.source_ref || document.sourceRef)) e.push('source_ref incompleto: requiere file y row_ref/fila/hash.');
    if(!countryCurrencyOk(country, currency)) e.push(`país/moneda inválido o incoherente: ${country || 'S/D'}/${currency || 'S/D'}.`);
    if(score === null || score < 0 || score > 100) e.push('score inválido/faltante.');
    if(!SCORE_DECISIONS.has(scoreDecision)) e.push(`score_decision inválido: ${scoreDecision || 'S/D'}.`);
    if(!ACTIONS.has(proposedAction)) e.push(`proposed_action inválida: ${proposedAction || 'S/D'}.`);
    if(!QUEUE_STATES.has(queueState)) e.push(`queue_state inválido: ${queueState || 'S/D'}.`);
    if(!REVIEW_STATES.has(reviewState)) e.push(`review_state inválido: ${reviewState || 'S/D'}.`);
    if(validationStatus && !VALIDATION_STATES.has(validationStatus)) e.push(`validation.status inválido: ${validationStatus}.`);
    if(queueState === 'APLICADA') e.push('APLICADA no es estado permitido para readiness plan-only.');
    if(scoreDecision === 'BLOQUEADO' && proposedAction !== 'NO_APLICAR') e.push('BLOQUEADO debe proponer NO_APLICAR.');
    if(scoreDecision === 'MATCH_EXACTO' && proposedAction !== 'PROPONER_APLICACION_CON_CONFIRMACION') w.push('MATCH_EXACTO debe requerir confirmación antes de aplicar.');
    if(!pathHint) w.push('Falta path_hint; adapter LAB deberá resolver ruta tenant-safe.');
    if(pathHint && (!pathHint.includes(`tenantId/${tenantId}`) || !pathHint.includes('/conciliaciones/'))) e.push(`path_hint no muestra aislamiento tenant/conciliaciones: ${pathHint}.`);
    if(!op.audit_event) w.push('Falta audit_event de preparación.');
    if(op.audit_event && str(op.audit_event.tenant_id) !== tenantId) e.push('audit_event tenant_id no coincide.');
    if(!String(op.allowed_store_api || '').includes('after LAB approval')) w.push('allowed_store_api no deja explícito que requiere aprobación LAB.');

    return { index: idx, document_id: documentId || null, tenant_id: tenantId || null, collection: str(op.collection) || null, status: operationStatus(e, w), errors: e, warnings: w };
  });
  const blocked = readiness.filter(r => r.status === 'BLOQUEADO').length;
  const warn = readiness.filter(r => r.status === 'LISTO_CON_ADVERTENCIAS').length;
  if(blocked) warnings.push(`${blocked} operaciones bloqueadas dentro del readiness.`);
  if(warn) warnings.push(`${warn} operaciones con advertencias dentro del readiness.`);
}

const blockedOps = readiness.filter(r => r.status === 'BLOQUEADO').length;
const warnOps = readiness.filter(r => r.status === 'LISTO_CON_ADVERTENCIAS').length;
const readyOps = readiness.filter(r => r.status === 'READY_FOR_LAB_REVIEW').length;
const decision = errors.length || blockedOps ? 'READINESS_BLOQUEADO' : (warnings.length || warnOps ? 'READINESS_LISTO_CON_ADVERTENCIAS' : 'READINESS_LISTO');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive:true });
const jsonPath = path.join(REPORT_DIR, `READINESS-PLAN-PERSISTENCIA-LAB-AYS-${stamp}.json`);
const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  decision,
  tenant_id: tenantArg,
  plan: planArg || null,
  summary: { total: readiness.length, ready: readyOps, warnings: warnOps, blocked: blockedOps },
  readiness,
  errors,
  warnings,
  next_allowed_step: decision === 'READINESS_BLOQUEADO' ? 'corregir_plan' : 'adapter_firestore_lab_dry_persistence_requiere_aprobacion_y_smoke_local',
  can_write_now: false,
  can_apply_payments: false,
  restrictions: ['readiness-only','plan-only','no Orbit.store writes','no Firestore writes','no payment application','no cobros mutation','no deploy','no merge']
};
writeJson(jsonPath, report);
const txt = ['============================================================','ORBIT 360 A&S — READINESS PLAN PERSISTENCIA LAB',`Version: ${VERSION}`,`Fecha: ${report.created_at}`,`Decision: ${decision}`,'Restricciones: readiness-only, plan-only, sin writes, sin pagos, sin deploy.','============================================================','',`Plan: ${planArg || 'S/D'}`,`Tenant: ${tenantArg}`,`Operaciones: ${readiness.length}`,`Listas: ${readyOps}`,`Con advertencias: ${warnOps}`,`Bloqueadas: ${blockedOps}`,'',`Errores: ${errors.length}`,...errors.map(e => `ERROR: ${e}`),'',`Advertencias: ${warnings.length}`,...warnings.map(w => `WARN: ${w}`),'',`JSON: ${rel(jsonPath)}`,decision === 'READINESS_BLOQUEADO' ? 'RESULTADO: FAIL' : 'RESULTADO: OK'].join('\n');
fs.writeFileSync(jsonPath.replace(/\.json$/, '.txt'), txt, 'utf8');
console.log(txt);
process.exit(decision === 'READINESS_BLOQUEADO' ? 1 : 0);
