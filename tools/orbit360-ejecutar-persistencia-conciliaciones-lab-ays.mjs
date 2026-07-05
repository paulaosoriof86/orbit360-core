#!/usr/bin/env node
/* Orbit 360 · A&S conciliaciones LAB persistence executor
   Disabled by default. Safe local LAB materializer: writes only a local mirror JSON
   when explicitly enabled. It never mutates cobros/comisiones/polizas/finmovs.

   Usage:
     node tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs --plan path/plan.json --mode dry-run
     node tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs --plan path/plan.json --mode local-mirror --execute-lab CONFIRMO_ESCRITURA_LAB_CONCILIACIONES --lab-store-out _orbit360_reports/lab-store.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-conciliaciones-lab-executor';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const EXECUTE_TOKEN = 'CONFIRMO_ESCRITURA_LAB_CONCILIACIONES';
const ALLOWED_COLLECTIONS = new Set(['conciliaciones', 'auditLog']);
const BLOCKED_MUTATION_COLLECTIONS = new Set(['cobros','comisiones','polizas','finmovs','clientes','vehiculos','documentos','recibos']);
const FORBIDDEN_KEYS = new Set(['rows','rawRows','normalizedRows','previewRows','sampleRows','records','payload','rawPayload','rawData','cellValues','secret','token','apiKey','webhook','password','credential','write_enabled','writeEnabled','apply_payment','aplicar_pago']);
const PERSISTIBLE_STATES = new Set(['PROPUESTA','EN_REVISION','VALIDADA','RECHAZADA','BLOQUEADA','ANULADA']);

function argValue(flag, def = null){ const i = args.indexOf(flag); return i >= 0 ? args[i+1] : def; }
function hasFlag(flag){ return args.includes(flag); }
function str(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function keysDeep(obj, prefix='', out=[]){
  if(!obj || typeof obj !== 'object') return out;
  if(Array.isArray(obj)){ obj.forEach((v,i)=>keysDeep(v, `${prefix}[${i}]`, out)); return out; }
  for(const k of Object.keys(obj)){ const full = prefix ? `${prefix}.${k}` : k; out.push(full); keysDeep(obj[k], full, out); }
  return out;
}
function forbiddenKeys(obj){
  return keysDeep(obj).filter((keyPath)=>{
    const clean = keyPath.replace(/\[\d+\]/g, '');
    const last = clean.split('.').pop();
    return FORBIDDEN_KEYS.has(last);
  });
}
function clone(v){ return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function normalizePlan(raw){
  const operations = Array.isArray(raw.operations) ? raw.operations : [];
  return {
    version: str(raw.version),
    decision: str(raw.decision),
    tenant_id: str(raw.tenant_id || raw.tenantId),
    source_file: str(raw.source_file || raw.sourceFile),
    summary: raw.summary || {},
    operations,
    errors: Array.isArray(raw.errors) ? raw.errors : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    restrictions: Array.isArray(raw.restrictions) ? raw.restrictions : []
  };
}
function opDocument(op){ return op && (op.document || op.doc || op.payload_document || {}); }
function cleanForMirror(doc){
  const out = clone(doc) || {};
  delete out._syncStatus; delete out._syncOp; delete out._syncError; delete out._syncAt;
  return out;
}
function validate(plan, opts){
  const errors=[]; const warnings=[];
  if(!plan.tenant_id) errors.push('El plan no tiene tenant_id.');
  if(plan.errors.length) errors.push(`El plan trae errores previos: ${plan.errors.join(' | ')}`);
  if(!['PLAN_LISTO','PLAN_CON_ADVERTENCIAS'].includes(plan.decision)) errors.push(`Decision del plan no ejecutable: ${plan.decision || 'S/D'}.`);
  if(plan.decision === 'PLAN_CON_ADVERTENCIAS' && !opts.allowWarnings) errors.push('PLAN_CON_ADVERTENCIAS requiere --allow-warnings para materialización local.');
  if(!plan.operations.length) errors.push('El plan no contiene operaciones.');
  const fk = forbiddenKeys(plan);
  if(fk.length) errors.push(`El plan contiene claves prohibidas: ${fk.join(', ')}`);

  const ids = new Set();
  for(const [idx, op] of plan.operations.entries()){
    const label = `op[${idx}]`;
    const collection = str(op.collection);
    const tenantId = str(op.tenant_id || op.tenantId);
    const documentId = str(op.document_id || op.documentId);
    const document = opDocument(op);
    const auditEvent = op.audit_event || op.auditEvent || null;
    if(op.op !== 'upsert_conciliacion_propuesta') errors.push(`${label}: op inválida ${op.op || 'S/D'}.`);
    if(!ALLOWED_COLLECTIONS.has(collection)) errors.push(`${label}: colección no permitida: ${collection || 'S/D'}.`);
    if(BLOCKED_MUTATION_COLLECTIONS.has(collection)) errors.push(`${label}: intento de mutar colección operativa bloqueada: ${collection}.`);
    if(tenantId !== plan.tenant_id) errors.push(`${label}: tenant mismatch ${tenantId || 'S/D'} != ${plan.tenant_id}.`);
    if(!documentId) errors.push(`${label}: falta document_id.`);
    if(documentId && ids.has(documentId)) errors.push(`${label}: document_id duplicado ${documentId}.`);
    if(documentId) ids.add(documentId);
    if(!document || typeof document !== 'object') errors.push(`${label}: falta document.`);
    if(document.queue_state === 'APLICADA') errors.push(`${label}: no se persisten propuestas APLICADAS por este ejecutor.`);
    if(document.queue_state && !PERSISTIBLE_STATES.has(document.queue_state)) errors.push(`${label}: queue_state no persistible ${document.queue_state}.`);
    if(document.validation && document.validation.status === 'BLOQUEADO') errors.push(`${label}: operación bloqueada no puede persistirse.`);
    if(document.tenant_id && document.tenant_id !== plan.tenant_id) errors.push(`${label}: document.tenant_id mismatch.`);
    if(!auditEvent || typeof auditEvent !== 'object') errors.push(`${label}: falta audit_event.`);
    if(auditEvent && auditEvent.type !== 'CONCILIACION_PROPUESTA_PREPARADA') warnings.push(`${label}: audit_event.type no estándar: ${auditEvent.type || 'S/D'}.`);
    if(String(op.collection || '').toLowerCase() !== 'conciliaciones') errors.push(`${label}: la operación principal debe ir a conciliaciones.`);
  }
  return { errors, warnings };
}
function loadMirror(file){
  if(!file || !fs.existsSync(file)) return { conciliaciones: [], auditLog: [], meta: { createdAt: new Date().toISOString(), source: VERSION } };
  const data = readJson(file);
  data.conciliaciones = Array.isArray(data.conciliaciones) ? data.conciliaciones : [];
  data.auditLog = Array.isArray(data.auditLog) ? data.auditLog : [];
  data.meta = data.meta || {};
  return data;
}
function upsert(arr, row){
  const id = row && (row.id || row.proposal_id || row.document_id);
  const idx = arr.findIndex((x)=> (x && (x.id || x.proposal_id || x.document_id)) === id);
  if(idx >= 0) arr[idx] = row; else arr.push(row);
}

const planArg = argValue('--plan');
const mode = argValue('--mode', 'dry-run');
const executeToken = argValue('--execute-lab');
const tenantArg = argValue('--tenant');
const outArg = argValue('--out');
const labStoreOutArg = argValue('--lab-store-out');
const allowWarnings = hasFlag('--allow-warnings');
const errors=[]; const warnings=[];
if(!planArg) errors.push('Falta --plan <archivo>.');
const planPath = planArg ? path.resolve(root, planArg) : null;
if(planPath && !fs.existsSync(planPath)) errors.push(`No existe plan: ${planArg}`);
if(!['dry-run','local-mirror'].includes(mode)) errors.push(`Modo no soportado: ${mode}. Use dry-run o local-mirror.`);
if(mode === 'local-mirror' && executeToken !== EXECUTE_TOKEN) errors.push(`local-mirror requiere --execute-lab ${EXECUTE_TOKEN}.`);

let raw=null; let plan=null;
if(!errors.length){
  try {
    raw = readJson(planPath);
    const rawForbidden = forbiddenKeys(raw);
    if(rawForbidden.length) errors.push(`El plan contiene claves prohibidas: ${rawForbidden.join(', ')}`);
    plan = normalizePlan(raw);
  }
  catch(e){ errors.push(`JSON inválido: ${e.message}`); }
}
if(plan && tenantArg && tenantArg !== plan.tenant_id) errors.push(`Tenant mismatch contra --tenant ${tenantArg}: ${plan.tenant_id || 'S/D'}.`);
let validation={errors:[], warnings:[]};
if(plan){ validation = validate(plan, { allowWarnings }); errors.push(...validation.errors); warnings.push(...validation.warnings); }

let writes=[]; let auditWrites=[]; let mirrorPath = labStoreOutArg ? path.resolve(root, labStoreOutArg) : path.join(REPORT_DIR, 'LAB-MIRROR-CONCILIACIONES-AYS.local.json');
let executed=false;
if(!errors.length && plan){
  for(const op of plan.operations){
    const document = cleanForMirror(opDocument(op));
    document.id = document.id || op.document_id || document.proposal_id;
    document.proposal_id = document.proposal_id || document.id;
    document.tenant_id = document.tenant_id || plan.tenant_id;
    document.persisted_lab_at = new Date().toISOString();
    document.persisted_lab_by = 'orbit360-ejecutor-lab-local';
    writes.push({ collection:'conciliaciones', document_id: document.id, document });
    auditWrites.push({
      collection:'auditLog',
      document_id:`audit_${document.id}_${Date.now()}`,
      document:{
        type:'CONCILIACION_PROPUESTA_PERSISTIDA_LAB',
        tenant_id: plan.tenant_id,
        proposal_id: document.id,
        queue_state: document.queue_state,
        review_state: document.review_state,
        source_type: document.source_type,
        score_decision: document.score_decision,
        actor:'orbit360-ejecutor-lab-local',
        source_plan: plan.source_file || planArg,
        createdAt: new Date().toISOString()
      }
    });
  }
  if(mode === 'local-mirror'){
    const mirror = loadMirror(mirrorPath);
    for(const w of writes) upsert(mirror.conciliaciones, w.document);
    for(const a of auditWrites) mirror.auditLog.push(a.document);
    mirror.meta.updatedAt = new Date().toISOString();
    mirror.meta.tenant_id = plan.tenant_id;
    mirror.meta.last_executor = VERSION;
    mirror.meta.last_plan = planArg;
    writeJson(mirrorPath, mirror);
    executed = true;
  }
}
const decision = errors.length ? 'BLOQUEADO' : (mode === 'local-mirror' ? 'PERSISTENCIA_LAB_LOCAL_EJECUTADA' : 'DRY_RUN_LISTO');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  source_plan: planArg,
  mode,
  execute_enabled: mode === 'local-mirror' && executeToken === EXECUTE_TOKEN,
  decision,
  tenant_id: plan ? plan.tenant_id : null,
  summary: { conciliaciones: writes.length, auditLog: auditWrites.length, executed },
  write_targets: ['conciliaciones','auditLog'],
  blocked_targets: Array.from(BLOCKED_MUTATION_COLLECTIONS),
  local_mirror_path: mode === 'local-mirror' && !errors.length ? mirrorPath : null,
  planned_writes: writes,
  planned_audit_writes: auditWrites,
  errors,
  warnings,
  restrictions: ['disabled-by-default','no cobros mutation','no payment application','no secrets','metadata-only documents','local-mirror only unless backend adapter is explicitly added']
};
const reportJson = outArg ? path.resolve(root, outArg) : path.join(REPORT_DIR, `EJECUCION-PERSISTENCIA-CONCILIACIONES-LAB-AYS-${stamp}.json`);
const reportTxt = path.join(REPORT_DIR, `EJECUCION-PERSISTENCIA-CONCILIACIONES-LAB-AYS-${stamp}.txt`);
writeJson(reportJson, report);
const txt = [
  '============================================================',
  'ORBIT 360 - EJECUTOR PERSISTENCIA CONCILIACIONES LAB A&S',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Plan: ${planArg || 'S/D'}`,
  `Modo: ${mode}`,
  `Decision: ${decision}`,
  'Restricciones: deshabilitado por defecto, sin cobros, sin pagos, sin secretos.',
  '============================================================',
  '',
  `Conciliaciones planificadas: ${writes.length}`,
  `AuditLog planificado: ${auditWrites.length}`,
  `Ejecutado local mirror: ${executed ? 'SI' : 'NO'}`,
  mode === 'local-mirror' && !errors.length ? `Mirror: ${mirrorPath}` : '',
  '',
  `Errores: ${errors.length}`,
  ...errors.map(e=>`ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w=>`WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(reportTxt, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
