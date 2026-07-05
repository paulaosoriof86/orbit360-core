#!/usr/bin/env node
/* Orbit 360 · A&S Firestore LAB adapter validator for conciliaciones/auditLog
   Static validator. No Firestore, no secrets, no writes.

   Usage:
     node tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs
     node tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs --store orbit360-platform/data/store-firestore-lab.local.js
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const VERSION = 'v1.0.0-ays-firestore-lab-conciliaciones-adapter-validator';
const REPORT_DIR = path.join(root, '_orbit360_reports');
const REQUIRED_COLLECTIONS = ['conciliaciones', 'auditLog'];
const BLOCKED_TEXT = ['apply_payment', 'aplicar_pago', 'estado:\'Pagado\'', 'estado:"Pagado"', 'postRecaudo('];

function argValue(flag, def = null){ const i = args.indexOf(flag); return i >= 0 ? args[i+1] : def; }
function hasAll(text, words){ return words.every((w)=>text.includes(w)); }
function linesWith(text, needle){
  return text.split(/\r?\n/).map((line, idx)=>({ line, no: idx+1 })).filter((row)=>row.line.includes(needle));
}

const storeArg = argValue('--store', 'orbit360-platform/data/store-firestore-lab.local.js');
const storePath = path.resolve(root, storeArg);
const errors=[]; const warnings=[]; const findings=[];

if(!fs.existsSync(storePath)) errors.push(`No existe store Firestore LAB: ${storeArg}`);
let text='';
if(!errors.length) text = fs.readFileSync(storePath, 'utf8');

if(text){
  findings.push(`Archivo: ${storeArg}`);
  if(!text.includes('mode !== \'firestore-lab\'') && !text.includes('mode !== "firestore-lab"')) errors.push('No se detecta gate firestore-lab.');
  if(!text.includes('alianzas-soluciones')) errors.push('No se detecta tenant alianzas-soluciones.');
  if(!text.includes('tenantId/') || !text.includes('collection')) errors.push('No se detecta ruta tenantId/{tenant}/collection.');
  if(!text.includes('function insert(')) errors.push('No se detecta API insert.');
  if(!text.includes('function update(')) errors.push('No se detecta API update.');
  if(!text.includes('function all(')) errors.push('No se detecta API all.');
  if(!text.includes('function where(')) errors.push('No se detecta API where.');
  if(!text.includes('onSnapshot')) errors.push('No se detecta onSnapshot.');
  if(!text.includes('_emit') && !text.includes('_emit: emit')) errors.push('No se detecta _emit.');

  for(const coll of REQUIRED_COLLECTIONS){
    const rows = linesWith(text, `'${coll}'`).concat(linesWith(text, `"${coll}"`));
    if(!rows.length) errors.push(`No se detecta colección requerida: ${coll}.`);
    else findings.push(`Colección ${coll}: línea(s) ${rows.map((r)=>r.no).join(', ')}`);
  }

  if(!text.includes('cleanForWrite')) warnings.push('No se detecta cleanForWrite; revisar limpieza de metacampos.');
  for(const needle of BLOCKED_TEXT){
    if(text.includes(needle)) errors.push(`Texto prohibido en adapter Firestore LAB: ${needle}`);
  }

  if(!hasAll(text, ['insert', 'update', 'remove', 'pref', 'setPref', 'raw'])) warnings.push('API extendida incompleta o no detectable visualmente.');
}

fs.mkdirSync(REPORT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const decision = errors.length ? 'BLOQUEADO' : (warnings.length ? 'ADAPTER_VALIDO_CON_ADVERTENCIAS' : 'ADAPTER_VALIDO');
const report = {
  version: VERSION,
  created_at: new Date().toISOString(),
  store_file: storeArg,
  decision,
  required_collections: REQUIRED_COLLECTIONS,
  findings,
  errors,
  warnings,
  restrictions: ['static-only', 'no Firestore writes', 'no secrets', 'no deploy']
};
const jsonPath = path.join(REPORT_DIR, `VALIDACION-ADAPTER-CONCILIACIONES-FIRESTORE-LAB-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `VALIDACION-ADAPTER-CONCILIACIONES-FIRESTORE-LAB-AYS-${stamp}.txt`);
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
const txt = [
  '============================================================',
  'ORBIT 360 - VALIDACION ADAPTER FIRESTORE LAB CONCILIACIONES',
  `Version: ${VERSION}`,
  `Fecha: ${report.created_at}`,
  `Store: ${storeArg}`,
  `Decision: ${decision}`,
  'Restricciones: static-only, sin Firestore, sin secretos, sin deploy.',
  '============================================================',
  '',
  ...findings,
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e)=>`ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w)=>`WARN: ${w}`),
  '',
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
