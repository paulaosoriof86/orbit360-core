#!/usr/bin/env node
/* Orbit 360 · A&S separated source dry-run validator
   Safe mode: no network, no Firebase, no Firestore, no secrets, no real payload output.

   Usage:
     node tools/orbit360-dryrun-fuente-separada-ays.mjs --manifest path/to/manifest.json

   The manifest must describe structure only. Do not place full real rows in the manifest.
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const args = process.argv.slice(2);
const errors = [];
const warnings = [];
const notes = [];

const VERSION = 'v1.0.0-ays-separated-source-dryrun';
const REPORT_DIR = path.join(root, '_orbit360_reports');

const SOURCE_TYPES = {
  clientes: {
    label: 'Clientes actualizados',
    target: ['clientes'],
    requiredAny: [
      ['nombre_cliente', 'cliente', 'nombre', 'razon_social'],
      ['documento_numero', 'nit', 'dpi', 'cedula', 'documento'],
      ['pais', 'country']
    ],
    requiredStrict: [],
    blockedTargets: ['polizas', 'cobros', 'cartera', 'finmovs']
  },
  polizas: {
    label: 'Pólizas actualizadas',
    target: ['polizas'],
    requiredAny: [
      ['numero_poliza', 'poliza', 'no_poliza', 'numero'],
      ['cliente', 'nombre_cliente', 'asegurado'],
      ['aseguradora', 'compania'],
      ['pais', 'country'],
      ['moneda', 'currency'],
      ['vigencia_inicio', 'inicio_vigencia', 'fecha_inicio'],
      ['vigencia_fin', 'fin_vigencia', 'fecha_fin']
    ],
    requiredStrict: [],
    blockedTargets: ['finmovs']
  },
  cobros_realizados: {
    label: 'Cobros realizados',
    target: ['cobros'],
    requiredAny: [
      ['fecha_pago', 'fecha', 'fecha_cobro'],
      ['monto_pagado', 'monto', 'valor', 'importe'],
      ['moneda', 'currency'],
      ['pais', 'country'],
      ['numero_poliza', 'poliza', 'cliente', 'nombre_cliente']
    ],
    requiredStrict: [],
    blockedTargets: ['cartera']
  },
  planilla_aseguradora: {
    label: 'Planilla de aseguradora',
    target: ['comisiones', 'conciliacion'],
    requiredAny: [
      ['aseguradora', 'compania'],
      ['periodo', 'mes'],
      ['pais', 'country'],
      ['moneda', 'currency'],
      ['numero_poliza', 'poliza'],
      ['prima_neta', 'prima', 'prima_total'],
      ['comision', 'comision_calculada', 'porcentaje_comision']
    ],
    requiredStrict: [],
    blockedTargets: ['clientes_auto', 'polizas_auto']
  },
  estado_cuenta: {
    label: 'Estado de cuenta bancario',
    target: ['finmovs', 'conciliacion'],
    requiredAny: [
      ['banco', 'bank'],
      ['cuenta', 'account'],
      ['pais', 'country'],
      ['moneda', 'currency'],
      ['fecha', 'date'],
      ['descripcion', 'concepto', 'detalle'],
      ['debito', 'credito', 'monto', 'importe', 'saldo']
    ],
    requiredStrict: [],
    blockedTargets: ['clientes', 'polizas', 'cobros_auto', 'cartera']
  },
  financiero_historico: {
    label: 'Financiero histórico',
    target: ['finmovs'],
    requiredAny: [
      ['periodo', 'mes'],
      ['pais', 'country'],
      ['moneda', 'currency'],
      ['concepto', 'descripcion', 'detalle'],
      ['monto', 'ingreso', 'egreso', 'debito', 'credito']
    ],
    requiredStrict: [],
    blockedTargets: ['clientes', 'polizas', 'cobros', 'cartera']
  },
  siniestros: {
    label: 'Siniestros / reclamos',
    target: ['reclamos', 'gestiones'],
    requiredAny: [
      ['fecha_reclamo', 'fecha', 'fecha_siniestro'],
      ['cliente', 'nombre_cliente', 'asegurado'],
      ['aseguradora', 'compania'],
      ['estado_reclamo', 'estado'],
      ['responsable', 'asesor']
    ],
    requiredStrict: [],
    blockedTargets: ['cobros', 'cartera']
  },
  documentos_soporte: {
    label: 'Documentos soporte',
    target: ['documentos'],
    requiredAny: [
      ['tipo_documento', 'documento_tipo', 'tipo'],
      ['cliente', 'nombre_cliente', 'numero_poliza', 'poliza'],
      ['url', 'archivo', 'ruta', 'file']
    ],
    requiredStrict: [],
    blockedTargets: ['clientes_auto', 'polizas_auto', 'cobros_auto']
  },
  configuracion_catalogo: {
    label: 'Configuración / catálogo',
    target: ['aseguradoras', 'asesores', 'catalogos'],
    requiredAny: [
      ['nombre', 'aseguradora', 'asesor', 'catalogo'],
      ['pais', 'country']
    ],
    requiredStrict: [],
    blockedTargets: ['polizas', 'cobros', 'cartera']
  }
};

function argValue(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  return args[i + 1] || null;
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function safeName(value) {
  const raw = String(value || 'SIN_ARCHIVO');
  const base = path.basename(raw).replace(/[^a-zA-Z0-9._-]+/g, '_');
  return base.slice(0, 96) || 'SIN_ARCHIVO';
}

function readJson(filePath) {
  if (!filePath) {
    errors.push('Falta argumento obligatorio: --manifest path/to/manifest.json');
    return null;
  }
  const abs = path.resolve(root, filePath);
  if (!fs.existsSync(abs)) {
    errors.push(`No existe manifest: ${path.relative(root, abs)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    errors.push(`Manifest JSON inválido: ${err.message}`);
    return null;
  }
}

function allColumns(manifest) {
  const cols = new Set();
  for (const sheet of Array.isArray(manifest?.sheets) ? manifest.sheets : []) {
    for (const col of Array.isArray(sheet.columns) ? sheet.columns : []) cols.add(normalizeKey(col));
  }
  for (const col of Array.isArray(manifest?.columns) ? manifest.columns : []) cols.add(normalizeKey(col));
  return cols;
}

function hasAny(columns, names) {
  return names.some((name) => columns.has(normalizeKey(name)));
}

function countryCurrencyCheck(manifest) {
  const country = normalizeKey(manifest.declared_country || manifest.pais || manifest.country || '');
  const currency = normalizeKey(manifest.declared_currency || manifest.moneda || manifest.currency || '');
  const sourceType = normalizeKey(manifest.source_type || manifest.tipo_fuente || '');

  if (!country) errors.push('Falta declared_country/pais en manifest.');
  if (!currency && sourceType !== 'clientes' && sourceType !== 'documentos_soporte') warnings.push('Falta declared_currency/moneda en manifest.');

  if (country === 'gt' && currency && !['gtq', 'no_aplica'].includes(currency)) {
    errors.push(`Moneda incoherente para GT: ${manifest.declared_currency || manifest.moneda}`);
  }
  if (country === 'co' && currency && !['cop', 'no_aplica'].includes(currency)) {
    errors.push(`Moneda incoherente para CO: ${manifest.declared_currency || manifest.moneda}`);
  }
  if (['mixto', 'mixta', 'sd', 's_d'].includes(country)) {
    warnings.push('País mixto o S/D: requiere separación por hoja o validación manual antes de LAB.');
  }
  if (['mixta', 'mixto', 'sd', 's_d'].includes(currency)) {
    warnings.push('Moneda mixta o S/D: requiere separación por hoja o validación manual antes de LAB.');
  }
}

function validateSheets(manifest, sourceType) {
  if (!Array.isArray(manifest.sheets) || manifest.sheets.length === 0) {
    warnings.push('Manifest sin sheets[]. Se validarán únicamente columns[] globales si existen.');
    return;
  }

  for (const [idx, sheet] of manifest.sheets.entries()) {
    const name = String(sheet.name || `sheet_${idx + 1}`);
    const normalizedName = normalizeKey(name);
    const columns = Array.isArray(sheet.columns) ? sheet.columns.map(normalizeKey).filter(Boolean) : [];

    if (!columns.length) warnings.push(`Hoja ${name}: no declara columns[].`);
    if (sourceType !== 'clientes' && sourceType !== 'documentos_soporte') {
      const country = normalizeKey(sheet.country || sheet.pais || manifest.declared_country || '');
      const currency = normalizeKey(sheet.currency || sheet.moneda || manifest.declared_currency || '');
      if (country === 'gt' && currency && currency !== 'gtq') errors.push(`Hoja ${name}: moneda ${currency} incoherente para GT.`);
      if (country === 'co' && currency && currency !== 'cop') errors.push(`Hoja ${name}: moneda ${currency} incoherente para CO.`);
    }

    if (['listado_produccion_2025_2026', 'produccion', 'dashboard', 'analisis', 'presupuesto'].some((x) => normalizedName.includes(x))) {
      if (sourceType === 'financiero_historico') warnings.push(`Hoja ${name}: parece soporte/producción/presupuesto; debe excluirse salvo validación explícita.`);
      if (sourceType !== 'polizas' && normalizedName.includes('produccion')) errors.push(`Hoja ${name}: producción no puede procesarse como ${sourceType}.`);
    }
  }
}

function validateNoPayload(manifest) {
  if (Array.isArray(manifest.rows) && manifest.rows.length > 0) {
    errors.push('El manifest contiene rows[]. No incluir payload real en el manifest; usar solo estructura/columnas/conteos.');
  }
  for (const sheet of Array.isArray(manifest.sheets) ? manifest.sheets : []) {
    if (Array.isArray(sheet.rows) && sheet.rows.length > 0) {
      errors.push(`La hoja ${sheet.name || 'sin_nombre'} contiene rows[]. No incluir payload real.`);
    }
  }
  if (manifest.contains_real_payload === true) errors.push('contains_real_payload=true: manifest bloqueado para repo/dry-run estructural.');
  if (manifest.contains_real_data === true) warnings.push('contains_real_data=true: el reporte no debe exponer filas, nombres, importes ni terceros.');
}

function validateTargetIntent(manifest, contract) {
  const requestedTargets = Array.isArray(manifest.requested_targets) ? manifest.requested_targets.map(normalizeKey) : [];
  for (const blocked of contract.blockedTargets || []) {
    const b = normalizeKey(blocked);
    if (requestedTargets.includes(b)) errors.push(`Destino bloqueado para esta fuente: ${blocked}`);
  }
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') return null;
  validateNoPayload(manifest);

  const sourceType = normalizeKey(manifest.source_type || manifest.tipo_fuente || '');
  if (!sourceType) {
    errors.push('Falta source_type/tipo_fuente en manifest.');
    return null;
  }
  const contract = SOURCE_TYPES[sourceType];
  if (!contract) {
    errors.push(`source_type no soportado: ${sourceType}. Permitidos: ${Object.keys(SOURCE_TYPES).join(', ')}`);
    return null;
  }

  countryCurrencyCheck(manifest);
  validateSheets(manifest, sourceType);
  validateTargetIntent(manifest, contract);

  const columns = allColumns(manifest);
  if (!columns.size) errors.push('No se declararon columnas en manifest.columns ni sheets[].columns.');

  for (const group of contract.requiredAny) {
    if (!hasAny(columns, group)) warnings.push(`Campo requerido no detectado. Aceptados: ${group.join(' | ')}`);
  }

  if (sourceType === 'financiero_historico') {
    const rawPeriod = String(manifest.period || manifest.periodo || '').trim();
    if (/2026-0[5-7]/.test(rawPeriod)) warnings.push(`${rawPeriod}: periodo no cerrado; debe quedar referencia/requiere_validacion.`);
    if (manifest.allow_crm_inference === true) errors.push('allow_crm_inference=true bloqueado para financiero_historico.');
  }

  return { sourceType, contract, columns };
}

function decision() {
  if (errors.length) return 'bloqueado';
  if (warnings.length) return 'requiere_validacion';
  return 'listo_dryrun';
}

function writeReport(manifest, validation) {
  const fileName = safeName(manifest?.file_name || manifest?.archivo || 'manifest.json');
  const sourceType = validation?.sourceType || normalizeKey(manifest?.source_type || 'sin_tipo');
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify({ sourceType, fileName, sheets: manifest?.sheets?.map?.(s => ({ name: s.name, columns: s.columns?.length || 0 })) || [] }))
    .digest('hex')
    .slice(0, 12);

  const lines = [
    '============================================================',
    'ORBIT 360 - DRY-RUN FUENTE SEPARADA A&S',
    `Version: ${VERSION}`,
    `Fecha: ${new Date().toISOString()}`,
    `Root: ${root}`,
    'Restricciones: sin red, sin Firebase, sin Firestore, sin secretos, sin payload real.',
    '============================================================',
    '',
    `Archivo declarado: ${fileName}`,
    `Tipo fuente: ${sourceType || 'S/D'}`,
    `Destino permitido: ${(validation?.contract?.target || []).join(', ') || 'S/D'}`,
    `Decision: ${decision()}`,
    `Manifest hash estructural: ${hash}`,
    '',
    `Errores bloqueantes: ${errors.length}`,
    ...errors.map((e) => `ERROR: ${e}`),
    '',
    `Advertencias: ${warnings.length}`,
    ...warnings.map((w) => `WARN: ${w}`),
    '',
    `Notas: ${notes.length}`,
    ...notes.map((n) => `NOTE: ${n}`),
    '',
    'Salida permitida: solo estructura, conteos y validaciones. No contiene filas reales.',
    errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
  ];

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportName = `DRYRUN-FUENTE-SEPARADA-AYS-${sourceType || 'sin_tipo'}-${hash}.txt`;
  const reportPath = path.join(REPORT_DIR, reportName);
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  console.log(`\nReporte: ${path.relative(root, reportPath)}`);
}

const manifest = readJson(argValue('--manifest'));
const validation = validateManifest(manifest);
writeReport(manifest || {}, validation);
process.exit(errors.length ? 1 : 0);
