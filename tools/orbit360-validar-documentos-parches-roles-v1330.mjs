#!/usr/bin/env node
/**
 * Orbit 360 — validador contrato Documentos/Parches/Roles v1330.
 *
 * Uso:
 *   node tools/orbit360-validar-documentos-parches-roles-v1330.mjs
 *   node tools/orbit360-validar-documentos-parches-roles-v1330.mjs --sample ruta/sample.json
 *
 * No escribe datos. No toca backend protegido. No requiere dependencias externas.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(ROOT, 'orbit360-platform/docs/DOCUMENTOS-PARCHES-ROLES-V1330.schema.json');
const EXPECTED_ROLES = ['Direccion','AdminTenant','ITSeguridad','Finanzas','Cobros','Operativo','Asesor','Marketing','AcademiaAdmin','ClientePortal','AuditorSoloLectura'];
const DOC_STATES = ['en_revision','requiere_aclaracion','validado','rechazado','aplicado','bloqueado'];
const PATCH_STATES = ['pendiente_revision','aprobado','rechazado','aplicado','bloqueado'];
const ACTIONS = ['solicitar_aclaracion','aprobar_parche','rechazar_parche','aplicar_parche','cambiar_visibilidad_cliente','anular_documento','bloquear_documento'];
const FORBIDDEN = ['base64','bytes','fileBytes','dataUrl','downloadUrl','publicUrl','token','secret','apiKey','password','credential'];

function loadJson(file) {
  if (!fs.existsSync(file)) throw new Error('No existe ' + file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function hasAll(arr, expected) { return expected.filter(x => !Array.isArray(arr) || !arr.includes(x)); }
function err(errors, code, msg) { errors.push({ code, msg }); }
function scanForbidden(obj, pathName, errors) {
  if (obj == null) return;
  if (typeof obj === 'string') {
    if (/data:[^;]+;base64,|BEGIN PRIVATE KEY|api[_-]?key|token|secret|password/i.test(obj)) err(errors, 'forbidden_value', `Valor prohibido en ${pathName}`);
    return;
  }
  if (Array.isArray(obj)) return obj.forEach((v, i) => scanForbidden(v, `${pathName}[${i}]`, errors));
  if (typeof obj === 'object') {
    Object.entries(obj).forEach(([k, v]) => {
      if (FORBIDDEN.some(f => k.toLowerCase().includes(f.toLowerCase()))) err(errors, 'forbidden_key', `Campo prohibido ${pathName}.${k}`);
      scanForbidden(v, `${pathName}.${k}`, errors);
    });
  }
}
function validateSchemaContract(schema) {
  const errors = [];
  if (schema.version?.const !== 'v1330') err(errors, 'schema_version', 'version.const debe ser v1330');
  const requiredDoc = schema.properties?.documento?.properties?.required?.contains?.const;
  if (requiredDoc !== 'metaOnly') err(errors, 'schema_metaOnly', 'documento.required debe contener metaOnly');
  const docEnums = schema.properties?.documento?.properties?.estados?.items?.enum || [];
  hasAll(docEnums, DOC_STATES).forEach(x => err(errors, 'schema_doc_state', 'Falta estado documento ' + x));
  const patchEnums = schema.properties?.parchePendiente?.properties?.estados?.items?.enum || [];
  hasAll(patchEnums, PATCH_STATES).forEach(x => err(errors, 'schema_patch_state', 'Falta estado parche ' + x));
  const roleEnums = schema.properties?.roles?.items?.enum || [];
  hasAll(roleEnums, EXPECTED_ROLES).forEach(x => err(errors, 'schema_role', 'Falta rol ' + x));
  const actionEnums = schema.properties?.accionesSensibles?.items?.enum || [];
  hasAll(actionEnums, ACTIONS).forEach(x => err(errors, 'schema_action', 'Falta acción sensible ' + x));
  const forbEnums = schema.properties?.forbiddenFields?.items?.enum || [];
  hasAll(forbEnums, FORBIDDEN).forEach(x => err(errors, 'schema_forbidden', 'Falta prohibido ' + x));
  if (schema.properties?.currencyRules?.properties?.GT?.const !== 'GTQ') err(errors, 'schema_gt', 'GT debe exigir GTQ');
  if (schema.properties?.currencyRules?.properties?.CO?.const !== 'COP') err(errors, 'schema_co', 'CO debe exigir COP');
  return errors;
}
function validateSample(sample) {
  const errors = [];
  scanForbidden(sample, '$', errors);
  const docs = sample.documentos || [];
  const patches = sample.parchesPendientes || [];
  docs.forEach((d, i) => {
    const p = `documentos[${i}]`;
    ['id','tenantId','clienteId','tipo','nombre','estado','metaOnly','storageEstado'].forEach(k => { if (d[k] == null || d[k] === '') err(errors, 'doc_required', `${p}.${k} requerido`); });
    if (d.metaOnly !== true) err(errors, 'doc_metaOnly', `${p}.metaOnly debe ser true`);
    if (!DOC_STATES.includes(d.estado)) err(errors, 'doc_estado', `${p}.estado inválido`);
    if (!['pendiente_storage','storage_conectado','no_aplica'].includes(d.storageEstado)) err(errors, 'doc_storage', `${p}.storageEstado inválido`);
  });
  patches.forEach((pa, i) => {
    const p = `parchesPendientes[${i}]`;
    ['id','tenantId','documentoId','entidadTipo','estado','campos'].forEach(k => { if (pa[k] == null || pa[k] === '') err(errors, 'patch_required', `${p}.${k} requerido`); });
    if (!PATCH_STATES.includes(pa.estado)) err(errors, 'patch_estado', `${p}.estado inválido`);
    if (!Array.isArray(pa.campos) || !pa.campos.length) err(errors, 'patch_campos', `${p}.campos debe tener al menos un campo`);
    if ((pa.entidadTipo === 'poliza' || pa.entidadTipo === 'cobro') && (!pa.pais || !pa.moneda)) err(errors, 'patch_pais_moneda', `${p} requiere país/moneda`);
    if (pa.pais === 'GT' && pa.moneda !== 'GTQ') err(errors, 'patch_gt_gtq', `${p} GT exige GTQ`);
    if (pa.pais === 'CO' && pa.moneda !== 'COP') err(errors, 'patch_co_cop', `${p} CO exige COP`);
    if (['aprobado','rechazado','aplicado','bloqueado'].includes(pa.estado) && !pa.motivo) err(errors, 'patch_motivo', `${p} requiere motivo para estado ${pa.estado}`);
  });
  return errors;
}

const args = process.argv.slice(2);
const sampleIdx = args.indexOf('--sample');
const schema = loadJson(SCHEMA_PATH);
const schemaErrors = validateSchemaContract(schema);
let sampleErrors = [];
let samplePath = null;
if (sampleIdx >= 0) {
  samplePath = args[sampleIdx + 1];
  if (!samplePath) throw new Error('Falta ruta después de --sample');
  sampleErrors = validateSample(loadJson(path.resolve(ROOT, samplePath)));
}
const errors = [...schemaErrors, ...sampleErrors];
const result = { ok: errors.length === 0, schema: path.relative(ROOT, SCHEMA_PATH), sample: samplePath, errors };
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
