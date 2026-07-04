#!/usr/bin/env node
/* Orbit 360 A&S - preview normalizado de manifests de fuente.
   Modo seguro: solo revisa metadatos del manifest; no usa red, Firebase ni store. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-preview-normalizado-fuentes-ays';
const STATUS = ['LISTO','REQUIERE_VALIDACION','BLOQUEADO','OMITIDO','DUPLICADO_PROBABLE'];
const COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };
const CONTRACT = {
  clientes: { writes:['clientes'], blocks:['polizas','cobros','cartera','finmovs','produccion','comisiones'] },
  aseguradoras: { writes:['aseguradoras'], blocks:['clientes','polizas','cobros','cartera','finmovs','produccion','comisiones'] },
  polizas: { writes:['polizas','cobros'], blocks:['finmovs'] },
  vehiculos: { writes:['vehiculos'], blocks:['finmovs','cobros'] },
  cobros_realizados: { writes:['cobros'], blocks:['finmovs','cartera','produccion'] },
  planilla_aseguradora: { writes:['cobros'], blocks:['clientes','polizas','finmovs'] },
  planilla_comisiones: { writes:['comisiones'], blocks:['finmovs','clientes','polizas','produccion'] },
  estado_cuenta_bancario: { writes:['conciliacionBanco'], blocks:['clientes','polizas','cobros','cartera','produccion','finmovs'] },
  financiero_historico: { writes:['finmovs'], blocks:['clientes','polizas','cobros','cartera','produccion','comisiones'] },
  siniestros: { writes:['reclamos'], blocks:['finmovs','cobros'] },
  documentos_soporte: { writes:['documentos','parchesPendientes'], blocks:['clientes','polizas','cobros'] },
  configuracion_catalogo: { writes:['configuracion','catalogos'], blocks:['clientes','polizas','cobros','finmovs'] }
};

function argValue(flag){ const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null; }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function asArray(v){ return Array.isArray(v) ? v : (v ? [v] : []); }
function norm(v){ return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); }
function safeFile(v){ return path.basename(String(v || 'manifest')).replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,90); }
function deepForbidden(obj, prefix = '', out = []){
  if(!obj || typeof obj !== 'object') return out;
  for(const key of Object.keys(obj)){
    const here = prefix ? `${prefix}.${key}` : key;
    if(['rows','row','records','items','data','payload','sampleRows','previewRows','normalizedRows','rawRows'].includes(key)) out.push(here);
    if(obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) deepForbidden(obj[key], here, out);
  }
  return out;
}
function sheetState(sheet, manifest){
  const name = String(sheet.sheet_name || sheet.name || 'SIN_NOMBRE');
  const omitted = Boolean(sheet.excluded || sheet.omit || sheet.ignore || String(sheet.status || '').toUpperCase() === 'OMITIDO');
  if(omitted) return { sheet:name, status:'OMITIDO', reasons:['Hoja fuera de alcance.'] };
  const c = String(sheet.country || sheet.pais || manifest.country || manifest.pais || '').toUpperCase();
  const m = String(sheet.currency || sheet.moneda || manifest.currency || manifest.moneda || '').toUpperCase();
  const reasons = [];
  if(!c || ['MIXTO','MIXTA','S/D','SD'].includes(c)) reasons.push('Pais requiere validacion.');
  if(!m || ['MIXTO','MIXTA','S/D','SD'].includes(m)) reasons.push('Moneda requiere validacion.');
  if(COUNTRY_CURRENCY[c] && m && COUNTRY_CURRENCY[c] !== m) reasons.push(`Moneda incoherente para ${c}.`);
  if(reasons.some(x => /incoherente/i.test(x))) return { sheet:name, status:'BLOQUEADO', reasons };
  if(reasons.length) return { sheet:name, status:'REQUIERE_VALIDACION', reasons };
  return { sheet:name, status:'LISTO', reasons:[] };
}

const errors = [];
const warnings = [];
const manifestArg = argValue('--manifest') || argValue('-m');
let manifest = null;
if(!manifestArg) errors.push('Falta --manifest <archivo>.');
else {
  const abs = path.resolve(root, manifestArg);
  if(!fs.existsSync(abs)) errors.push(`No existe manifest: ${rel(abs)}`);
  else {
    try { manifest = JSON.parse(fs.readFileSync(abs, 'utf8')); }
    catch(err){ errors.push(`Manifest JSON invalido: ${err.message}`); }
  }
}

let sourceType = 'S/D';
let destinations = [];
let items = [];
if(manifest){
  const forbidden = deepForbidden(manifest);
  if(forbidden.length) errors.push(`Manifest contiene detalle de filas prohibido: ${forbidden.join(', ')}`);
  if(manifest.contains_real_payload === true) errors.push('contains_real_payload=true no permitido.');
  if(manifest.write_enabled === true || manifest.writeEnabled === true) errors.push('write_enabled=true no permitido.');
  if(!manifest.tenant_id && !manifest.tenantId) errors.push('Falta tenant_id/tenantId.');
  sourceType = norm(manifest.source_type || manifest.sourceType || manifest.tipo_fuente || manifest.type || '');
  const contract = CONTRACT[sourceType];
  if(!contract) errors.push(`source_type no soportado: ${sourceType || 'S/D'}.`);
  destinations = [...asArray(manifest.destinations), ...asArray(manifest.destination_collections), ...asArray(manifest.collections), ...asArray(manifest.target_collections)].filter(Boolean);
  if(!destinations.length) errors.push('Faltan destinos explicitos.');
  if(contract){
    for(const d of destinations) if(!contract.writes.includes(d)) warnings.push(`Destino no principal para ${sourceType}: ${d}.`);
    for(const b of contract.blocks) if(destinations.includes(b)) errors.push(`${sourceType} no puede escribir en ${b}.`);
  }
  const omitted = [...asArray(manifest.excluded_sheets), ...asArray(manifest.ignored_sheets)].map(s => typeof s === 'string' ? { name:s, excluded:true } : { ...s, excluded:true });
  const sheets = [...asArray(manifest.sheets), ...omitted];
  items = sheets.length ? sheets.map(s => sheetState(s, manifest)) : [{ sheet:'MANIFEST_COMPLETO', status: errors.length ? 'BLOQUEADO' : 'LISTO', reasons:[] }];
}

const counts = Object.fromEntries(STATUS.map(s => [s, 0]));
items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
const decision = (errors.length || counts.BLOQUEADO) ? 'PREVIEW_BLOQUEADO' : ((warnings.length || counts.REQUIERE_VALIDACION || counts.DUPLICADO_PROBABLE) ? 'PREVIEW_REQUIERE_VALIDACION' : 'PREVIEW_LISTO');
fs.mkdirSync(REPORT_DIR, { recursive:true });
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const jsonPath = path.join(REPORT_DIR, `PREVIEW-NORMALIZADO-FUENTE-AYS-${safeFile(sourceType)}-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `PREVIEW-NORMALIZADO-FUENTE-AYS-${safeFile(sourceType)}-${stamp}.txt`);
const report = { version:VERSION, created_at:new Date().toISOString(), manifest:manifestArg, decision, source_type:sourceType, destinations, counts, errors, warnings, items };
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  'ORBIT 360 - PREVIEW NORMALIZADO FUENTE A&S',
  `Version: ${VERSION}`,
  `Manifest: ${manifestArg || 'S/D'}`,
  `Tipo fuente: ${sourceType}`,
  `Decision: ${decision}`,
  `Estados: LISTO=${counts.LISTO}; REQUIERE_VALIDACION=${counts.REQUIERE_VALIDACION}; BLOQUEADO=${counts.BLOQUEADO}; OMITIDO=${counts.OMITIDO}; DUPLICADO_PROBABLE=${counts.DUPLICADO_PROBABLE}`,
  `Errores: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  `JSON: ${rel(jsonPath)}`,
  `TXT: ${rel(txtPath)}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
