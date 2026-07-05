#!/usr/bin/env node
/* Orbit 360 A&S — Validador contrato/modelo documentos + Storage futuro + adjuntos.
   Plan-only. No lee archivos reales, no sube a Storage, no crea clientes/pólizas/cobros. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const VERSION = 'v1.0.0-ays-validar-modelo-documentos-storage-adjuntos';
const reportDir = path.join(root, '_orbit360_reports');
const args = process.argv.slice(2);
const modelArg = args[args.indexOf('--model') + 1];
const expectedTenant = args.includes('--tenant') ? args[args.indexOf('--tenant') + 1] : 'alianzas-soluciones';

const REQUIRED_COLLECTIONS = ['documentosSoporte','documentoRelaciones','documentoPropuestas','storagePlan','auditLog'];
const REQUIRED_DOC_FIELDS = [
  'tenantId','documento_id','tipo_documento','estado_documento','pais','moneda','periodo','storage_ref','source_ref','original_filename',
  'mime_type','size_bytes','hash_sha256','uploaded_by','created_at','updated_at'
];
const REQUIRED_REL_FIELDS = [
  'tenantId','documento_id','relacion_tipo','entity_type','entity_id','relacion_estado','source_ref','created_at','updated_at'
];
const REQUIRED_PROP_FIELDS = [
  'tenantId','propuesta_id','documento_id','propuesta_tipo','target_collection','target_id','campos_propuestos','estado_propuesta','diff_required','confirmation_required','source_ref','created_at','updated_at'
];
const REQUIRED_STORAGE_FIELDS = [
  'tenantId','storage_plan_id','documento_id','bucket_scope','path_template','can_upload_now','can_store_binary_now','retention_policy','access_policy','source_ref','created_at','updated_at'
];
const FORBIDDEN_KEYS = ['fileBytes','bytes','base64','rawFile','rawPdf','binary','payload','documentPayload','ocrText','fullText','realData','rows','rawRows','password','secret','token','apiKey','privateKey','credential','firebaseConfig'];

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
function fields(collection){
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
    if(typeof v === 'string' && /AIza|-----BEGIN|password\s*=|token\s*=|secret\s*=|data:application|base64/i.test(v)){
      errors.push(`Posible secreto, credencial o payload binario en ${keyPath}.`);
    }
  });
}
function validateCollections(model, errors){
  const map = collectionMap(model);
  for(const c of REQUIRED_COLLECTIONS) if(!map[c]) errors.push(`Falta colección requerida: ${c}.`);
  for(const f of REQUIRED_DOC_FIELDS) if(!fields(map.documentosSoporte).includes(f)) errors.push(`documentosSoporte falta campo ${f}.`);
  for(const f of REQUIRED_REL_FIELDS) if(!fields(map.documentoRelaciones).includes(f)) errors.push(`documentoRelaciones falta campo ${f}.`);
  for(const f of REQUIRED_PROP_FIELDS) if(!fields(map.documentoPropuestas).includes(f)) errors.push(`documentoPropuestas falta campo ${f}.`);
  for(const f of REQUIRED_STORAGE_FIELDS) if(!fields(map.storagePlan).includes(f)) errors.push(`storagePlan falta campo ${f}.`);
}
function validateSources(model, errors){
  const allowed = new Set(asArray(model.allowed_source_types));
  for(const src of ['documentos_soporte','portal_cliente_adjuntos','pagos_reportados_cliente','configuracion_catalogo']){
    if(!allowed.has(src)) errors.push(`Falta fuente permitida: ${src}.`);
  }
  for(const bad of ['finmovs','financiero_historico','estado_cuenta_bancario']){
    if(allowed.has(bad) && model.allows_direct_entity_write_from_financial_sources !== false){
      errors.push(`${bad} no puede escribir entidades desde documentos/adjuntos.`);
    }
  }
  if(model.documents_only_propose !== true) errors.push('Debe declarar documents_only_propose=true.');
  if(model.can_create_clients_from_documents_now !== false) errors.push('Debe declarar can_create_clients_from_documents_now=false.');
  if(model.can_create_policies_from_documents_now !== false) errors.push('Debe declarar can_create_policies_from_documents_now=false.');
  if(model.can_create_collections_from_attachments_now !== false) errors.push('Debe declarar can_create_collections_from_attachments_now=false.');
}
function validateStorage(model, errors){
  if(model.storage_future_only !== true) errors.push('Debe declarar storage_future_only=true.');
  if(model.can_upload_now !== false) errors.push('Debe declarar can_upload_now=false.');
  if(model.can_store_binary_now !== false) errors.push('Debe declarar can_store_binary_now=false.');
  if(model.can_write_storage_now !== false) errors.push('Debe declarar can_write_storage_now=false.');
  const st = model.storage_rules || {};
  if(st.no_binary_payload_in_repo !== true) errors.push('Storage rules debe exigir no_binary_payload_in_repo=true.');
  if(st.hash_required !== true) errors.push('Storage rules debe exigir hash_required=true.');
  if(st.path_must_include_tenant !== true) errors.push('Storage path debe incluir tenant.');
  if(st.private_by_default !== true) errors.push('Storage debe ser privado por defecto.');
}
function validateStates(model, errors){
  const docStates = new Set(asArray(model.document_statuses));
  for(const s of ['RECIBIDO','CLASIFICADO','PROPUESTA','REQUIERE_VALIDACION','VALIDADO_CON_CONFIRMACION','RECHAZADO','ARCHIVADO','BLOQUEADO']){
    if(!docStates.has(s)) errors.push(`document_statuses falta ${s}.`);
  }
  const propStates = new Set(asArray(model.proposal_statuses));
  for(const s of ['PROPUESTA','PENDIENTE_CONFIRMACION','REQUIERE_VALIDACION','APROBADA','RECHAZADA','BLOQUEADA']){
    if(!propStates.has(s)) errors.push(`proposal_statuses falta ${s}.`);
  }
}
function validateRules(model, errors, warnings){
  const rules = model.document_rules || {};
  if(rules.confirmation_required_for_sensitive_writes !== true) errors.push('Escrituras sensibles requieren confirmación.');
  if(rules.diff_required_before_any_entity_write !== true) errors.push('Debe requerir diff antes de escritura futura.');
  if(rules.attachment_reported_payment_is_not_collected !== true) errors.push('Adjunto de pago reportado no equivale a cobro aplicado.');
  if(rules.document_can_apply_payment === true) errors.push('Documento/adjunto no puede aplicar pago.');
  if(rules.document_can_modify_portfolio === true) errors.push('Documento/adjunto no puede modificar cartera.');
  if(rules.document_can_update_production === true) errors.push('Documento/adjunto no puede actualizar producción.');
  const targets = new Set(asArray(rules.prohibited_direct_targets_without_confirmation));
  for(const t of ['clientes','polizas','recibos','cobros','carteraItems','produccion','finmovs']){
    if(!targets.has(t)) errors.push(`prohibited_direct_targets_without_confirmation falta ${t}.`);
  }
  if(model.country_currency_rules?.GT !== 'GTQ') errors.push('GT debe mapear a GTQ.');
  if(model.country_currency_rules?.CO !== 'COP') errors.push('CO debe mapear a COP.');
  if(model.missing_country_currency_status !== 'REQUIERE_VALIDACION') errors.push('País/moneda ausente debe quedar REQUIERE_VALIDACION.');
  if(model.academia?.impact_review_required !== true) warnings.push('Academia/manuales deberían marcar impact_review_required=true.');
}
function validateTraceability(model, errors){
  const tr = model.traceability || {};
  requireSet(tr.required_fields, ['source_ref','original_filename','hash_sha256','pais','moneda','periodo','file','sheet','row','block','page'], 'traceability.required_fields', errors);
  if(tr.audit_required !== true) errors.push('Debe requerir auditLog.');
  if(tr.source_lineage_required !== true) errors.push('Debe requerir lineage de fuente.');
}
function validateModel(model){
  const errors=[]; const warnings=[];
  if(!model || typeof model !== 'object') errors.push('Modelo inválido o vacío.');
  if(model.tenantId !== expectedTenant) errors.push(`tenantId esperado ${expectedTenant}, recibido ${model.tenantId}.`);
  if(model.model !== 'documentos_storage_adjuntos') errors.push('model debe ser documentos_storage_adjuntos.');
  if(model.plan_only !== true) errors.push('Debe declarar plan_only=true.');
  if(model.can_write_now !== false) errors.push('Debe declarar can_write_now=false.');
  validateNoForbidden(model, errors);
  validateCollections(model, errors);
  validateSources(model, errors);
  validateStorage(model, errors);
  validateStates(model, errors);
  validateRules(model, errors, warnings);
  validateTraceability(model, errors);
  const decision = errors.length ? 'MODELO_DOCUMENTOS_BLOQUEADO' : (warnings.length ? 'MODELO_DOCUMENTOS_VALIDO_CON_ADVERTENCIAS' : 'MODELO_DOCUMENTOS_VALIDO');
  return { errors, warnings, decision };
}

if(!modelArg){
  console.error('Uso: node tools/orbit360-validar-modelo-documentos-storage-adjuntos-ays.mjs --model ruta/modelo-documentos.json [--tenant alianzas-soluciones]');
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
  can_upload_now: false,
  can_write_storage_now: false,
  restrictions: ['plan-only','synthetic-contract','no real files','no binary payload','no Storage upload','no Firestore writes','no entity creation','no payment application','no portfolio mutation','no production update','no deploy','no merge']
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportDir, `VALIDACION-MODELO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-${stamp}.json`);
const txtPath = jsonPath.replace(/\.json$/, '.txt');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — VALIDACION MODELO DOCUMENTOS STORAGE ADJUNTOS',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  'Restricciones: plan-only, sin archivos reales, sin Storage, sin writes.',
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
