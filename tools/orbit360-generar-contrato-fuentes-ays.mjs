#!/usr/bin/env node
/*
  Orbit 360 A&S — contrato canónico de fuentes de migración.
  Seguro: no lee datos reales, no escribe Firestore, no modifica store.

  Uso:
    node tools/orbit360-generar-contrato-fuentes-ays.mjs
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-source-contract';

const COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };
const COMMON_META = ['source_type','file_name','file_hash','sheet_name','row_number','block_id','period','country','currency','tenant_id'];

const CONTRACTS = {
  clientes: {
    writes: ['clientes'], forbids: ['polizas','cobros','finmovs','comisiones'], required: ['nombre'], recommended: ['nit','dpi','telefono','email','pais','moneda'], rule: 'Si falta pais/moneda confiable, requiere validacion; no default GT/GTQ.'
  },
  aseguradoras: {
    writes: ['aseguradoras'], forbids: ['clientes','polizas','cobros','finmovs'], required: ['nombre','pais'], recommended: ['contacto','telefono','email','portal','codigo'], rule: 'Directorio por pais; no mezclar GT/CO.'
  },
  polizas: {
    writes: ['polizas','cobros'], forbids: ['finmovs'], required: ['cliente','aseguradora','numeroPoliza','estado','pais','moneda','primaNeta'], recommended: ['ramo','vigenciaInicio','vigenciaFin','formaPago','primaTotal','iva','gastos'], rule: 'Solo Vigente/Por renovar con pais/moneda/formaPago confiable genera cobros/cartera.'
  },
  vehiculos: {
    writes: ['vehiculos'], forbids: ['finmovs','cobros'], required: ['placa'], recommended: ['cliente','marca','linea','modelo','pais'], rule: 'Vehiculo no crea poliza ni cobro sin fuente polizas.'
  },
  cobros_realizados: {
    writes: ['cobros'], forbids: ['finmovs'], required: ['fecha','monto','moneda','pais'], recommended: ['poliza','recibo','cliente','aseguradora','medioPago'], rule: 'Recaudo/cobro no es finmov; requiere conciliacion si viene de banco.'
  },
  planilla_aseguradora: {
    writes: ['cobros'], forbids: ['finmovs'], required: ['aseguradora','periodo','pais','moneda'], recommended: ['poliza','recibo','primaNeta','estadoRecibo'], rule: 'No crea clientes/polizas; concilia cartera y recibos.'
  },
  planilla_comisiones: {
    writes: ['comisiones'], forbids: ['finmovs','clientes','polizas'], required: ['aseguradora','periodo','pais','moneda','comisionPagada'], recommended: ['poliza','recibo','asesor','primaNeta','comisionEsperada','diferencia'], rule: 'Debe leerse de filas reales; no simular tarifas ni actualizar tarifario sin diff.'
  },
  estado_cuenta_bancario: {
    writes: ['conciliacionBanco'], forbids: ['clientes','polizas','cobros','cartera','produccion'], required: ['fecha','monto','moneda','pais'], recommended: ['descripcion','referencia','cuenta'], rule: 'Banco solo concilia; no escribe cobros sin confirmacion.'
  },
  financiero_historico: {
    writes: ['finmovs'], forbids: ['clientes','polizas','cobros','cartera','produccion','comisiones'], required: ['fecha','monto','moneda','pais','concepto'], recommended: ['categoria','cuenta','tipoMov'], rule: 'Historico financiero no infiere clientes, polizas, cobros ni cartera.'
  },
  siniestros: {
    writes: ['reclamos'], forbids: ['finmovs','cobros'], required: ['fecha','cliente','estado'], recommended: ['poliza','aseguradora','monto','moneda','pais'], rule: 'Siniestro no altera poliza/cartera sin confirmacion.'
  },
  documentos_soporte: {
    writes: ['documentos','parchesPendientes'], forbids: ['clientes_directo','polizas_directo','cobros_directo'], required: ['tipoDocumento','archivo'], recommended: ['cliente','poliza','pais','moneda'], rule: 'Documento propone datos; solo aplica cambios con diff y confirmacion.'
  },
  configuracion_catalogo: {
    writes: ['configuracion','catalogos'], forbids: ['clientes','polizas','cobros','finmovs'], required: ['tipoCatalogo'], recommended: ['pais','moneda','valor'], rule: 'Configura tenant; no crea operacion comercial.'
  }
};

function validateContract(){
  const errors = [];
  for (const [type, c] of Object.entries(CONTRACTS)) {
    if (!Array.isArray(c.writes) || !c.writes.length) errors.push(`${type}: writes vacio`);
    if (!Array.isArray(c.required)) errors.push(`${type}: required invalido`);
    if (!Array.isArray(c.forbids)) errors.push(`${type}: forbids invalido`);
    if (!c.rule) errors.push(`${type}: falta rule`);
    if ((c.required.includes('pais') && !c.required.includes('moneda')) || (c.required.includes('moneda') && !c.required.includes('pais'))) errors.push(`${type}: pais/moneda deben requerirse juntos o validarse juntos`);
  }
  return errors;
}

const manifest = { version: VERSION, created_at: new Date().toISOString(), country_currency: COUNTRY_CURRENCY, common_metadata: COMMON_META, source_types: CONTRACTS, invariants: [
  'No mezclar fuentes.',
  'No inferir clientes/polizas desde financiero_historico o banco.',
  'No generar cartera si falta estado/pais/moneda.',
  'No autorizar moneda sugerida como moneda escrita.',
  'Documentos soporte solo proponen parches con diff.',
  'Toda fila conserva archivo, hoja, fila, bloque, periodo, pais y moneda.'
]};
const errors = validateContract();
fs.mkdirSync(REPORT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const jsonPath = path.join(REPORT_DIR, `CONTRATO-FUENTES-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `CONTRATO-FUENTES-AYS-${stamp}.txt`);
fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf8');
const lines = ['ORBIT 360 A&S - CONTRATO CANONICO DE FUENTES', `Version: ${VERSION}`, `Fecha: ${manifest.created_at}`, `Tipos: ${Object.keys(CONTRACTS).length}`, `Errores: ${errors.length}`, ...errors.map(e => `ERROR: ${e}`), '', ...Object.entries(CONTRACTS).flatMap(([k,c]) => [`## ${k}`, `writes: ${c.writes.join(', ')}`, `forbids: ${c.forbids.join(', ')}`, `required: ${c.required.join(', ')}`, `rule: ${c.rule}`, ''])];
fs.writeFileSync(txtPath, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
console.log(`JSON: ${path.relative(root,jsonPath).replace(/\\/g,'/')}`);
console.log(`TXT: ${path.relative(root,txtPath).replace(/\\/g,'/')}`);
process.exit(errors.length ? 1 : 0);
