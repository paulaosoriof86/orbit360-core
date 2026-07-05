#!/usr/bin/env node
/* Orbit 360 A&S — Tests sintéticos del validador modelo clientes.
   No datos reales, no writes, no Firestore. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportDir = path.join(root, '_orbit360_reports');
const tmpDir = path.join(root, '_orbit360_tmp', 'modelo-clientes');
const validator = path.join(root, 'tools', 'orbit360-validar-modelo-clientes-ays.mjs');
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
  model: 'clientes_asesor_portal_calidad',
  plan_only: true,
  can_write_now: false,
  can_create_clients_now: false,
  can_update_clients_now: false,
  client_creation_requires_source_validation: true,
  allowed_source_types: ['clientes','documentos_soporte','configuracion_catalogo'],
  documents_only_propose: true,
  documents_can_create_without_confirmation: false,
  country_currency_rules: { GT:'GTQ', CO:'COP' },
  missing_country_currency_status: 'REQUIERE_VALIDACION',
  collections: [
    { name:'clientes', fields:['tenantId','cliente_id','tipo_cliente','display_name','pais','moneda','estado_cliente','fuente_origen','source_ref','calidad_datos','asesor_principal_id','created_at','updated_at'] },
    { name:'clienteAsesorRelaciones', fields:['tenantId','cliente_id','asesor_id','relacion_estado','tipo_relacion','source_ref','created_at','updated_at'] },
    { name:'portalUsuarios', fields:['tenantId','portal_user_id','cliente_id','estado_acceso','canales_autorizados','portal_cliente_sin_opcion_correo','created_at','updated_at'] },
    { name:'calidadDatosSolicitudes', fields:['tenantId','quality_request_id','cliente_id','campos_requeridos','estado_solicitud','bloquea_escritura_operativa','source_ref','created_at','updated_at'] },
    { name:'auditLog', fields:['tenantId','event_id','entity','entity_id','action','actor_id','source_ref','created_at'] }
  ],
  portal: {
    cliente_sin_opcion_correo: true,
    activation: 'invitacion_controlada',
    allows_client_email_option: false,
    allowed_channels: ['portal','whatsapp']
  },
  quality: {
    allowed_statuses: ['COMPLETO','INCOMPLETO','REQUIERE_VALIDACION','SOLICITADO','BLOQUEADO'],
    blocks_operational_write_when_missing_country_currency: true,
    requests_must_be_traceable: true
  },
  adviser_relation: {
    required: true,
    allow_multiple: true,
    primary_required: true,
    source_trace_required: true
  },
  academia: { impact_review_required: true }
};

const cases = [
  ['modelo-valido', baseValid, 0],
  ['bloquea-financiero-como-fuente', { ...baseValid, allowed_source_types:['clientes','documentos_soporte','configuracion_catalogo','financiero_historico'] }, 1],
  ['bloquea-documento-sin-confirmacion', { ...baseValid, documents_can_create_without_confirmation:true }, 1],
  ['bloquea-pais-moneda', { ...baseValid, country_currency_rules:{ GT:'USD', CO:'COP' } }, 1],
  ['bloquea-portal-correo-cliente', { ...baseValid, portal:{ ...baseValid.portal, allows_client_email_option:true } }, 1],
  ['bloquea-payload-real', { ...baseValid, rawRows:[{ fila:1, cliente:'NO_USAR_DATOS_REALES' }] }, 1]
];

const results = cases.map(([name, model, expected]) => runCase(name, model, expected));
const failed = results.filter(r => !r.ok);
const report = {
  created_at: new Date().toISOString(),
  tool: 'orbit360-test-validar-modelo-clientes-ays',
  total: results.length,
  failed: failed.length,
  results,
  restrictions: ['synthetic-only','no real data','no writes','no Firestore','no client creation']
};
const out = path.join(reportDir, 'TEST-VALIDAR-MODELO-CLIENTES-AYS.txt');
fs.writeFileSync(out, [
  'ORBIT 360 A&S — TEST VALIDAR MODELO CLIENTES',
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
