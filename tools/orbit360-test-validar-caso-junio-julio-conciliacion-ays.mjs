#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tmp = path.join(root, '_orbit360_tmp', 'caso-junio-julio');
const outDir = path.join(root, '_orbit360_reports');
const validator = path.join(root, 'tools', 'orbit360-validar-caso-junio-julio-conciliacion-ays.mjs');
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const base = {
  tenantId: 'alianzas-soluciones',
  case_id: 'junio_julio_2026_conciliacion',
  plan_only: true,
  can_write_now: false,
  can_apply_payments: false,
  can_create_collections: false,
  can_update_portfolio: false,
  can_update_production: false,
  sources: ['planilla_comisiones','planilla_aseguradora','estado_cuenta_cliente','estado_cuenta_bancario','cobros_realizados','financiero_historico','polizas','clientes','aseguradoras','configuracion_catalogo'],
  allowed_actions: ['revisar_manualmente','pedir_soporte','validar_con_aseguradora','validar_con_cliente','relacionar_con_pago_reportado','relacionar_con_recibo','marcar_diferencia'],
  allowed_statuses: ['PROPUESTA','EN_REVISION','REQUIERE_VALIDACION','VALIDADA_NO_APLICADA','RECHAZADA','BLOQUEADA'],
  blocked_statuses: ['APLICADA','PAGO_APLICADO','COBRO_APLICADO'],
  currency_rules: { GT: 'GTQ', CO: 'COP' },
  allow_raw_currency_sum: false,
  missing_country_currency_status: 'REQUIERE_VALIDACION',
  traceability_required: ['fuente','archivo','hoja','fila','bloque','periodo','pais','moneda','monto','referencia','source_ref','confidence','bloqueos'],
  source_rules: {
    estado_cuenta_bancario: { can_create_payment: false },
    estado_cuenta_cliente: { treated_as_payment_done: false },
    financiero_historico: { can_create_portfolio: false },
    planilla_comisiones: { can_create_portfolio: false, requires_real_rows: true }
  }
};

const cases = [
  ['valido', base, 0],
  ['bloquea-aplicar-pagos', { ...base, can_apply_payments: true }, 1],
  ['bloquea-crear-cobro', { ...base, allowed_actions: [...base.allowed_actions, 'crear_cobro'] }, 1],
  ['bloquea-aplicada', { ...base, allowed_statuses: [...base.allowed_statuses, 'APLICADA'] }, 1],
  ['bloquea-suma-monedas', { ...base, allow_raw_currency_sum: true }, 1],
  ['bloquea-banco-como-pago', { ...base, source_rules: { ...base.source_rules, estado_cuenta_bancario: { can_create_payment: true } } }, 1],
  ['bloquea-financiero-cartera', { ...base, source_rules: { ...base.source_rules, financiero_historico: { can_create_portfolio: true } } }, 1],
  ['bloquea-planilla-sin-filas-reales', { ...base, source_rules: { ...base.source_rules, planilla_comisiones: { can_create_portfolio: false, requires_real_rows: false } } }, 1]
];

const results = [];
for (const [name, plan, expected] of cases) {
  const file = path.join(tmp, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(plan, null, 2), 'utf8');
  const r = spawnSync(process.execPath, [validator, '--plan', file, '--tenant', 'alianzas-soluciones'], { cwd: root, encoding: 'utf8' });
  results.push({ name, expected, actual: r.status ?? 1, ok: (r.status ?? 1) === expected });
}
const failed = results.filter(r => !r.ok);
const out = path.join(outDir, 'TEST-CASO-JUNIO-JULIO-CONCILIACION-AYS.txt');
fs.writeFileSync(out, [
  'ORBIT 360 A&S - TEST CASO JUNIO/JULIO CONCILIACION',
  `Total: ${results.length}`,
  `Fallidos: ${failed.length}`,
  '',
  ...results.map(r => `${r.ok ? 'OK' : 'FAIL'} ${r.name} expected=${r.expected} actual=${r.actual}`),
  '',
  failed.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n'), 'utf8');
console.log(fs.readFileSync(out, 'utf8'));
process.exit(failed.length ? 1 : 0);
