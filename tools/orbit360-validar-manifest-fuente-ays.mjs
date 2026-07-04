#!/usr/bin/env node
/* Orbit 360 · A&S manifest validator by separated source
   Safe mode: reads manifest metadata only.
   It rejects embedded row payloads and never writes Firestore/store.

   Usage:
     node tools/orbit360-validar-manifest-fuente-ays.mjs --manifest path/to/manifest.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-manifest-validator';

const SOURCE_TYPES = new Set([
  'clientes',
  'aseguradoras',
  'polizas',
  'vehiculos',
  'cobros_realizados',
  'planilla_aseguradora',
  'planilla_comisiones',
  'estado_cuenta_bancario',
  'financiero_historico',
  'siniestros',
  'documentos_soporte',
  'configuracion_catalogo'
]);

const COUNTRY_CURRENCY = {
  GT: 'GTQ',
  CO: 'COP'
};

const REQUIRED_BY_SOURCE = {
  clientes: ['nombre'],
  aseguradoras: ['nombre'],
  polizas: ['numero_poliza', 'cliente', 'aseguradora', 'estado', 'pais', 'moneda'],
  vehiculos: ['placa', 'cliente'],
  cobros_realizados: ['fecha', 'monto', 'moneda', 'pais'],
  planilla_aseguradora: ['aseguradora', 'periodo', 'prima_neta', 'comision', 'moneda', 'pais'],
  planilla_comisiones: ['aseguradora', 'periodo', 'comision_esperada', 'comision_pagada', 'moneda', 'pais'],
  estado_cuenta_bancario: ['fecha', 'descripcion', 'monto', 'moneda', 'pais'],
  financiero_historico: ['fecha', 'concepto', 'monto', 'tipo_movimiento', 'moneda', 'pais'],
  siniestros: ['cliente', 'poliza', 'fecha', 'estado'],
  documentos_soporte: ['tipo_documento', 'archivo', 'cliente_o_poliza_referencia'],
  configuracion_catalogo: ['catalogo', 'clave', 'valor']
};

const ALLOWED_DESTINATIONS = {
  clientes: ['clientes'],
  aseguradoras: ['aseguradoras'],
  polizas: ['polizas', 'cobros'],
  vehiculos: ['vehiculos'],
  cobros_realizados: ['cobros'],
  planilla_aseguradora: ['comisiones', 'cobros'],
  planilla_comisiones: ['comisiones'],
  estado_cuenta_bancario: ['finmovs'],
  financiero_historico: ['finmovs'],
  siniestros: ['reclamos'],
  documentos_soporte: ['documentos'],
  configuracion_catalogo: ['aseguradoras', 'contenidos', 'cursos']
};

const FORBIDDEN_PAYLOAD_KEYS = new Set([
  'rows', 'row', 'records', 'items', 'data', 'payload', 'sampleRows', 'previewRows', 'normalizedRows', 'rawRows'
]);

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listKeysDeep(obj, prefix = '', out = []) {
  if (!obj || typeof obj !== 'object') return out;
  for (const key of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    out.push(p);
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) listKeysDeep(obj[key], p, out);
  }
  return out;
}

function hasForbiddenPayload(manifest) {
  return listKeysDeep(manifest).filter((keyPath) => {
    const last = keyPath.split('.').pop();
    return FORBIDDEN_PAYLOAD_KEYS.has(last);
  });
}

function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function schemaFields(manifest) {
  const raw = manifest.schema?.fields || manifest.fields || manifest.columns || [];
  if (Array.isArray(raw)) return raw.map((f) => typeof f === 'string' ? f : f?.field || f?.name || f?.target).filter(Boolean);
  if (raw && typeof raw === 'object') return Object.keys(raw);
  return [];
}

const errors = [];
const warnings = [];
const manifestArg = argValue('--manifest');
if (!manifestArg) errors.push('Falta --manifest <archivo>.');
const manifestPath = manifestArg ? path.resolve(root, manifestArg) : null;
if (manifestPath && !fs.existsSync(manifestPath)) errors.push(`No existe manifest: ${manifestArg}`);

let manifest = null;
if (!errors.length) {
  try { manifest = readJson(manifestPath); }
  catch (err) { errors.push(`JSON inválido: ${err.message}`); }
}

let sourceType = null;
let fields = [];
let destinations = [];
let missingFields = [];
let forbiddenDestinations = [];
let forbiddenKeys = [];

if (manifest) {
  sourceType = manifest.source_type || manifest.sourceType || manifest.tipo_fuente || manifest.type;
  if (!SOURCE_TYPES.has(sourceType)) errors.push(`Tipo de fuente inválido o faltante: ${sourceType || 'S/D'}`);

  forbiddenKeys = hasForbiddenPayload(manifest);
  if (forbiddenKeys.length) errors.push(`El manifest contiene payload de filas prohibido: ${forbiddenKeys.join(', ')}`);

  if (!manifest.tenant_id && !manifest.tenantId) errors.push('Falta tenant_id/tenantId.');
  if (!manifest.file && !manifest.files && !manifest.source_file && !manifest.source_files) errors.push('Falta referencia estructural de archivo fuente.');

  const country = manifest.country || manifest.pais;
  const currency = manifest.currency || manifest.moneda;
  const requiresValidation = Boolean(manifest.requires_validation || manifest.requiere_validacion);
  if (!country || !currency) {
    if (!requiresValidation) errors.push('País/moneda faltante requiere requires_validation=true.');
  } else if (COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) {
    errors.push(`Moneda incoherente para país ${country}: ${currency}. Esperado: ${COUNTRY_CURRENCY[country]}.`);
  } else if (!COUNTRY_CURRENCY[country]) {
    if (!requiresValidation) errors.push(`País no reconocido requiere validación: ${country}.`);
  }

  fields = schemaFields(manifest);
  const required = REQUIRED_BY_SOURCE[sourceType] || [];
  missingFields = required.filter((f) => !fields.includes(f));
  if (missingFields.length) errors.push(`Campos mínimos faltantes para ${sourceType}: ${missingFields.join(', ')}`);

  destinations = asArray(manifest.destinations || manifest.destination_collections || manifest.collections || manifest.target_collections);
  if (!destinations.length) errors.push('Faltan colecciones destino explícitas.');
  const allowed = new Set(ALLOWED_DESTINATIONS[sourceType] || []);
  forbiddenDestinations = destinations.filter((d) => !allowed.has(d));
  if (forbiddenDestinations.length) errors.push(`Colecciones destino no permitidas para ${sourceType}: ${forbiddenDestinations.join(', ')}`);

  if (sourceType === 'financiero_historico') {
    for (const forbidden of ['clientes', 'polizas', 'cobros', 'aseguradoras']) {
      if (destinations.includes(forbidden)) errors.push(`financiero_historico no puede escribir en ${forbidden}.`);
    }
  }
  if (sourceType === 'estado_cuenta_bancario' && destinations.some((d) => ['clientes', 'polizas', 'cobros'].includes(d))) {
    errors.push('estado_cuenta_bancario no puede crear clientes, pólizas ni cobros directamente.');
  }
  if (sourceType === 'documentos_soporte' && destinations.some((d) => ['clientes', 'polizas'].includes(d))) {
    errors.push('documentos_soporte no puede escribir directamente clientes/pólizas sin confirmación posterior.');
  }

  if (manifest.write_enabled === true || manifest.writeEnabled === true) {
    errors.push('write_enabled=true no permitido en esta etapa. Solo dry-run/preview.');
  }

  if (manifest.confidence !== undefined && Number(manifest.confidence) < 0.85 && !requiresValidation) {
    warnings.push('Confianza menor a 0.85 debería requerir validación.');
  }
}

const decision = errors.length ? 'BLOQUEADO' : (warnings.length ? 'REQUIERE_REVISION' : 'LISTO_DRYRUN');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const reportJson = path.join(REPORT_DIR, `VALIDACION-MANIFEST-FUENTE-AYS-${stamp}.json`);
const reportTxt = path.join(REPORT_DIR, `VALIDACION-MANIFEST-FUENTE-AYS-${stamp}.txt`);

const result = {
  version: VERSION,
  created_at: new Date().toISOString(),
  manifest: manifestArg,
  decision,
  source_type: sourceType,
  fields_count: fields.length,
  destinations,
  missing_fields: missingFields,
  forbidden_destinations: forbiddenDestinations,
  forbidden_payload_keys: forbiddenKeys,
  errors,
  warnings
};

const txt = [
  '============================================================',
  'ORBIT 360 - VALIDACION MANIFEST FUENTE A&S',
  `Version: ${VERSION}`,
  `Fecha: ${result.created_at}`,
  `Manifest: ${manifestArg || 'S/D'}`,
  `Decision: ${decision}`,
  'Restricciones: no lee filas, no escribe store/Firestore, no deploy.',
  '============================================================',
  '',
  `Tipo fuente: ${sourceType || 'S/D'}`,
  `Campos declarados: ${fields.length}`,
  `Destinos: ${destinations.join(', ') || 'S/D'}`,
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w) => `WARN: ${w}`),
  '',
  `JSON: ${rel(reportJson)}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');

fs.writeFileSync(reportJson, JSON.stringify(result, null, 2), 'utf8');
fs.writeFileSync(reportTxt, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
