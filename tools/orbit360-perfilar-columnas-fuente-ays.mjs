#!/usr/bin/env node
/* Orbit 360 A&S — Perfilador de columnas por fuente
   Lee únicamente metadata declarada en manifest. No lee filas, no escribe store/Firestore, no hace deploy.

   Uso:
     node tools/orbit360-perfilar-columnas-fuente-ays.mjs --manifest ruta/manifest.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-perfil-columnas-fuente';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const TENANT = 'alianzas-soluciones';

const SOURCE_PROFILES = {
  clientes: {
    target: 'clientes',
    required: {
      nombre: ['nombre', 'cliente', 'asegurado', 'nombre_cliente', 'razon_social'],
      identificacion: ['identificacion', 'nit', 'dpi', 'cedula', 'documento', 'id_cliente'],
      contacto: ['correo', 'email', 'telefono', 'celular', 'whatsapp']
    },
    optional: {
      pais: ['pais', 'country'], moneda: ['moneda', 'currency'], asesor: ['asesor', 'vendedor', 'ejecutivo']
    }
  },
  aseguradoras: {
    target: 'aseguradoras',
    required: { nombre: ['aseguradora', 'compania', 'compañia', 'nombre'], pais: ['pais', 'country'], moneda: ['moneda', 'currency'] },
    optional: { contacto: ['contacto', 'correo', 'telefono'], codigo: ['codigo', 'cod'] }
  },
  polizas: {
    target: 'polizas',
    required: {
      numero_poliza: ['numero_poliza', 'poliza', 'no_poliza', 'nro_poliza', 'certificado'],
      cliente: ['cliente', 'asegurado', 'contratante', 'tomador'],
      aseguradora: ['aseguradora', 'compania', 'compañia'],
      estado: ['estado', 'estatus', 'status'],
      pais: ['pais', 'country'],
      moneda: ['moneda', 'currency'],
      prima_neta: ['prima_neta', 'prima neta', 'prima_sin_impuestos']
    },
    optional: { iva: ['iva', 'impuesto'], gastos: ['gastos', 'recargos'], vigencia: ['vigencia', 'inicio', 'fin', 'fecha_inicio', 'fecha_fin'] }
  },
  vehiculos: {
    target: 'vehiculos',
    required: { placa: ['placa', 'matricula'], marca: ['marca'], modelo: ['modelo', 'anio', 'año'] },
    optional: { chasis: ['chasis', 'vin'], motor: ['motor'], poliza: ['poliza', 'numero_poliza'] }
  },
  cobros_realizados: {
    target: 'conciliaciones',
    required: { fecha: ['fecha', 'fecha_pago'], monto: ['monto', 'valor', 'importe'], moneda: ['moneda', 'currency'], pais: ['pais', 'country'] },
    optional: { recibo: ['recibo', 'cuota'], poliza: ['poliza', 'numero_poliza'], cliente: ['cliente', 'asegurado'] }
  },
  planilla_aseguradora: {
    target: 'conciliaciones',
    required: { aseguradora: ['aseguradora', 'compania', 'compañia'], periodo: ['periodo', 'mes', 'corte'], moneda: ['moneda', 'currency'], pais: ['pais', 'country'] },
    optional: { poliza: ['poliza', 'numero_poliza'], recibo: ['recibo', 'cuota'], monto: ['monto', 'valor', 'prima'] }
  },
  planilla_comisiones: {
    target: 'conciliaciones',
    required: { aseguradora: ['aseguradora', 'compania', 'compañia'], periodo: ['periodo', 'mes', 'corte'], comision_pagada: ['comision_pagada', 'comision', 'comisión', 'valor_comision'], moneda: ['moneda', 'currency'], pais: ['pais', 'country'] },
    optional: { poliza: ['poliza', 'numero_poliza'], recibo: ['recibo', 'cuota'], asesor: ['asesor', 'vendedor', 'ejecutivo'] }
  },
  estado_cuenta_bancario: {
    target: 'conciliaciones',
    required: { fecha: ['fecha', 'fecha_movimiento'], descripcion: ['descripcion', 'descripción', 'concepto', 'detalle'], monto: ['monto', 'valor', 'importe'], moneda: ['moneda', 'currency'], pais: ['pais', 'country'] },
    optional: { referencia: ['referencia', 'documento', 'transaccion'], cuenta: ['cuenta', 'banco'] }
  },
  financiero_historico: {
    target: 'finmovs',
    required: { fecha: ['fecha'], concepto: ['concepto', 'descripcion', 'detalle'], monto: ['monto', 'valor', 'importe'], tipo_movimiento: ['tipo_movimiento', 'tipo', 'ingreso_egreso'], moneda: ['moneda', 'currency'], pais: ['pais', 'country'] },
    optional: { categoria: ['categoria', 'rubro'], cuenta: ['cuenta', 'banco'] }
  },
  siniestros: {
    target: 'siniestros',
    required: { cliente: ['cliente', 'asegurado'], fecha: ['fecha', 'fecha_siniestro'], estado: ['estado', 'estatus'] },
    optional: { poliza: ['poliza', 'numero_poliza'], ramo: ['ramo', 'producto'], monto: ['monto', 'reserva'] }
  },
  documentos_soporte: {
    target: 'documentos_soporte',
    required: { tipo_documento: ['tipo_documento', 'tipo', 'documento'], archivo: ['archivo', 'file', 'nombre_archivo'] },
    optional: { cliente: ['cliente', 'asegurado'], poliza: ['poliza', 'numero_poliza'], fecha: ['fecha'] }
  },
  configuracion_catalogo: {
    target: 'catalogos',
    required: { tipo_catalogo: ['tipo_catalogo', 'catalogo', 'tabla'], valor: ['valor', 'nombre', 'opcion'] },
    optional: { pais: ['pais', 'country'], moneda: ['moneda', 'currency'] }
  }
};

function argValue(flag){ const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
function readJson(file){ return JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8')); }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function norm(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
function columnsFromManifest(m){
  const raw = m.schema?.fields || m.fields || m.columns || m.columnas || [];
  if (Array.isArray(raw)) return raw.map((f) => typeof f === 'string' ? { raw:f, key:norm(f) } : { raw:f.name || f.field || f.target || f.label || '', key:norm(f.name || f.field || f.target || f.label || '') }).filter(x => x.key);
  if (raw && typeof raw === 'object') return Object.keys(raw).map(k => ({ raw:k, key:norm(k) }));
  return [];
}
function matchOne(cols, aliases){
  const a = aliases.map(norm);
  const exact = cols.find(c => a.includes(c.key));
  if (exact) return { status:'exacto', column:exact.raw, confidence:1 };
  const fuzzy = cols.find(c => a.some(x => c.key.includes(x) || x.includes(c.key)));
  if (fuzzy) return { status:'probable', column:fuzzy.raw, confidence:0.72 };
  return { status:'faltante', column:null, confidence:0 };
}
function profile(manifest){
  const errors=[]; const warnings=[];
  const m = manifest.manifest || manifest;
  const tenant = m.tenant_id || m.tenantId;
  const sourceType = m.source_type || m.sourceType || m.tipo_fuente;
  const profile = SOURCE_PROFILES[sourceType];
  const cols = columnsFromManifest(m);
  if (tenant && tenant !== TENANT) errors.push(`Tenant inválido: ${tenant}.`);
  if (!sourceType || !profile) errors.push(`Fuente sin perfil: ${sourceType || 'S/D'}.`);
  if (!cols.length) errors.push('No hay columnas declaradas en manifest.');
  const required = {};
  const optional = {};
  if (profile) {
    for (const [field, aliases] of Object.entries(profile.required)) required[field] = matchOne(cols, aliases);
    for (const [field, aliases] of Object.entries(profile.optional || {})) optional[field] = matchOne(cols, aliases);
  }
  const missingRequired = Object.entries(required).filter(([,v]) => v.status === 'faltante').map(([k]) => k);
  const probableRequired = Object.entries(required).filter(([,v]) => v.status === 'probable').map(([k,v]) => ({ field:k, column:v.column }));
  if (missingRequired.length) errors.push(`Campos obligatorios sin columna candidata: ${missingRequired.join(', ')}.`);
  if (probableRequired.length) warnings.push(`Campos obligatorios con match probable: ${probableRequired.map(x => `${x.field}->${x.column}`).join(', ')}.`);
  const matchedColumns = new Set([...Object.values(required), ...Object.values(optional)].filter(v => v.column).map(v => norm(v.column)));
  const unknown = cols.filter(c => !matchedColumns.has(c.key)).map(c => c.raw);
  if (unknown.length) warnings.push(`Columnas no mapeadas: ${unknown.slice(0, 20).join(', ')}${unknown.length > 20 ? '…' : ''}.`);
  const decision = errors.length ? 'PERFIL_BLOQUEADO' : (warnings.length ? 'PERFIL_LISTO_CON_ADVERTENCIAS' : 'PERFIL_LISTO');
  return { decision, source_type: sourceType, target: profile?.target || null, columns: cols.map(c => c.raw), required, optional, missing_required: missingRequired, probable_required: probableRequired, unknown_columns: unknown, errors, warnings };
}

const manifestArg = argValue('--manifest');
const errors=[];
if (!manifestArg) errors.push('Falta --manifest <archivo>.');
let result;
if (!errors.length) {
  try { result = profile(readJson(manifestArg)); }
  catch (e) { errors.push(`No se pudo perfilar manifest: ${e.message}`); }
}
if (errors.length) result = { decision:'PERFIL_BLOQUEADO', errors, warnings:[], columns:[] };
fs.mkdirSync(REPORT_DIR, { recursive:true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(REPORT_DIR, `PERFIL-COLUMNAS-FUENTE-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `PERFIL-COLUMNAS-FUENTE-AYS-${stamp}.txt`);
const report = { version: VERSION, created_at: new Date().toISOString(), manifest: manifestArg, ...result, restrictions:['metadata-only','no-row-reading','no-writes','no-Firestore','no-deploy','no-merge'] };
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 A&S — PERFIL COLUMNAS POR FUENTE',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Manifest: ${manifestArg || 'S/D'}`,
  `Decision: ${report.decision}`,
  'Restricciones: metadata-only, sin filas, sin writes, sin Firestore, sin deploy.',
  '============================================================',
  '',
  `Fuente: ${report.source_type || 'S/D'}`,
  `Destino esperado: ${report.target || 'S/D'}`,
  `Columnas declaradas: ${(report.columns || []).length}`,
  '',
  `Errores: ${(report.errors || []).length}`,
  ...(report.errors || []).map(e => `ERROR: ${e}`),
  '',
  `Advertencias: ${(report.warnings || []).length}`,
  ...(report.warnings || []).map(w => `WARN: ${w}`),
  '',
  `JSON: ${rel(jsonPath)}`,
  (report.errors || []).length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit((report.errors || []).length ? 1 : 0);
