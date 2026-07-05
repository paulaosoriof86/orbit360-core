#!/usr/bin/env node
/* Orbit 360 A&S — Validador contrato/modelo polizas + recibos + cartera.
   Plan-only. No lee datos reales, no escribe Orbit.store/Firestore, no genera cartera operativa. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const VERSION = 'v1.0.0-ays-validar-modelo-polizas-recibos-cartera';
const reportDir = path.join(root, '_orbit360_reports');
const args = process.argv.slice(2);
const modelArg = args[args.indexOf('--model') + 1];
const expectedTenant = args.includes('--tenant') ? args[args.indexOf('--tenant') + 1] : 'alianzas-soluciones';

const REQUIRED_COLLECTIONS = ['polizas','recibos','carteraItems','polizaClienteRelaciones','auditLog'];
const REQUIRED_POLICY_FIELDS = [
  'tenantId','poliza_id','cliente_id','numero_poliza','aseguradora_id','ramo','pais','moneda','estado_poliza',
  'vigencia_inicio','vigencia_fin','prima_neta','gastos','impuestos','prima_total','fuente_origen','source_ref',
  'calidad_datos','created_at','updated_at'
];
const REQUIRED_RECEIPT_FIELDS = [
  'tenantId','recibo_id','poliza_id','cliente_id','pais','moneda','periodo','fecha_vencimiento',
  'prima_neta','gastos','impuestos','prima_total','estado_recibo','source_ref','created_at','updated_at'
];
const REQUIRED_PORTFOLIO_FIELDS = [
  'tenantId','cartera_item_id','recibo_id','poliza_id','cliente_id','pais','moneda','anio','saldo_pendiente',
  'estado_cartera','origen','source_ref','created_at','updated_at'
];
const REQUIRED_REL_FIELDS = ['tenantId','poliza_id','cliente_id','relacion_estado','source_ref','created_at','updated_at'];
const REQUIRED_PREMIUM_FIELDS = ['prima_neta','gastos','impuestos','prima_total'];
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
  for(const src of ['polizas','clientes','configuracion_catalogo','documentos_soporte']){
    if(!allowed.has(src)) errors.push(`Falta fuente permitida para modelo pólizas: ${src}.`);
  }
  for(const blocked of ['financiero_historico','finmovs','estado_cuenta_bancario','planilla_comisiones']){
    if(allowed.has(blocked)) errors.push(`Fuente no permitida para crear pólizas/recibos: ${blocked}.`);
  }
  if(model.documents_only_propose !== true) errors.push('Debe declarar documents_only_propose=true.');
  if(model.documents_can_create_policy_without_confirmation === true) errors.push('Documentos soporte no pueden crear/modificar pólizas sin confirmación y diff.');
  if(model.can_create_clients_from_policy !== false) errors.push('El modelo de pólizas no debe crear clientes automáticamente.');
}
function validateCountryCurrency(model, errors){
  const cc = model.country_currency_rules || {};
  if(cc.GT !== 'GTQ') errors.push('Regla país/moneda GT debe ser GTQ.');
  if(cc.CO !== 'COP') errors.push('Regla país/moneda CO debe ser COP.');
  if(model.missing_country_currency_status !== 'REQUIERE_VALIDACION') errors.push('País/moneda ausente debe quedar REQUIERE_VALIDACION.');
  if(model.allow_raw_multi_currency_sum === true) errors.push('No se permite suma cruda de monedas distintas.');
}
function validateStateRules(model, errors){
  const rules = model.policy_state_rules || {};
  requireSet(rules.generates_receivables_when, ['Vigente','Por renovar'], 'policy_state_rules.generates_receivables_when', errors);
  requireSet(rules.historical_only_when, ['Cancelada','Vencida','Anulada','Rechazada'], 'policy_state_rules.historical_only_when', errors);
  if(rules.missing_state_status !== 'REQUIERE_VALIDACION') errors.push('Estado faltante debe quedar REQUIERE_VALIDACION.');
  if(rules.generate_receivables_when_missing_state === true) errors.push('No se generan recibos si falta estado de póliza.');
  if(rules.generate_receivables_when_missing_country_currency === true) errors.push('No se generan recibos si falta país/moneda confiable.');
}
function validatePortfolioRules(model, errors){
  const cartera = model.portfolio_rules || {};
  if(cartera.current_year_only !== true) errors.push('Cartera debe limitarse al año actual.');
  requireSet(cartera.allowed_policy_states, ['Vigente','Por renovar'], 'portfolio_rules.allowed_policy_states', errors);
  if(cartera.only_pending_receipts !== true) errors.push('Cartera debe usar solo recibos pendientes.');
  if(cartera.from_financial_history === true) errors.push('Cartera no se genera desde histórico financiero.');
  if(model.can_generate_portfolio_now !== false) errors.push('Debe declarar can_generate_portfolio_now=false en fase plan-only.');
}
function validatePremiumRules(model, errors){
  const premium = model.premium_rules || {};
  requireSet(premium.required_components, REQUIRED_PREMIUM_FIELDS, 'premium_rules.required_components', errors);
  if(premium.production_basis !== 'prima_neta_recaudada') errors.push('Producción/metas/comisiones deben basarse en prima_neta_recaudada.');
  if(premium.policy_emission_counts_as_production === true) errors.push('Emisión de póliza no debe contar como producción sin recaudo.');
  if(premium.allow_total_without_components === true) errors.push('No se permite solo prima_total sin componentes separados.');
}
function validateCollections(model, errors){
  const map = collectionMap(model);
  for(const name of REQUIRED_COLLECTIONS) if(!map[name]) errors.push(`Falta colección requerida: ${name}.`);
  const polizas = fieldNames(map.polizas);
  const recibos = fieldNames(map.recibos);
  const cartera = fieldNames(map.carteraItems);
  const rel = fieldNames(map.polizaClienteRelaciones);
  for(const f of REQUIRED_POLICY_FIELDS) if(!polizas.includes(f)) errors.push(`polizas falta campo ${f}.`);
  for(const f of REQUIRED_RECEIPT_FIELDS) if(!recibos.includes(f)) errors.push(`recibos falta campo ${f}.`);
  for(const f of REQUIRED_PORTFOLIO_FIELDS) if(!cartera.includes(f)) errors.push(`carteraItems falta campo ${f}.`);
  for(const f of REQUIRED_REL_FIELDS) if(!rel.includes(f)) errors.push(`polizaClienteRelaciones falta campo ${f}.`);
}
function validateQuality(model, errors, warnings){
  const quality = model.quality || {};
  if(quality.blocks_receivable_generation_when_missing_state_country_currency !== true){
    errors.push('Calidad debe bloquear recibos/cartera cuando falta estado, país o moneda.');
  }
  if(quality.traceability_required !== true) errors.push('Debe requerir trazabilidad source_ref.');
  const statuses = new Set(asArray(quality.allowed_statuses));
  for(const s of ['COMPLETO','INCOMPLETO','REQUIERE_VALIDACION','BLOQUEADO']) if(!statuses.has(s)) errors.push(`Calidad falta estado ${s}.`);
  if(model.academia?.impact_review_required !== true) warnings.push('Academia/manuales deberían marcar impact_review_required=true.');
}
function validateModel(model){
  const errors=[]; const warnings=[];
  if(!model || typeof model !== 'object') errors.push('Modelo inválido o vacío.');
  if(model.tenantId !== expectedTenant) errors.push(`tenantId esperado ${expectedTenant}, recibido ${model.tenantId}.`);
  if(model.model !== 'polizas_recibos_cartera') errors.push('model debe ser polizas_recibos_cartera.');
  if(model.plan_only !== true) errors.push('Debe declarar plan_only=true.');
  if(model.can_write_now !== false) errors.push('Debe declarar can_write_now=false.');
  if(model.can_create_policies_now !== false) errors.push('Debe declarar can_create_policies_now=false.');
  if(model.can_create_receipts_now !== false) errors.push('Debe declarar can_create_receipts_now=false.');
  validateNoForbidden(model, errors);
  validateSources(model, errors);
  validateCountryCurrency(model, errors);
  validateStateRules(model, errors);
  validatePortfolioRules(model, errors);
  validatePremiumRules(model, errors);
  validateCollections(model, errors);
  validateQuality(model, errors, warnings);
  const decision = errors.length ? 'MODELO_POLIZAS_BLOQUEADO' : (warnings.length ? 'MODELO_POLIZAS_VALIDO_CON_ADVERTENCIAS' : 'MODELO_POLIZAS_VALIDO');
  return { errors, warnings, decision };
}

if(!modelArg){
  console.error('Uso: node tools/orbit360-validar-modelo-polizas-recibos-cartera-ays.mjs --model ruta/modelo-polizas.json [--tenant alianzas-soluciones]');
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
  can_create_policies_now: false,
  can_create_receipts_now: false,
  can_generate_portfolio_now: false,
  restrictions: ['plan-only','synthetic-contract','no real data','no Orbit.store writes','no Firestore writes','no policy creation','no receipt creation','no portfolio generation','no deploy','no merge']
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportDir, `VALIDACION-MODELO-POLIZAS-RECIBOS-CARTERA-AYS-${stamp}.json`);
const txtPath = jsonPath.replace(/\.json$/, '.txt');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — VALIDACION MODELO POLIZAS RECIBOS CARTERA',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  'Restricciones: plan-only, sin datos reales, sin writes, sin crear pólizas/recibos/cartera.',
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
