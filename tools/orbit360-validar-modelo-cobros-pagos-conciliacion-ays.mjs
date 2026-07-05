#!/usr/bin/env node
/* Orbit 360 A&S — Validador contrato/modelo cobros + pagos reportados + conciliación.
   Plan-only. No lee datos reales, no escribe Orbit.store/Firestore, no aplica pagos. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const VERSION = 'v1.0.0-ays-validar-modelo-cobros-pagos-conciliacion';
const reportDir = path.join(root, '_orbit360_reports');
const args = process.argv.slice(2);
const modelArg = args[args.indexOf('--model') + 1];
const expectedTenant = args.includes('--tenant') ? args[args.indexOf('--tenant') + 1] : 'alianzas-soluciones';

const REQUIRED_COLLECTIONS = ['cobros','pagosReportados','conciliacionesCobros','cobroReciboRelaciones','auditLog'];
const REQUIRED_PAYMENT_FIELDS = [
  'tenantId','cobro_id','recibo_id','poliza_id','cliente_id','pais','moneda','fecha_recaudo','prima_neta_recaudada',
  'gastos_recaudados','impuestos_recaudados','total_recaudado','medio_pago','estado_cobro','fuente_origen','source_ref',
  'conciliacion_id','created_at','updated_at'
];
const REQUIRED_REPORTED_FIELDS = [
  'tenantId','pago_reportado_id','cliente_id','poliza_id','recibo_id','pais','moneda','monto_reportado','fecha_reporte',
  'canal_reporte','estado_pago_reportado','documento_soporte_id','source_ref','created_at','updated_at'
];
const REQUIRED_MATCH_FIELDS = [
  'tenantId','conciliacion_id','tipo_fuente','source_ref','candidato_tipo','recibo_id','poliza_id','cliente_id','pais','moneda',
  'monto','score','estado_conciliacion','decision','created_at','updated_at'
];
const REQUIRED_REL_FIELDS = ['tenantId','cobro_id','recibo_id','relacion_estado','source_ref','created_at','updated_at'];
const PREMIUM_RECAUDADO_FIELDS = ['prima_neta_recaudada','gastos_recaudados','impuestos_recaudados','total_recaudado'];
const FORBIDDEN_KEYS = ['rows','rawRows','raw_rows','sampleRows','payload','dataRows','records','realData','password','secret','token','apiKey','privateKey','credential','firebaseConfig'];

function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function asArray(v){ return Array.isArray(v) ? v : []; }
function walk(obj, cb, prefix=''){
  if(!obj || typeof obj !== 'object') return;
  for(const [k,v] of Object.entries(obj)){
    const keyPath = prefix ? `${prefix}.${k}` : k;
    cb(k, v, keyPath);
    if(v && typeof v === 'object') walk(v, cb, keyPath);
  }
}
function fieldNames(collection){
  if(Array.isArray(collection?.fields)) return collection.fields.map(f => typeof f === 'string' ? f : f.name).filter(Boolean);
  if(collection?.schema && typeof collection.schema === 'object') return Object.keys(collection.schema);
  return [];
}
function collectionMap(model){
  const out = {};
  for(const c of asArray(model.collections)) if(c?.name) out[c.name] = c;
  return out;
}
function requireSet(values, required, label, errors){
  const set = new Set(asArray(values));
  for(const v of required) if(!set.has(v)) errors.push(`${label} falta ${v}.`);
}
function validateNoForbidden(model, errors){
  walk(model, (k, v, keyPath) => {
    const lower = String(k).toLowerCase();
    for(const forbidden of FORBIDDEN_KEYS){
      if(lower === forbidden.toLowerCase()) errors.push(`Clave prohibida en contrato plan-only: ${keyPath}.`);
    }
    if(typeof v === 'string' && /AIza|-----BEGIN|password\s*=|token\s*=|secret\s*=/i.test(v)){
      errors.push(`Posible secreto o credencial en ${keyPath}.`);
    }
  });
}
function validateSources(model, errors){
  const allowed = new Set(asArray(model.allowed_source_types));
  for(const src of ['cobros_realizados','planilla_aseguradora','planilla_comisiones','estado_cuenta_bancario','documentos_soporte']){
    if(!allowed.has(src)) errors.push(`Falta fuente permitida para conciliación/cobros: ${src}.`);
  }
  for(const blocked of ['financiero_historico','finmovs','clientes','polizas']){
    if(allowed.has(blocked)) errors.push(`Fuente no permitida para crear cobros/recaudos: ${blocked}.`);
  }
  if(model.financial_history_only_finmovs !== true) errors.push('Debe declarar financial_history_only_finmovs=true.');
  if(model.bank_statement_only_proposes_conciliation !== true) errors.push('Estado bancario debe proponer conciliación, no crear cobro directo.');
  if(model.documents_only_propose !== true) errors.push('Documentos soporte solo proponen evidencia/datos.');
}
function validateCountryCurrency(model, errors){
  const cc = model.country_currency_rules || {};
  if(cc.GT !== 'GTQ') errors.push('Regla país/moneda GT debe ser GTQ.');
  if(cc.CO !== 'COP') errors.push('Regla país/moneda CO debe ser COP.');
  if(model.missing_country_currency_status !== 'REQUIERE_VALIDACION') errors.push('País/moneda ausente debe quedar REQUIERE_VALIDACION.');
  if(model.allow_raw_multi_currency_sum === true) errors.push('No se permite suma cruda de monedas distintas.');
}
function validateCollections(model, errors){
  const map = collectionMap(model);
  for(const name of REQUIRED_COLLECTIONS) if(!map[name]) errors.push(`Falta colección requerida: ${name}.`);
  const cobros = fieldNames(map.cobros);
  const reportados = fieldNames(map.pagosReportados);
  const conc = fieldNames(map.conciliacionesCobros);
  const rels = fieldNames(map.cobroReciboRelaciones);
  for(const f of REQUIRED_PAYMENT_FIELDS) if(!cobros.includes(f)) errors.push(`cobros falta campo ${f}.`);
  for(const f of REQUIRED_REPORTED_FIELDS) if(!reportados.includes(f)) errors.push(`pagosReportados falta campo ${f}.`);
  for(const f of REQUIRED_MATCH_FIELDS) if(!conc.includes(f)) errors.push(`conciliacionesCobros falta campo ${f}.`);
  for(const f of REQUIRED_REL_FIELDS) if(!rels.includes(f)) errors.push(`cobroReciboRelaciones falta campo ${f}.`);
}
function validateReportedPayments(model, errors){
  const reported = model.reported_payment_rules || {};
  const statuses = new Set(asArray(reported.allowed_statuses));
  for(const s of ['REPORTADO','PENDIENTE_REVISION','REQUIERE_VALIDACION','CONCILIADO','RECHAZADO','BLOQUEADO']){
    if(!statuses.has(s)) errors.push(`reported_payment_rules.allowed_statuses falta ${s}.`);
  }
  if(reported.reported_is_collected === true) errors.push('Pago reportado no equivale a cobro/recaudo confirmado.');
  if(reported.requires_document_traceability !== true) errors.push('Pago reportado debe conservar trazabilidad de soporte/documento cuando exista.');
  if(reported.visible_to_client_status !== true) errors.push('Pago reportado debe tener estado visible/honesto para cliente.');
}
function validateConciliation(model, errors){
  const conc = model.conciliation_rules || {};
  const statuses = new Set(asArray(conc.allowed_statuses));
  for(const s of ['PROPUESTA','LISTA_REVISION','REQUIERE_VALIDACION','VALIDADA','RECHAZADA','BLOQUEADA']){
    if(!statuses.has(s)) errors.push(`conciliation_rules.allowed_statuses falta ${s}.`);
  }
  if(conc.validated_means_collected === true) errors.push('Conciliación validada no debe equivaler automáticamente a cobro aplicado.');
  if(conc.apply_payment_requires_authorization !== true) errors.push('Aplicar cobro debe requerir autorización explícita posterior.');
  if(conc.minimum_fields_required_for_application === undefined) errors.push('Debe declarar campos mínimos para futura aplicación.');
  requireSet(conc.minimum_fields_required_for_application, ['tenantId','recibo_id','poliza_id','cliente_id','pais','moneda','prima_neta_recaudada','source_ref'], 'conciliation_rules.minimum_fields_required_for_application', errors);
}
function validateReceiptsPortfolioProduction(model, errors){
  const rules = model.receivable_payment_rules || {};
  if(rules.can_modify_portfolio_now !== false) errors.push('Debe declarar can_modify_portfolio_now=false en fase plan-only.');
  if(rules.bank_statement_can_mark_receipt_paid === true) errors.push('Estado bancario no debe marcar recibo pagado sin conciliación/aprobación.');
  if(rules.payment_updates_receipt_only_after_conciliation !== true) errors.push('Recibo solo se actualiza después de conciliación/aprobación.');
  if(rules.collections_are_finmovs === true) errors.push('Cobros/recaudos no son finmovs.');
  const production = model.production_rules || {};
  requireSet(production.required_collected_components, PREMIUM_RECAUDADO_FIELDS, 'production_rules.required_collected_components', errors);
  if(production.production_basis !== 'prima_neta_recaudada') errors.push('Producción/metas/comisiones deben basarse en prima_neta_recaudada.');
  if(production.can_count_reported_payment_as_production === true) errors.push('Pago reportado no cuenta como producción.');
  if(production.can_count_unconciled_payment_as_production === true) errors.push('Pago sin conciliación no cuenta como producción.');
}
function validateTraceability(model, errors, warnings){
  const tr = model.traceability || {};
  requireSet(tr.required_fields, ['file','sheet','row','block','pais','moneda','periodo','source_ref'], 'traceability.required_fields', errors);
  if(tr.audit_required !== true) errors.push('Debe requerir auditLog.');
  if(model.academia?.impact_review_required !== true) warnings.push('Academia/manuales deberían marcar impact_review_required=true.');
}
function validateModel(model){
  const errors=[]; const warnings=[];
  if(!model || typeof model !== 'object') errors.push('Modelo inválido o vacío.');
  if(model.tenantId !== expectedTenant) errors.push(`tenantId esperado ${expectedTenant}, recibido ${model.tenantId}.`);
  if(model.model !== 'cobros_pagos_reportados_conciliacion') errors.push('model debe ser cobros_pagos_reportados_conciliacion.');
  if(model.plan_only !== true) errors.push('Debe declarar plan_only=true.');
  if(model.can_write_now !== false) errors.push('Debe declarar can_write_now=false.');
  if(model.can_apply_payments_now !== false) errors.push('Debe declarar can_apply_payments_now=false.');
  if(model.can_create_collections_now !== false) errors.push('Debe declarar can_create_collections_now=false.');
  validateNoForbidden(model, errors);
  validateSources(model, errors);
  validateCountryCurrency(model, errors);
  validateCollections(model, errors);
  validateReportedPayments(model, errors);
  validateConciliation(model, errors);
  validateReceiptsPortfolioProduction(model, errors);
  validateTraceability(model, errors, warnings);
  const decision = errors.length ? 'MODELO_COBROS_BLOQUEADO' : (warnings.length ? 'MODELO_COBROS_VALIDO_CON_ADVERTENCIAS' : 'MODELO_COBROS_VALIDO');
  return { errors, warnings, decision };
}

if(!modelArg){
  console.error('Uso: node tools/orbit360-validar-modelo-cobros-pagos-conciliacion-ays.mjs --model ruta/modelo-cobros.json [--tenant alianzas-soluciones]');
  process.exit(2);
}

fs.mkdirSync(reportDir, { recursive:true });
const modelPath = path.resolve(root, modelArg);
const model = readJson(modelPath);
const result = validateModel(model);
const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  model_file: rel(modelPath),
  expectedTenant,
  decision: result.decision,
  errors: result.errors,
  warnings: result.warnings,
  can_write_now: false,
  can_apply_payments_now: false,
  can_create_collections_now: false,
  restrictions: ['plan-only','synthetic-contract','no real data','no Orbit.store writes','no Firestore writes','no payment application','no collection creation','no portfolio mutation','no production update','no deploy','no merge']
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportDir, `VALIDACION-MODELO-COBROS-PAGOS-CONCILIACION-AYS-${stamp}.json`);
const txtPath = jsonPath.replace(/\.json$/, '.txt');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — VALIDACION MODELO COBROS PAGOS CONCILIACION',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  'Restricciones: plan-only, sin datos reales, sin writes, sin aplicar pagos.',
  '============================================================',
  '',
  `Errores: ${result.errors.length}`,
  ...result.errors.map(e => `ERROR: ${e}`),
  '',
  `Advertencias: ${result.warnings.length}`,
  ...result.warnings.map(w => `WARN: ${w}`),
  '',
  `JSON: ${rel(jsonPath)}`,
  result.errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(result.errors.length ? 1 : 0);
