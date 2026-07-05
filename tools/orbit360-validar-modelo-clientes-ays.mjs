#!/usr/bin/env node
/* Orbit 360 A&S — Validador de contrato/modelo clientes + asesor + portal + calidad.
   Plan-only. No lee datos reales, no escribe Orbit.store/Firestore, no crea clientes. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const VERSION = 'v1.0.0-ays-validar-modelo-clientes';
const reportDir = path.join(root, '_orbit360_reports');
const args = process.argv.slice(2);
const modelArg = args[args.indexOf('--model') + 1];
const expectedTenant = args.includes('--tenant') ? args[args.indexOf('--tenant') + 1] : 'alianzas-soluciones';

const REQUIRED_COLLECTIONS = [
  'clientes',
  'clienteAsesorRelaciones',
  'portalUsuarios',
  'calidadDatosSolicitudes',
  'auditLog'
];

const REQUIRED_CLIENT_FIELDS = [
  'tenantId',
  'cliente_id',
  'tipo_cliente',
  'display_name',
  'pais',
  'moneda',
  'estado_cliente',
  'fuente_origen',
  'source_ref',
  'calidad_datos',
  'asesor_principal_id',
  'created_at',
  'updated_at'
];

const REQUIRED_REL_FIELDS = [
  'tenantId',
  'cliente_id',
  'asesor_id',
  'relacion_estado',
  'tipo_relacion',
  'source_ref',
  'created_at',
  'updated_at'
];

const REQUIRED_PORTAL_FIELDS = [
  'tenantId',
  'portal_user_id',
  'cliente_id',
  'estado_acceso',
  'canales_autorizados',
  'portal_cliente_sin_opcion_correo',
  'created_at',
  'updated_at'
];

const REQUIRED_QUALITY_FIELDS = [
  'tenantId',
  'quality_request_id',
  'cliente_id',
  'campos_requeridos',
  'estado_solicitud',
  'bloquea_escritura_operativa',
  'source_ref',
  'created_at',
  'updated_at'
];

const FORBIDDEN_KEYS = [
  'rows', 'rawRows', 'raw_rows', 'sampleRows', 'payload', 'dataRows', 'records', 'realData',
  'password', 'secret', 'token', 'apiKey', 'privateKey', 'credential', 'firebaseConfig'
];

function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function readJson(file){ return JSON.parse(fs.readFileSync(file, 'utf8')); }
function hasOwn(o,k){ return Object.prototype.hasOwnProperty.call(o || {}, k); }
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
  for(const c of asArray(model.collections)){
    if(c && c.name) out[c.name] = c;
  }
  return out;
}
function validateAllowedSources(model, errors, warnings){
  const allowed = new Set(asArray(model.allowed_source_types));
  const required = ['clientes', 'documentos_soporte', 'configuracion_catalogo'];
  for(const src of required){
    if(!allowed.has(src)) errors.push(`Falta fuente permitida para clientes: ${src}.`);
  }
  if(allowed.has('financiero_historico') || allowed.has('finmovs') || allowed.has('estado_cuenta_bancario')){
    errors.push('Clientes no puede crearse/inferirse desde financiero_historico, finmovs ni estado_cuenta_bancario.');
  }
  if(allowed.has('documentos_soporte') && model.documents_can_create_without_confirmation === true){
    errors.push('Documentos soporte no pueden crear/modificar clientes sin confirmación y diff.');
  }
  if(model.documents_only_propose !== true) errors.push('Debe declarar documents_only_propose=true.');
}
function validateCountryCurrency(model, errors){
  const cc = model.country_currency_rules || {};
  if(cc.GT !== 'GTQ') errors.push('Regla país/moneda GT debe ser GTQ.');
  if(cc.CO !== 'COP') errors.push('Regla país/moneda CO debe ser COP.');
  if(model.missing_country_currency_status !== 'REQUIERE_VALIDACION'){
    errors.push('Falta regla: país/moneda ausente => REQUIERE_VALIDACION.');
  }
}
function validateCollections(model, errors, warnings){
  const map = collectionMap(model);
  for(const name of REQUIRED_COLLECTIONS){
    if(!map[name]) errors.push(`Falta colección requerida: ${name}.`);
  }
  const clientes = fieldNames(map.clientes);
  const rels = fieldNames(map.clienteAsesorRelaciones);
  const portal = fieldNames(map.portalUsuarios);
  const quality = fieldNames(map.calidadDatosSolicitudes);
  for(const f of REQUIRED_CLIENT_FIELDS){ if(!clientes.includes(f)) errors.push(`clientes falta campo ${f}.`); }
  for(const f of REQUIRED_REL_FIELDS){ if(!rels.includes(f)) errors.push(`clienteAsesorRelaciones falta campo ${f}.`); }
  for(const f of REQUIRED_PORTAL_FIELDS){ if(!portal.includes(f)) errors.push(`portalUsuarios falta campo ${f}.`); }
  for(const f of REQUIRED_QUALITY_FIELDS){ if(!quality.includes(f)) errors.push(`calidadDatosSolicitudes falta campo ${f}.`); }
}
function validatePortal(model, errors){
  const portal = model.portal || {};
  if(portal.cliente_sin_opcion_correo !== true) errors.push('Portal debe declarar cliente_sin_opcion_correo=true.');
  if(portal.activation !== 'invitacion_controlada') errors.push('Portal debe activarse por invitacion_controlada.');
  if(portal.allows_client_email_option === true) errors.push('Portal cliente no debe habilitar opción de correo para cliente.');
  if(!asArray(portal.allowed_channels).includes('whatsapp') && !asArray(portal.allowed_channels).includes('portal')){
    errors.push('Portal debe declarar canales permitidos seguros, al menos whatsapp o portal.');
  }
}
function validateQuality(model, errors){
  const quality = model.quality || {};
  const statuses = new Set(asArray(quality.allowed_statuses));
  for(const s of ['COMPLETO','INCOMPLETO','REQUIERE_VALIDACION','SOLICITADO','BLOQUEADO']){
    if(!statuses.has(s)) errors.push(`Calidad de datos falta estado ${s}.`);
  }
  if(quality.blocks_operational_write_when_missing_country_currency !== true){
    errors.push('Calidad debe bloquear escritura operativa cuando falta país/moneda.');
  }
  if(quality.requests_must_be_traceable !== true) errors.push('Solicitudes de calidad deben ser trazables.');
}
function validateAdviser(model, errors){
  const adviser = model.adviser_relation || {};
  if(adviser.required !== true) errors.push('Debe declararse relación asesor/cliente requerida.');
  if(adviser.allow_multiple === undefined) errors.push('Debe declararse si relación asesor permite múltiples asesores.');
  if(adviser.primary_required !== true) errors.push('Debe declararse asesor principal requerido o pendiente de validación.');
  if(adviser.source_trace_required !== true) errors.push('Relación asesor/cliente debe exigir source_ref.');
}
function validateAcademia(model, warnings){
  const academy = model.academia || {};
  if(academy.impact_review_required !== true) warnings.push('Academia/manuales deberían marcar impact_review_required=true.');
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
function validateModel(model){
  const errors = []; const warnings = [];
  if(!model || typeof model !== 'object') errors.push('Modelo inválido o vacío.');
  if(model.tenantId !== expectedTenant) errors.push(`tenantId esperado ${expectedTenant}, recibido ${model.tenantId}.`);
  if(model.model !== 'clientes_asesor_portal_calidad') errors.push('model debe ser clientes_asesor_portal_calidad.');
  if(model.plan_only !== true) errors.push('Debe declarar plan_only=true.');
  if(model.can_write_now !== false) errors.push('Debe declarar can_write_now=false.');
  if(model.can_create_clients_now !== false) errors.push('Debe declarar can_create_clients_now=false.');
  if(model.can_update_clients_now !== false) errors.push('Debe declarar can_update_clients_now=false.');
  if(model.client_creation_requires_source_validation !== true) errors.push('Debe exigir validación de fuente antes de crear cliente.');
  validateNoForbidden(model, errors);
  validateAllowedSources(model, errors, warnings);
  validateCountryCurrency(model, errors);
  validateCollections(model, errors, warnings);
  validatePortal(model, errors);
  validateQuality(model, errors);
  validateAdviser(model, errors);
  validateAcademia(model, warnings);
  const decision = errors.length ? 'MODELO_CLIENTES_BLOQUEADO' : (warnings.length ? 'MODELO_CLIENTES_VALIDO_CON_ADVERTENCIAS' : 'MODELO_CLIENTES_VALIDO');
  return { errors, warnings, decision };
}

if(!modelArg){
  console.error('Uso: node tools/orbit360-validar-modelo-clientes-ays.mjs --model ruta/modelo-clientes.json [--tenant alianzas-soluciones]');
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
  can_create_clients_now: false,
  can_update_clients_now: false,
  restrictions: ['plan-only','synthetic-contract','no real data','no Orbit.store writes','no Firestore writes','no client creation','no client update','no deploy','no merge']
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(reportDir, `VALIDACION-MODELO-CLIENTES-AYS-${stamp}.json`);
const txtPath = jsonPath.replace(/\.json$/, '.txt');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — VALIDACION MODELO CLIENTES',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  'Restricciones: plan-only, sin datos reales, sin writes, sin crear/actualizar clientes.',
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
