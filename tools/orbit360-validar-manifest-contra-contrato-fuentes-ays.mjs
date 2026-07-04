#!/usr/bin/env node
/*
  Orbit 360 A&S — valida un manifest de fuente contra el contrato canónico.
  Seguro: solo lee manifest metadata. Bloquea payloads embebidos.

  Uso:
    node tools/orbit360-validar-manifest-contra-contrato-fuentes-ays.mjs --manifest archivo.manifest.local.json
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.1-ays-manifest-contract-check';
const args = process.argv.slice(2);
function arg(flag){ const i = args.indexOf(flag); return i >= 0 ? args[i+1] : ''; }
function arr(v){ return Array.isArray(v) ? v : (v ? [v] : []); }
function uniq(v){ return [...new Set(v.filter(Boolean))]; }

const CONTRACT = {
  clientes: { writes:['clientes'], forbids:['polizas','cobros','finmovs','comisiones'], required:['nombre'] },
  aseguradoras: { writes:['aseguradoras'], forbids:['clientes','polizas','cobros','cartera','finmovs','produccion','comisiones'], required:['nombre','pais','moneda'] },
  polizas: { writes:['polizas','cobros'], forbids:['finmovs'], required:['cliente','aseguradora','numeroPoliza','estado','pais','moneda','primaNeta'] },
  vehiculos: { writes:['vehiculos'], forbids:['finmovs','cobros'], required:['placa'] },
  cobros_realizados: { writes:['cobros'], forbids:['finmovs'], required:['fecha','monto','moneda','pais'] },
  planilla_aseguradora: { writes:['cobros'], forbids:['finmovs'], required:['aseguradora','periodo','pais','moneda'] },
  planilla_comisiones: { writes:['comisiones'], forbids:['finmovs','clientes','polizas'], required:['aseguradora','periodo','pais','moneda','comisionPagada'] },
  estado_cuenta_bancario: { writes:['conciliacionBanco'], forbids:['clientes','polizas','cobros','cartera','produccion','finmovs'], required:['fecha','monto','moneda','pais'] },
  financiero_historico: { writes:['finmovs'], forbids:['clientes','polizas','cobros','cartera','produccion','comisiones'], required:['fecha','monto','moneda','pais','concepto'] },
  siniestros: { writes:['reclamos'], forbids:['finmovs','cobros'], required:['fecha','cliente','estado'] },
  documentos_soporte: { writes:['documentos','parchesPendientes'], forbids:['clientes','polizas','cobros'], required:['tipoDocumento','archivo'] },
  configuracion_catalogo: { writes:['configuracion','catalogos'], forbids:['clientes','polizas','cobros','finmovs'], required:['tipoCatalogo'] }
};
const PAYLOAD_KEYS = ['rows','row','records','items','data','payload','sampleRows','previewRows','normalizedRows','rawRows'];

const manifestPath = arg('--manifest') || arg('-m');
const findings = [];
function add(level, code, message, detail=''){ findings.push({ level, code, message, detail }); }

if(!manifestPath) add('BLOQUEADO','SIN_MANIFEST','Falta --manifest <archivo>.');
else if(!fs.existsSync(manifestPath)) add('BLOQUEADO','MANIFEST_NO_EXISTE','No existe el archivo manifest.', manifestPath);

let m = null;
if(!findings.length){
  try { m = JSON.parse(fs.readFileSync(manifestPath,'utf8')); }
  catch(e){ add('BLOQUEADO','MANIFEST_JSON_INVALIDO','No se pudo parsear JSON.', e.message); }
}

if(m){
  for(const k of PAYLOAD_KEYS){ if(Object.prototype.hasOwnProperty.call(m,k)) add('BLOQUEADO','PAYLOAD_EMBEBIDO','El manifest no debe contener filas ni payload.', k); }
  const type = m.source_type || m.tipo_fuente || m.type;
  const c = CONTRACT[type];
  if(!type) add('BLOQUEADO','SOURCE_TYPE_FALTANTE','Falta source_type.');
  else if(!c) add('BLOQUEADO','SOURCE_TYPE_NO_AUTORIZADO','Tipo de fuente no autorizado.', type);
  if(c){
    const destinations = uniq([...arr(m.destinations), ...arr(m.destination), ...arr(m.collections), ...arr(m.writes)]);
    if(!destinations.length) add('BLOQUEADO','DESTINOS_FALTANTES','Manifest debe declarar destino/colecciones permitidas.');
    for(const d of destinations){
      if(!c.writes.includes(d)) add('BLOQUEADO','DESTINO_NO_PERMITIDO',`Destino ${d} no permitido para ${type}.`,`permitidos: ${c.writes.join(', ')}`);
      if(c.forbids.includes(d)) add('BLOQUEADO','DESTINO_PROHIBIDO',`Destino ${d} prohibido para ${type}.`);
    }
    const fields = uniq([...arr(m.fields), ...arr(m.columns), ...arr(m.schema_fields), ...arr(m.required_fields)]);
    const missing = c.required.filter(f => !fields.includes(f));
    if(missing.length) add('REQUIERE_VALIDACION','CAMPOS_REQUERIDOS_NO_DECLARADOS','El manifest no declara campos requeridos del contrato.', missing.join(', '));
  }
  const country = (m.country || m.pais || '').toUpperCase();
  const currency = (m.currency || m.moneda || '').toUpperCase();
  if((country && !currency) || (!country && currency)) add('REQUIERE_VALIDACION','PAIS_MONEDA_INCOMPLETO','País y moneda deben venir juntos o requerir validación.', `${country}/${currency}`);
  if(country === 'GT' && currency && currency !== 'GTQ') add('BLOQUEADO','PAIS_MONEDA_INCOHERENTE','GT debe usar GTQ.', currency);
  if(country === 'CO' && currency && currency !== 'COP') add('BLOQUEADO','PAIS_MONEDA_INCOHERENTE','CO debe usar COP.', currency);
}

const blocked = findings.filter(f => f.level === 'BLOQUEADO').length;
const review = findings.filter(f => f.level === 'REQUIERE_VALIDACION').length;
const status = blocked ? 'BLOQUEADO' : review ? 'REQUIERE_VALIDACION' : 'VALIDO_CONTRATO';
fs.mkdirSync(REPORT_DIR,{recursive:true});
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const report = { version: VERSION, created_at: new Date().toISOString(), manifest: manifestPath || null, status, blocked, review, findings };
const outPath = path.join(REPORT_DIR, `VALIDAR-MANIFEST-CONTRATO-FUENTES-AYS-${stamp}.json`);
fs.writeFileSync(outPath, JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report,null,2));
process.exit(blocked ? 1 : 0);
