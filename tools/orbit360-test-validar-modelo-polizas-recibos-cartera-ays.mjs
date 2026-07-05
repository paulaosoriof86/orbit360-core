#!/usr/bin/env node
/* Orbit 360 A&S — Tests sintéticos validador modelo polizas/recibos/cartera.
   No datos reales, no writes, no Firestore. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportDir = path.join(root, '_orbit360_reports');
const tmpDir = path.join(root, '_orbit360_tmp', 'modelo-polizas');
const validator = path.join(root, 'tools', 'orbit360-validar-modelo-polizas-recibos-cartera-ays.mjs');
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
  model: 'polizas_recibos_cartera',
  plan_only: true,
  can_write_now: false,
  can_create_policies_now: false,
  can_create_receipts_now: false,
  can_generate_portfolio_now: false,
  can_create_clients_from_policy: false,
  allowed_source_types: ['polizas','clientes','configuracion_catalogo','documentos_soporte'],
  documents_only_propose: true,
  documents_can_create_policy_without_confirmation: false,
  country_currency_rules: { GT:'GTQ', CO:'COP' },
  missing_country_currency_status: 'REQUIERE_VALIDACION',
  allow_raw_multi_currency_sum: false,
  policy_state_rules: {
    generates_receivables_when: ['Vigente','Por renovar'],
    historical_only_when: ['Cancelada','Vencida','Anulada','Rechazada'],
    missing_state_status: 'REQUIERE_VALIDACION',
    generate_receivables_when_missing_state: false,
    generate_receivables_when_missing_country_currency: false
  },
  portfolio_rules: {
    current_year_only: true,
    allowed_policy_states: ['Vigente','Por renovar'],
    only_pending_receipts: true,
    from_financial_history: false
  },
  premium_rules: {
    required_components: ['prima_neta','gastos','impuestos','prima_total'],
    production_basis: 'prima_neta_recaudada',
    policy_emission_counts_as_production: false,
    allow_total_without_components: false
  },
  collections: [
    { name:'polizas', fields:['tenantId','poliza_id','cliente_id','numero_poliza','aseguradora_id','ramo','pais','moneda','estado_poliza','vigencia_inicio','vigencia_fin','prima_neta','gastos','impuestos','prima_total','fuente_origen','source_ref','calidad_datos','created_at','updated_at'] },
    { name:'recibos', fields:['tenantId','recibo_id','poliza_id','cliente_id','pais','moneda','periodo','fecha_vencimiento','prima_neta','gastos','impuestos','prima_total','estado_recibo','source_ref','created_at','updated_at'] },
    { name:'carteraItems', fields:['tenantId','cartera_item_id','recibo_id','poliza_id','cliente_id','pais','moneda','anio','saldo_pendiente','estado_cartera','origen','source_ref','created_at','updated_at'] },
    { name:'polizaClienteRelaciones', fields:['tenantId','poliza_id','cliente_id','relacion_estado','source_ref','created_at','updated_at'] },
    { name:'auditLog', fields:['tenantId','event_id','entity','entity_id','action','actor_id','source_ref','created_at'] }
  ],
  quality: {
    blocks_receivable_generation_when_missing_state_country_currency: true,
    traceability_required: true,
    allowed_statuses: ['COMPLETO','INCOMPLETO','REQUIERE_VALIDACION','BLOQUEADO']
  },
  academia: { impact_review_required: true }
};

const cases = [
  ['modelo-valido', baseValid, 0],
  ['bloquea-fuente-financiera', { ...baseValid, allowed_source_types:['polizas','clientes','configuracion_catalogo','documentos_soporte','financiero_historico'] }, 1],
  ['bloquea-recibos-sin-estado', { ...baseValid, policy_state_rules:{ ...baseValid.policy_state_rules, generate_receivables_when_missing_state:true } }, 1],
  ['bloquea-cartera-ahora', { ...baseValid, can_generate_portfolio_now:true }, 1],
  ['bloquea-produccion-por-emision', { ...baseValid, premium_rules:{ ...baseValid.premium_rules, policy_emission_counts_as_production:true } }, 1],
  ['bloquea-multi-moneda-cruda', { ...baseValid, allow_raw_multi_currency_sum:true }, 1],
  ['bloquea-prima-sin-componentes', { ...baseValid, premium_rules:{ ...baseValid.premium_rules, required_components:['prima_total'] } }, 1],
  ['bloquea-payload-real', { ...baseValid, rawRows:[{ fila:1, poliza:'NO_USAR_DATOS_REALES' }] }, 1]
];

const results = cases.map(([name, model, expected]) => runCase(name, model, expected));
const failed = results.filter(r => !r.ok);
const report = {
  created_at: new Date().toISOString(),
  tool: 'orbit360-test-validar-modelo-polizas-recibos-cartera-ays',
  total: results.length,
  failed: failed.length,
  results,
  restrictions: ['synthetic-only','no real data','no writes','no Firestore','no policy creation','no portfolio generation']
};
const out = path.join(reportDir, 'TEST-VALIDAR-MODELO-POLIZAS-RECIBOS-CARTERA-AYS.txt');
fs.writeFileSync(out, [
  'ORBIT 360 A&S — TEST VALIDAR MODELO POLIZAS RECIBOS CARTERA',
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
