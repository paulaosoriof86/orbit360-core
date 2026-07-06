#!/usr/bin/env node
/* Orbit 360 A&S — Validador plan-only caso especial junio/julio 2026.
   No lee archivos reales, no procesa filas reales y no escribe datos. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '_orbit360_reports');
const args = process.argv.slice(2);
const planFile = args[args.indexOf('--plan') + 1];
const expectedTenant = args.includes('--tenant') ? args[args.indexOf('--tenant') + 1] : 'alianzas-soluciones';
fs.mkdirSync(outDir, { recursive: true });

const allowedSources = [
  'planilla_comisiones','planilla_aseguradora','estado_cuenta_cliente','estado_cuenta_bancario',
  'cobros_realizados','financiero_historico','polizas','clientes','aseguradoras','configuracion_catalogo'
];
const forbiddenActions = ['aplicar_pago','crear_cobro','cerrar_recibo_pagado','mover_cartera','actualizar_produccion','actualizar_comision_pagada'];
const forbiddenStatuses = ['APLICADA','PAGO_APLICADO','COBRO_APLICADO','PAGADA'];
const requiredTrace = ['fuente','archivo','hoja','fila','bloque','periodo','pais','moneda','monto','referencia','source_ref','confidence','bloqueos'];

function arr(v){ return Array.isArray(v) ? v : []; }
function hasAll(values, required){ const s = new Set(arr(values)); return required.every(x => s.has(x)); }
function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function walk(obj, cb, prefix=''){
  if(!obj || typeof obj !== 'object') return;
  for(const [k,v] of Object.entries(obj)){
    const p = prefix ? `${prefix}.${k}` : k;
    cb(k,v,p);
    if(v && typeof v === 'object') walk(v, cb, p);
  }
}

if(!planFile){
  console.error('Uso: node tools/orbit360-validar-caso-junio-julio-conciliacion-ays.mjs --plan ruta/plan.json [--tenant alianzas-soluciones]');
  process.exit(2);
}

const plan = readJson(path.resolve(root, planFile));
const errors = [];
const warnings = [];

if(plan.tenantId !== expectedTenant) errors.push(`tenantId esperado ${expectedTenant}, recibido ${plan.tenantId}`);
if(plan.case_id !== 'junio_julio_2026_conciliacion') errors.push('case_id debe ser junio_julio_2026_conciliacion');
if(plan.plan_only !== true) errors.push('plan_only debe ser true');
if(plan.can_write_now !== false) errors.push('can_write_now debe ser false');
if(plan.can_apply_payments !== false) errors.push('can_apply_payments debe ser false');
if(plan.can_create_collections !== false) errors.push('can_create_collections debe ser false');
if(plan.can_update_portfolio !== false) errors.push('can_update_portfolio debe ser false');
if(plan.can_update_production !== false) errors.push('can_update_production debe ser false');

for(const s of arr(plan.sources)){
  if(!allowedSources.includes(s)) errors.push(`Fuente no permitida: ${s}`);
}
if(!arr(plan.sources).includes('planilla_comisiones')) warnings.push('Para este caso especial debería incluir planilla_comisiones.');
if(!arr(plan.sources).includes('estado_cuenta_cliente')) warnings.push('Para este caso especial debería incluir estado_cuenta_cliente.');

for(const a of arr(plan.allowed_actions)){
  if(forbiddenActions.includes(a)) errors.push(`Acción prohibida permitida: ${a}`);
}
for(const s of arr(plan.allowed_statuses)){
  if(forbiddenStatuses.includes(String(s).toUpperCase())) errors.push(`Estado prohibido permitido: ${s}`);
}
if(!arr(plan.blocked_statuses).includes('APLICADA')) errors.push('blocked_statuses debe incluir APLICADA');
if(plan.currency_rules?.GT !== 'GTQ') errors.push('GT debe mapear GTQ');
if(plan.currency_rules?.CO !== 'COP') errors.push('CO debe mapear COP');
if(plan.allow_raw_currency_sum !== false) errors.push('allow_raw_currency_sum debe ser false');
if(plan.missing_country_currency_status !== 'REQUIERE_VALIDACION') errors.push('moneda/pais faltante debe quedar REQUIERE_VALIDACION');
if(!hasAll(plan.traceability_required, requiredTrace)) errors.push('traceability_required incompleta');

const sourceRules = plan.source_rules || {};
if(sourceRules.estado_cuenta_bancario?.can_create_payment !== false) errors.push('Banco no puede crear pago aplicado.');
if(sourceRules.estado_cuenta_cliente?.treated_as_payment_done !== false) errors.push('Estado cuenta cliente no puede tratarse como pago realizado.');
if(sourceRules.financiero_historico?.can_create_portfolio !== false) errors.push('Financiero histórico no puede crear cartera.');
if(sourceRules.planilla_comisiones?.can_create_portfolio !== false) errors.push('Planilla comisiones no puede crear cartera.');
if(sourceRules.planilla_comisiones?.requires_real_rows !== true) errors.push('Planilla comisiones debe requerir filas reales para lectura futura, no tarifas simuladas.');

walk(plan, (k,v,p) => {
  const key = String(k).toLowerCase();
  if(['rows','rawrows','payload','realdata','base64','binary','secret','token','apikey','password','credential'].includes(key)) errors.push(`Clave prohibida en plan-only: ${p}`);
  if(typeof v === 'string' && /AIza|-----BEGIN|password\s*=|token\s*=|secret\s*=|base64,/i.test(v)) errors.push(`Posible secreto o payload real en ${p}`);
});

const report = { created_at: new Date().toISOString(), decision: errors.length ? 'CASO_JUNIO_JULIO_BLOQUEADO' : 'CASO_JUNIO_JULIO_VALIDO_PLAN_ONLY', errors, warnings };
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const json = path.join(outDir, `CASO-JUNIO-JULIO-CONCILIACION-AYS-${stamp}.json`);
const txt = json.replace(/\.json$/, '.txt');
fs.writeFileSync(json, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(txt, [
  'ORBIT 360 A&S - VALIDACION CASO JUNIO/JULIO CONCILIACION',
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n'), 'utf8');
console.log(fs.readFileSync(txt, 'utf8'));
process.exit(errors.length ? 1 : 0);
