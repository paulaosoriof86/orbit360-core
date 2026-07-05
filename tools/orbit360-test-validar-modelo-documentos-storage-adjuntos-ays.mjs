#!/usr/bin/env node
/* Orbit 360 A&S — Tests sintéticos validador documentos + Storage futuro + adjuntos.
   No archivos reales, no Storage, no writes. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportDir = path.join(root, '_orbit360_reports');
const tmpDir = path.join(root, '_orbit360_tmp', 'modelo-documentos');
const validator = path.join(root, 'tools', 'orbit360-validar-modelo-documentos-storage-adjuntos-ays.mjs');
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
  return { name, expectedExit, actualExit: res.status, ok: res.status === expectedExit, stdout_tail:(res.stdout||'').slice(-2000), stderr_tail:(res.stderr||'').slice(-1000) };
}

const baseValid = {
  tenantId:'alianzas-soluciones',
  model:'documentos_storage_adjuntos',
  plan_only:true,
  can_write_now:false,
  can_upload_now:false,
  can_store_binary_now:false,
  can_write_storage_now:false,
  storage_future_only:true,
  documents_only_propose:true,
  can_create_clients_from_documents_now:false,
  can_create_policies_from_documents_now:false,
  can_create_collections_from_attachments_now:false,
  allows_direct_entity_write_from_financial_sources:false,
  allowed_source_types:['documentos_soporte','portal_cliente_adjuntos','pagos_reportados_cliente','configuracion_catalogo'],
  country_currency_rules:{ GT:'GTQ', CO:'COP' },
  missing_country_currency_status:'REQUIERE_VALIDACION',
  collections:[
    { name:'documentosSoporte', fields:['tenantId','documento_id','tipo_documento','estado_documento','pais','moneda','periodo','storage_ref','source_ref','original_filename','mime_type','size_bytes','hash_sha256','uploaded_by','created_at','updated_at'] },
    { name:'documentoRelaciones', fields:['tenantId','documento_id','relacion_tipo','entity_type','entity_id','relacion_estado','source_ref','created_at','updated_at'] },
    { name:'documentoPropuestas', fields:['tenantId','propuesta_id','documento_id','propuesta_tipo','target_collection','target_id','campos_propuestos','estado_propuesta','diff_required','confirmation_required','source_ref','created_at','updated_at'] },
    { name:'storagePlan', fields:['tenantId','storage_plan_id','documento_id','bucket_scope','path_template','can_upload_now','can_store_binary_now','retention_policy','access_policy','source_ref','created_at','updated_at'] },
    { name:'auditLog', fields:['tenantId','event_id','entity','entity_id','action','actor_id','source_ref','created_at'] }
  ],
  document_statuses:['RECIBIDO','CLASIFICADO','PROPUESTA','REQUIERE_VALIDACION','VALIDADO_CON_CONFIRMACION','RECHAZADO','ARCHIVADO','BLOQUEADO'],
  proposal_statuses:['PROPUESTA','PENDIENTE_CONFIRMACION','REQUIERE_VALIDACION','APROBADA','RECHAZADA','BLOQUEADA'],
  storage_rules:{ no_binary_payload_in_repo:true, hash_required:true, path_must_include_tenant:true, private_by_default:true },
  document_rules:{
    confirmation_required_for_sensitive_writes:true,
    diff_required_before_any_entity_write:true,
    attachment_reported_payment_is_not_collected:true,
    document_can_apply_payment:false,
    document_can_modify_portfolio:false,
    document_can_update_production:false,
    prohibited_direct_targets_without_confirmation:['clientes','polizas','recibos','cobros','carteraItems','produccion','finmovs']
  },
  traceability:{ required_fields:['source_ref','original_filename','hash_sha256','pais','moneda','periodo','file','sheet','row','block','page'], audit_required:true, source_lineage_required:true },
  academia:{ impact_review_required:true }
};

const cases = [
  ['modelo-valido', baseValid, 0],
  ['bloquea-storage-ahora', { ...baseValid, can_upload_now:true }, 1],
  ['bloquea-base64', { ...baseValid, base64:'JVBERi0xLjQ=' }, 1],
  ['bloquea-documento-crea-cliente', { ...baseValid, can_create_clients_from_documents_now:true }, 1],
  ['bloquea-adjunto-aplica-pago', { ...baseValid, document_rules:{ ...baseValid.document_rules, document_can_apply_payment:true } }, 1],
  ['bloquea-cartera-desde-documento', { ...baseValid, document_rules:{ ...baseValid.document_rules, document_can_modify_portfolio:true } }, 1],
  ['bloquea-produccion-desde-documento', { ...baseValid, document_rules:{ ...baseValid.document_rules, document_can_update_production:true } }, 1],
  ['bloquea-sin-diff', { ...baseValid, document_rules:{ ...baseValid.document_rules, diff_required_before_any_entity_write:false } }, 1],
  ['bloquea-sin-tenant-storage-path', { ...baseValid, storage_rules:{ ...baseValid.storage_rules, path_must_include_tenant:false } }, 1]
];

const results = cases.map(([name, model, expected]) => runCase(name, model, expected));
const failed = results.filter(r => !r.ok);
const report = { created_at:new Date().toISOString(), tool:'orbit360-test-validar-modelo-documentos-storage-adjuntos-ays', total:results.length, failed:failed.length, results, restrictions:['synthetic-only','no real files','no Storage','no writes','no entity creation','no payment application'] };
const out = path.join(reportDir, 'TEST-VALIDAR-MODELO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS.txt');
fs.writeFileSync(out, [
  'ORBIT 360 A&S — TEST VALIDAR MODELO DOCUMENTOS STORAGE ADJUNTOS',
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
