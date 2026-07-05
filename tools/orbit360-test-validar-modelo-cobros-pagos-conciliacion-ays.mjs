#!/usr/bin/env node
/* Orbit 360 A&S — Tests sintéticos validador cobros/pagos/conciliación.
   No datos reales, no writes, no Firestore, no aplicación de pagos. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportDir = path.join(root, '_orbit360_reports');
const tmpDir = path.join(root, '_orbit360_tmp', 'modelo-cobros');
const validator = path.join(root, 'tools', 'orbit360-validar-modelo-cobros-pagos-conciliacion-ays.mjs');
fs.mkdirSync(reportDir, { recursive:true });
fs.mkdirSync(tmpDir, { recursive:true });

function writeJson(name, obj){
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
  return file;
}
function runCase(name, model, expectedExit){
  const file = writeJson(`${name}.json`, model);
  const res = spawnSync(process.execPath, [validator, '--model', file, '--tenant', 'alianzas-soluciones'], { cwd:root, encoding:'utf8' });
  return {
    name,
    expectedExit,
    actualExit: res.status,
    ok: res.status === expectedExit,
    stdout_tail: (res.stdout || '').slice(-2500),
    stderr_tail: (res.stderr || '').slice(-1000)
  };
}

const baseValid = {
  tenantId: 'alianzas-soluciones',
  model: 'cobros_pagos_reportados_conciliacion',
  plan_only: true,
  can_write_now: false,
  can_apply_payments_now: false,
  can_create_collections_now: false,
  financial_history_only_finmovs: true,
  bank_statement_only_proposes_conciliation: true,
  documents_only_propose: true,
  allowed_source_types: ['cobros_realizados','planilla_aseguradora','planilla_comisiones','estado_cuenta_bancario','documentos_soporte'],
  country_currency_rules: { GT:'GTQ', CO:'COP' },
  missing_country_currency_status: 'REQUIERE_VALIDACION',
  allow_raw_multi_currency_sum: false,
  collections: [
    { name:'cobros', fields:['tenantId','cobro_id','recibo_id','poliza_id','cliente_id','pais','moneda','fecha_recaudo','prima_neta_recaudada','gastos_recaudados','impuestos_recaudados','total_recaudado','medio_pago','estado_cobro','fuente_origen','source_ref','conciliacion_id','created_at','updated_at'] },
    { name:'pagosReportados', fields:['tenantId','pago_reportado_id','cliente_id','poliza_id','recibo_id','pais','moneda','monto_reportado','fecha_reporte','canal_reporte','estado_pago_reportado','documento_soporte_id','source_ref','created_at','updated_at'] },
    { name:'conciliacionesCobros', fields:['tenantId','conciliacion_id','tipo_fuente','source_ref','candidato_tipo','recibo_id','poliza_id','cliente_id','pais','moneda','monto','score','estado_conciliacion','decision','created_at','updated_at'] },
    { name:'cobroReciboRelaciones', fields:['tenantId','cobro_id','recibo_id','relacion_estado','source_ref','created_at','updated_at'] },
    { name:'auditLog', fields:['tenantId','event_id','entity','entity_id','action','actor_id','source_ref','created_at'] }
  ],
  reported_payment_rules: {
    allowed_statuses: ['REPORTADO','PENDIENTE_REVISION','REQUIERE_VALIDACION','CONCILIADO','RECHAZADO','BLOQUEADO'],
    reported_is_collected: false,
    requires_document_traceability: true,
    visible_to_client_status: true
  },
  conciliation_rules: {
    allowed_statuses: ['PROPUESTA','LISTA_REVISION','REQUIERE_VALIDACION','VALIDADA','RECHAZADA','BLOQUEADA'],
    validated_means_collected: false,
    apply_payment_requires_authorization: true,
    minimum_fields_required_for_application: ['tenantId','recibo_id','poliza_id','cliente_id','pais','moneda','prima_neta_recaudada','source_ref']
  },
  receivable_payment_rules: {
    can_modify_portfolio_now: false,
    bank_statement_can_mark_receipt_paid: false,
    payment_updates_receipt_only_after_conciliation: true,
    collections_are_finmovs: false
  },
  production_rules: {
    required_collected_components: ['prima_neta_recaudada','gastos_recaudados','impuestos_recaudados','total_recaudado'],
    production_basis: 'prima_neta_recaudada',
    can_count_reported_payment_as_production: false,
    can_count_unconciled_payment_as_production: false
  },
  traceability: {
    required_fields: ['file','sheet','row','block','pais','moneda','periodo','source_ref'],
    audit_required: true
  },
  academia: { impact_review_required: true }
};

const cases = [
  ['modelo-valido', baseValid, 0],
  ['bloquea-finmovs-como-fuente', { ...baseValid, allowed_source_types:[...baseValid.allowed_source_types, 'finmovs'] }, 1],
  ['bloquea-banco-crea-cobro', { ...baseValid, bank_statement_only_proposes_conciliation:false }, 1],
  ['bloquea-pago-reportado-como-cobrado', { ...baseValid, reported_payment_rules:{ ...baseValid.reported_payment_rules, reported_is_collected:true } }, 1],
  ['bloquea-conciliacion-validada-aplica', { ...baseValid, conciliation_rules:{ ...baseValid.conciliation_rules, validated_means_collected:true } }, 1],
  ['bloquea-produccion-pago-reportado', { ...baseValid, production_rules:{ ...baseValid.production_rules, can_count_reported_payment_as_production:true } }, 1],
  ['bloquea-modificar-cartera-ahora', { ...baseValid, receivable_payment_rules:{ ...baseValid.receivable_payment_rules, can_modify_portfolio_now:true } }, 1],
  ['bloquea-multi-moneda-cruda', { ...baseValid, allow_raw_multi_currency_sum:true }, 1],
  ['bloquea-payload-real', { ...baseValid, rawRows:[{ fila:1, cobro:'NO_USAR_DATOS_REALES' }] }, 1]
];

const results = cases.map(([name, model, expected]) => runCase(name, model, expected));
const failed = results.filter(r => !r.ok);
const report = {
  created_at: new Date().toISOString(),
  tool: 'orbit360-test-validar-modelo-cobros-pagos-conciliacion-ays',
  total: results.length,
  failed: failed.length,
  results,
  restrictions: ['synthetic-only','no real data','no writes','no Firestore','no payment application','no portfolio mutation','no production update']
};
const out = path.join(reportDir, 'TEST-VALIDAR-MODELO-COBROS-PAGOS-CONCILIACION-AYS.txt');
fs.writeFileSync(out, [
  'ORBIT 360 A&S — TEST VALIDAR MODELO COBROS PAGOS CONCILIACION',
  `Fecha: ${report.created_at}`,
  `Total: ${report.total}`,
  `Fallidos: ${report.failed}`,
  '',
  ...results.map(r => `${r.ok ? 'OK' : 'FAIL'} ${r.name} expected=${r.expectedExit} actual=${r.actualExit}`),
  '',
  failed.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n'), 'utf8');
console.log(fs.readFileSync(out, 'utf8'));
process.exit(failed.length ? 1 : 0);
