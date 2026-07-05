#!/usr/bin/env node
/* Orbit 360 A&S — Readiness backend conciliaciones/auditLog.
   Valida un plan JSON antes de cualquier implementación. No escribe datos. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '_orbit360_reports');
const args = process.argv.slice(2);
const planPath = args[args.indexOf('--plan') + 1];
const expectedTenant = args.includes('--tenant') ? args[args.indexOf('--tenant') + 1] : 'alianzas-soluciones';
fs.mkdirSync(outDir, { recursive: true });

const allowedCollections = ['conciliaciones', 'auditLog'];
const forbiddenCollections = ['cobros','recibos','carteraItems','polizas','produccion','comisiones','finmovs','documentosSoporte','pagosReportados'];
const forbiddenStates = ['APLICADA','PAGADO','PAGO_APLICADO','COBRO_APLICADO'];
const requiredApi = ['all','get','where','insert','update','remove','_emit'];

function fail(msg, errors){ errors.push(msg); }
function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function arr(v){ return Array.isArray(v) ? v : []; }
function hasAll(values, required){ const s = new Set(arr(values)); return required.every(x => s.has(x)); }
function walk(obj, cb, prefix=''){
  if(!obj || typeof obj !== 'object') return;
  for(const [k,v] of Object.entries(obj)){
    const p = prefix ? `${prefix}.${k}` : k;
    cb(k,v,p);
    if(v && typeof v === 'object') walk(v, cb, p);
  }
}

if(!planPath){
  console.error('Uso: node tools/orbit360-validar-readiness-backend-conciliaciones-auditlog-ays.mjs --plan ruta/plan.json [--tenant alianzas-soluciones]');
  process.exit(2);
}

const plan = readJson(path.resolve(root, planPath));
const errors = [];
const warnings = [];

if(plan.tenantId !== expectedTenant) fail(`tenantId esperado ${expectedTenant}, recibido ${plan.tenantId}`, errors);
if(plan.scope !== 'conciliaciones_auditLog_lab') fail('scope debe ser conciliaciones_auditLog_lab', errors);
if(plan.phase !== 'readiness_only') fail('phase debe ser readiness_only', errors);
if(plan.can_write_now !== false) fail('can_write_now debe ser false', errors);
if(plan.can_deploy_now !== false) fail('can_deploy_now debe ser false', errors);
if(plan.can_merge_now !== false) fail('can_merge_now debe ser false', errors);
if(plan.can_apply_payments !== false) fail('can_apply_payments debe ser false', errors);
if(plan.can_mutate_collections !== false) fail('can_mutate_collections debe ser false', errors);
if(plan.requires_local_runner_ok !== true) fail('requires_local_runner_ok debe ser true', errors);
if(plan.requires_role_review_ok !== true) fail('requires_role_review_ok debe ser true', errors);
if(plan.requires_paula_authorization !== true) fail('requires_paula_authorization debe ser true', errors);

if(!hasAll(plan.orbit_store_api, requiredApi)) fail('orbit_store_api no contiene API mínima requerida', errors);
for(const c of arr(plan.allowed_write_collections || plan.allowed_collections)){
  if(!allowedCollections.includes(c)) fail(`colección no permitida para esta fase: ${c}`, errors);
}
for(const c of forbiddenCollections){
  if(arr(plan.allowed_write_collections || plan.allowed_collections).includes(c)) fail(`colección prohibida incluida: ${c}`, errors);
}
for(const s of arr(plan.allowed_states)){
  if(forbiddenStates.includes(String(s).toUpperCase())) fail(`estado prohibido incluido: ${s}`, errors);
}
if(!arr(plan.blocked_states).includes('APLICADA')) fail('blocked_states debe incluir APLICADA', errors);
if(plan.tenant_isolation?.path_must_include_tenant !== true) fail('tenant isolation debe exigir path_must_include_tenant=true', errors);
if(plan.tenant_isolation?.allowed_lab_tenant !== expectedTenant) fail('allowed_lab_tenant debe coincidir con tenant esperado', errors);
if(plan.auditLog?.required !== true) fail('auditLog.required debe ser true', errors);
if(!hasAll(plan.auditLog?.fields, ['tenantId','event_id','entity','entity_id','action','actor_id','before','after','source_ref','created_at'])) fail('auditLog.fields incompletos', errors);

walk(plan, (k,v,p) => {
  const key = String(k).toLowerCase();
  if(['secret','token','apikey','privatekey','password','credential','firebaseconfig'].includes(key)) fail(`clave sensible prohibida: ${p}`, errors);
  if(typeof v === 'string' && /AIza|-----BEGIN|password\s*=|token\s*=|secret\s*=/i.test(v)) fail(`posible secreto en ${p}`, errors);
});

if(!plan.reports_required?.includes('VALIDACIONES-ACUMULADAS-AYS')) warnings.push('reports_required debería incluir VALIDACIONES-ACUMULADAS-AYS');
if(!plan.reports_required?.includes('REVISION-ROLES-AYS')) warnings.push('reports_required debería incluir REVISION-ROLES-AYS');

const failed = errors.length > 0;
const report = { created_at: new Date().toISOString(), decision: failed ? 'READINESS_BACKEND_BLOQUEADO' : 'READINESS_BACKEND_LISTO_PARA_REVISION', errors, warnings };
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const json = path.join(outDir, `READINESS-BACKEND-CONCILIACIONES-AUDITLOG-AYS-${stamp}.json`);
const txt = json.replace(/\.json$/, '.txt');
fs.writeFileSync(json, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(txt, [
  'ORBIT 360 A&S - READINESS BACKEND CONCILIACIONES AUDITLOG',
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  failed ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n'), 'utf8');
console.log(fs.readFileSync(txt, 'utf8'));
process.exit(failed ? 1 : 0);
