#!/usr/bin/env node
/* Orbit 360 A&S — Constructor dryRunReport por fuente
   Construye un sobre de dryRunReport desde manifest + perfil de columnas.
   No lee filas reales, no escribe store/Firestore, no aplica pagos, no hace deploy.

   Uso:
     node tools/orbit360-construir-dryrun-report-fuente-ays.mjs --manifest manifest.local.json --profile perfil.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-constructor-dryrun-sin-filas';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const TENANT = 'alianzas-soluciones';
const COUNTRY_CURRENCY = { GT:'GTQ', CO:'COP' };
const RECONCILIATION_SOURCES = new Set(['planilla_aseguradora','planilla_comisiones','estado_cuenta_bancario','cobros_realizados']);
const SOURCE_TYPES = new Set(['clientes','aseguradoras','polizas','vehiculos','cobros_realizados','planilla_aseguradora','planilla_comisiones','estado_cuenta_bancario','financiero_historico','siniestros','documentos_soporte','configuracion_catalogo']);
const TARGET_BY_SOURCE = {
  clientes:'clientes', aseguradoras:'aseguradoras', polizas:'polizas', vehiculos:'vehiculos',
  cobros_realizados:'conciliaciones', planilla_aseguradora:'conciliaciones', planilla_comisiones:'conciliaciones', estado_cuenta_bancario:'conciliaciones',
  financiero_historico:'finmovs', siniestros:'siniestros', documentos_soporte:'documentos_soporte', configuracion_catalogo:'catalogos'
};
const FORBIDDEN_KEYS = new Set(['rows','rawRows','normalizedRows','previewRows','sampleRows','records','payload','rawPayload','cellValues','dataRows','items']);

function argValue(flag){ const i=args.indexOf(flag); return i>=0 ? args[i+1] : null; }
function readJson(file){ return JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8')); }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function str(v){ return v === undefined || v === null ? '' : String(v).trim(); }
function num(v, fallback=null){ const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function keysDeep(obj, prefix='', out=[]){
  if(!obj || typeof obj !== 'object') return out;
  if(Array.isArray(obj)){ obj.forEach((v,i)=>keysDeep(v, `${prefix}[${i}]`, out)); return out; }
  for(const k of Object.keys(obj)){ const p = prefix ? `${prefix}.${k}` : k; out.push(p); keysDeep(obj[k], p, out); }
  return out;
}
function forbidden(obj){ return keysDeep(obj).filter(p => FORBIDDEN_KEYS.has(p.replace(/\[\d+\]/g,'').split('.').pop())); }
function normalizedManifest(raw){
  const m = raw.manifest || raw;
  return {
    manifest_id: str(m.manifest_id || m.manifestId || m.id || m.file_hash || m.sha256 || 'manifest_sin_id'),
    tenant_id: str(m.tenant_id || m.tenantId),
    source_type: str(m.source_type || m.sourceType || m.tipo_fuente),
    source_name: str(m.source_name || m.sourceName || m.file_name || m.filename || m.file || (Array.isArray(m.files) && m.files[0]?.name) || 'fuente_sin_nombre'),
    file_hash: str(m.file_hash || m.fileHash || m.sha256 || m.hash),
    country: str(m.country || m.pais),
    currency: str(m.currency || m.moneda),
    period: str(m.period || m.periodo || ''),
    declared_total: num(m.declared_total ?? m.estimated_rows ?? m.row_count ?? m.rowCount ?? m.total_rows, 0),
    source_ref: m.source_ref || m.sourceRef || { file: str(m.file || m.source_file || m.source_name || m.file_name || (Array.isArray(m.files) && m.files[0]?.name) || 'fuente_sin_nombre') }
  };
}
function normalizedProfile(raw){
  const p = raw.profile || raw;
  return {
    decision: str(p.decision),
    source_type: str(p.source_type || p.sourceType),
    target: str(p.target || p.destination || ''),
    columns: Array.isArray(p.columns) ? p.columns : [],
    required: p.required || {},
    optional: p.optional || {},
    missing_required: Array.isArray(p.missing_required) ? p.missing_required : [],
    probable_required: Array.isArray(p.probable_required) ? p.probable_required : [],
    unknown_columns: Array.isArray(p.unknown_columns) ? p.unknown_columns : [],
    errors: Array.isArray(p.errors) ? p.errors : [],
    warnings: Array.isArray(p.warnings) ? p.warnings : []
  };
}
function mapSummary(manifest, profile, errors, warnings){
  const total = Math.max(0, manifest.declared_total || 0);
  let ready = 0, validation = 0, blocked = 0, omitted = 0, dup = 0;
  if(errors.length){ blocked = total; }
  else if(warnings.length || profile.probable_required.length || profile.unknown_columns.length){ validation = total; }
  else { ready = total; }
  return { rows_total: total, rows_ready: ready, rows_requires_validation: validation, rows_blocked: blocked, rows_omitted: omitted, rows_probable_duplicate: dup };
}
function build(manifestRaw, profileRaw){
  const errors=[]; const warnings=[];
  const fk = [...forbidden(manifestRaw), ...forbidden(profileRaw)];
  if(fk.length) errors.push(`Entrada contiene datos operativos prohibidos: ${fk.slice(0,12).join(', ')}.`);
  const manifest = normalizedManifest(manifestRaw);
  const profile = normalizedProfile(profileRaw);
  if(manifest.tenant_id !== TENANT) errors.push(`Tenant inválido: ${manifest.tenant_id || 'S/D'}.`);
  if(!SOURCE_TYPES.has(manifest.source_type)) errors.push(`Fuente inválida: ${manifest.source_type || 'S/D'}.`);
  if(profile.source_type && profile.source_type !== manifest.source_type) errors.push(`Fuente inconsistente manifest/perfil: ${manifest.source_type}/${profile.source_type}.`);
  const expectedTarget = TARGET_BY_SOURCE[manifest.source_type];
  if(profile.target && expectedTarget && profile.target !== expectedTarget) errors.push(`Destino inconsistente: ${profile.target}. Esperado: ${expectedTarget}.`);
  if(!manifest.country || !manifest.currency) warnings.push('País/moneda faltante en manifest; dryRun queda en validación.');
  if(manifest.country && manifest.currency && COUNTRY_CURRENCY[manifest.country] && COUNTRY_CURRENCY[manifest.country] !== manifest.currency) errors.push(`País/moneda incoherente: ${manifest.country}/${manifest.currency}.`);
  if(profile.decision === 'PERFIL_BLOQUEADO') errors.push('Perfil de columnas bloqueado; no se puede construir dryRun listo.');
  for(const e of profile.errors || []) errors.push(`Perfil: ${e}`);
  for(const w of profile.warnings || []) warnings.push(`Perfil: ${w}`);
  if(profile.missing_required?.length) errors.push(`Campos obligatorios faltantes: ${profile.missing_required.join(', ')}.`);
  if(profile.probable_required?.length) warnings.push('Campos obligatorios con match probable requieren revisión.');
  if(profile.unknown_columns?.length) warnings.push('Columnas no mapeadas requieren revisión antes de parser real.');
  const summary = mapSummary(manifest, profile, errors, warnings);
  const canBuildFinalCandidates = !errors.length && manifest.declared_total > 0 && !RECONCILIATION_SOURCES.has(manifest.source_type);
  const needsReconciliationRows = RECONCILIATION_SOURCES.has(manifest.source_type);
  if(needsReconciliationRows) warnings.push('Fuente de conciliación requiere candidatos metadata por fila en fase parser; este constructor solo genera readiness sin inventar filas.');
  const decision = errors.length ? 'DRYRUN_BLOQUEADO' : (warnings.length ? 'DRYRUN_READY_CON_ADVERTENCIAS' : 'DRYRUN_READY');
  const dryrun = {
    version: VERSION,
    tenant_id: TENANT,
    created_at: new Date().toISOString(),
    decision,
    source_type: manifest.source_type,
    target_collection: expectedTarget || profile.target || null,
    manifest_id: manifest.manifest_id,
    manifest_ref: { id: manifest.manifest_id, file_hash: manifest.file_hash || null, source_name: manifest.source_name, period: manifest.period || null },
    source_ref: { ...manifest.source_ref, source_type: manifest.source_type, file: manifest.source_ref.file || manifest.source_name },
    country: manifest.country || null,
    currency: manifest.currency || null,
    summary,
    schema_profile: {
      columns_declared: profile.columns || [],
      required: profile.required || {},
      optional: profile.optional || {},
      missing_required: profile.missing_required || [],
      probable_required: profile.probable_required || [],
      unknown_columns: profile.unknown_columns || []
    },
    candidates: [],
    readiness: {
      can_validate_with_dryrun_validator: canBuildFinalCandidates,
      requires_parser_rows_metadata: needsReconciliationRows || manifest.declared_total > 0,
      can_score: false,
      can_generate_conciliaciones: false,
      reason: needsReconciliationRows ? 'Falta metadata por fila de candidatos; no se inventan filas.' : (errors.length ? 'Errores de manifest/perfil.' : 'Sobre dryRun listo para parser.')
    },
    errors,
    warnings,
    restrictions: ['metadata-only','no-row-reading','no-writes','no-Firestore','no-payment-application','no-production','no-deploy','no-merge']
  };
  return dryrun;
}

const manifestArg = argValue('--manifest');
const profileArg = argValue('--profile');
const baseErrors=[];
if(!manifestArg) baseErrors.push('Falta --manifest <archivo>.');
if(!profileArg) baseErrors.push('Falta --profile <archivo>.');
let report;
try {
  if(baseErrors.length) throw new Error(baseErrors.join(' '));
  report = build(readJson(manifestArg), readJson(profileArg));
} catch(e) {
  report = { version: VERSION, created_at: new Date().toISOString(), decision:'DRYRUN_BLOQUEADO', manifest: manifestArg || null, profile: profileArg || null, errors:[e.message], warnings:[], restrictions:['metadata-only','no-row-reading','no-writes'] };
}
fs.mkdirSync(REPORT_DIR, { recursive:true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(REPORT_DIR, `DRYRUN-REPORT-FUENTE-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `DRYRUN-REPORT-FUENTE-AYS-${stamp}.txt`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — CONSTRUIR DRYRUN REPORT SIN FILAS',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  'Restricciones: metadata-only, sin filas, sin writes, sin Firestore, sin pagos, sin deploy.',
  '============================================================',
  '',
  `Fuente: ${report.source_type || 'S/D'}`,
  `Destino: ${report.target_collection || 'S/D'}`,
  `Total declarado: ${report.summary?.rows_total ?? 'S/D'}`,
  '',
  `Errores: ${(report.errors || []).length}`,
  ...(report.errors || []).map(e=>`ERROR: ${e}`),
  '',
  `Advertencias: ${(report.warnings || []).length}`,
  ...(report.warnings || []).map(w=>`WARN: ${w}`),
  '',
  `JSON: ${rel(jsonPath)}`,
  (report.errors || []).length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit((report.errors || []).length ? 1 : 0);
