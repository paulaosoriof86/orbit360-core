#!/usr/bin/env node
/* Orbit 360 A&S — dry-run estructural por fuente separada v2.
   Seguro: sin red, sin Firebase, sin Firestore, sin secretos, sin payload real. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.1.0-ays-separated-source-dryrun-canonical';
const COUNTRY_CURRENCY = { GT:'GTQ', CO:'COP' };
const errors = [];
const warnings = [];

const CONTRACT = {
  clientes: { target:['clientes'], required:[['nombre_cliente','cliente','nombre','razon_social'], ['documento_numero','nit','dpi','cedula','documento'], ['pais','country']], blocked:['polizas','cobros','cartera','finmovs'] },
  aseguradoras: { target:['aseguradoras'], required:[['nombre','aseguradora','compania'], ['pais','country']], blocked:['clientes','polizas','cobros','cartera','finmovs'] },
  polizas: { target:['polizas','cobros'], required:[['numero_poliza','poliza','no_poliza','numero'], ['cliente','nombre_cliente','asegurado'], ['aseguradora','compania'], ['estado'], ['pais','country'], ['moneda','currency'], ['prima_neta','prima']], blocked:['finmovs'] },
  vehiculos: { target:['vehiculos'], required:[['placa']], blocked:['finmovs','cobros'] },
  cobros_realizados: { target:['cobros'], required:[['fecha_pago','fecha','fecha_cobro'], ['monto_pagado','monto','valor','importe'], ['moneda','currency'], ['pais','country']], blocked:['finmovs','cartera'] },
  planilla_aseguradora: { target:['cobros'], required:[['aseguradora','compania'], ['periodo','mes'], ['pais','country'], ['moneda','currency']], blocked:['clientes','polizas','finmovs'] },
  planilla_comisiones: { target:['comisiones'], required:[['aseguradora','compania'], ['periodo','mes'], ['pais','country'], ['moneda','currency'], ['comision_pagada','comisionPagada','comision']], blocked:['finmovs','clientes','polizas'] },
  estado_cuenta_bancario: { target:['conciliacionBanco'], required:[['fecha','date'], ['descripcion','concepto','detalle'], ['monto','importe','debito','credito'], ['moneda','currency'], ['pais','country']], blocked:['clientes','polizas','cobros','cartera','produccion','finmovs'] },
  financiero_historico: { target:['finmovs'], required:[['periodo','mes'], ['pais','country'], ['moneda','currency'], ['concepto','descripcion','detalle'], ['monto','ingreso','egreso','debito','credito'], ['tipo_movimiento','tipoMov']], blocked:['clientes','polizas','cobros','cartera','produccion','comisiones'] },
  siniestros: { target:['reclamos'], required:[['fecha_reclamo','fecha','fecha_siniestro'], ['cliente','nombre_cliente','asegurado'], ['estado_reclamo','estado']], blocked:['finmovs','cobros'] },
  documentos_soporte: { target:['documentos','parchesPendientes'], required:[['tipo_documento','documento_tipo','tipo'], ['url','archivo','ruta','file']], blocked:['clientes','polizas','cobros'] },
  configuracion_catalogo: { target:['configuracion','catalogos'], required:[['tipo_catalogo','catalogo'], ['pais','country']], blocked:['clientes','polizas','cobros','finmovs'] }
};

function arg(flag){ const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null; }
function rel(p){ return path.relative(root, p).replace(/\\/g, '/'); }
function nk(v){ return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); }
function arr(v){ return Array.isArray(v) ? v : (v ? [v] : []); }
function safeName(v){ return path.basename(String(v || 'SIN_ARCHIVO')).replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,96) || 'SIN_ARCHIVO'; }
function readJson(file){
  if(!file){ errors.push('Falta --manifest <archivo>.'); return null; }
  const abs = path.resolve(root, file);
  if(!fs.existsSync(abs)){ errors.push(`No existe manifest: ${rel(abs)}`); return null; }
  try { return JSON.parse(fs.readFileSync(abs,'utf8')); }
  catch(e){ errors.push(`Manifest JSON inválido: ${e.message}`); return null; }
}
function payloadKeys(obj, prefix='', out=[]){
  if(!obj || typeof obj !== 'object') return out;
  for(const k of Object.keys(obj)){
    const kp = prefix ? `${prefix}.${k}` : k;
    if(['rows','row','records','items','data','payload','sampleRows','previewRows','normalizedRows','rawRows'].includes(k)) out.push(kp);
    if(obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) payloadKeys(obj[k], kp, out);
  }
  return out;
}
function collectColumns(m){
  const out = new Set();
  const add = (x) => { const k = nk(typeof x === 'string' ? x : x?.name || x?.field || x?.target); if(k) out.add(k); };
  arr(m?.fields).forEach(add);
  arr(m?.columns).forEach(add);
  for(const s of arr(m?.sheets)) arr(s.columns).forEach(add);
  return out;
}
function hasAny(columns, names){ return names.some(n => columns.has(nk(n))); }
function validateCountryCurrency(m){
  const country = String(m.declared_country || m.country || m.pais || '').toUpperCase();
  const currency = String(m.declared_currency || m.currency || m.moneda || '').toUpperCase();
  const requiresValidation = Boolean(m.requires_validation || m.requiere_validacion);
  if(!country) errors.push('Falta declared_country/country/pais.');
  if(!currency) warnings.push('Falta declared_currency/currency/moneda.');
  if(COUNTRY_CURRENCY[country] && currency && COUNTRY_CURRENCY[country] !== currency) errors.push(`Moneda incoherente para ${country}: ${currency}. Esperado: ${COUNTRY_CURRENCY[country]}.`);
  if(!COUNTRY_CURRENCY[country] && country && !requiresValidation) warnings.push(`País ${country} no canónico; requiere validación antes de LAB.`);
  if(['MIXTO','MIXTA','S/D','SD'].includes(country)) warnings.push('País mixto o S/D: requiere separación por hoja o validación manual antes de LAB.');
  if(['MIXTO','MIXTA','S/D','SD'].includes(currency)) warnings.push('Moneda mixta o S/D: requiere separación por hoja o validación manual antes de LAB.');
  for(const s of arr(m.sheets)){
    const sc = String(s.country || s.pais || '').toUpperCase();
    const sm = String(s.currency || s.moneda || '').toUpperCase();
    if(COUNTRY_CURRENCY[sc] && sm && COUNTRY_CURRENCY[sc] !== sm) errors.push(`Hoja ${s.sheet_name || s.name}: moneda ${sm} incoherente para ${sc}.`);
  }
}
function validate(m){
  if(!m || typeof m !== 'object') return { sourceType:'sin_tipo', contract:null, columns:new Set() };
  const forbidden = payloadKeys(m);
  if(forbidden.length) errors.push(`Manifest contiene payload prohibido: ${forbidden.join(', ')}`);
  if(m.contains_real_payload === true) errors.push('contains_real_payload=true: manifest bloqueado.');
  if(m.write_enabled === true || m.writeEnabled === true) errors.push('write_enabled=true no permitido en dry-run.');
  if(!m.tenant_id && !m.tenantId) errors.push('Falta tenant_id/tenantId.');
  if(!m.file_name && !m.file && !m.source_file && !m.source_files) errors.push('Falta referencia estructural de archivo fuente.');
  const sourceType = nk(m.source_type || m.tipo_fuente || m.type || '');
  const contract = CONTRACT[sourceType];
  if(!contract){ errors.push(`source_type no soportado: ${sourceType || 'S/D'}. Permitidos: ${Object.keys(CONTRACT).join(', ')}`); return { sourceType, contract:null, columns:new Set() }; }
  validateCountryCurrency(m);
  const requested = [...arr(m.requested_targets), ...arr(m.destinations), ...arr(m.collections)].map(nk);
  for(const t of requested) if(t && !contract.target.map(nk).includes(t)) warnings.push(`Destino no principal para ${sourceType}: ${t}. Permitidos: ${contract.target.join(', ')}`);
  for(const b of contract.blocked) if(requested.includes(nk(b))) errors.push(`Destino bloqueado para ${sourceType}: ${b}`);
  const columns = collectColumns(m);
  if(!columns.size) errors.push('No se declararon campos/columnas estructurales.');
  for(const group of contract.required) if(!hasAny(columns, group)) warnings.push(`Campo requerido no detectado. Aceptados: ${group.join(' | ')}`);
  return { sourceType, contract, columns };
}
function decision(){ return errors.length ? 'bloqueado' : warnings.length ? 'requiere_validacion' : 'listo_dryrun'; }

const manifestArg = arg('--manifest') || arg('-m');
const manifest = readJson(manifestArg);
const result = validate(manifest);
const fileName = safeName(manifest?.file_name || manifest?.archivo || 'manifest.json');
const hash = crypto.createHash('sha256').update(JSON.stringify({ sourceType: result.sourceType, fileName, sheets: arr(manifest?.sheets).map(s => ({ name: s.sheet_name || s.name, cols: arr(s.columns).length, period: s.period || '' })) })).digest('hex').slice(0,12);
const lines = [
  '============================================================',
  'ORBIT 360 - DRY-RUN FUENTE SEPARADA A&S v2',
  `Version: ${VERSION}`,
  `Fecha: ${new Date().toISOString()}`,
  'Restricciones: sin red, sin Firebase, sin Firestore, sin secretos, sin payload real.',
  '============================================================','',
  `Archivo declarado: ${fileName}`,
  `Tipo fuente: ${result.sourceType || 'S/D'}`,
  `Destino permitido: ${(result.contract?.target || []).join(', ') || 'S/D'}`,
  `Decision: ${decision()}`,
  `Manifest hash estructural: ${hash}`,'',
  `Errores bloqueantes: ${errors.length}`,
  ...errors.map(e => `ERROR: ${e}`),'',
  `Advertencias: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),'',
  'Salida permitida: solo estructura, conteos y validaciones. No contiene filas reales.',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
];
fs.mkdirSync(REPORT_DIR,{recursive:true});
const reportPath = path.join(REPORT_DIR, `DRYRUN-FUENTE-SEPARADA-AYS-v2-${result.sourceType || 'sin_tipo'}-${hash}.txt`);
fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
console.log(`\nReporte: ${rel(reportPath)}`);
process.exit(errors.length ? 1 : 0);
