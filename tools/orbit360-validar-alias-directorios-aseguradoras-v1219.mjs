#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const file = path.join(repo, 'orbit360-platform', 'core', 'aseguradoras-op2-source-guard.js');
const pass = [], fail = [];
function check(id, ok, message) { (ok ? pass : fail).push({ id, message, file:'orbit360-platform/core/aseguradoras-op2-source-guard.js' }); }

check('FILE', fs.existsSync(file), 'Guard de alias presente');
const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
check('NO_STORE_WRITES', !/Orbit\.store\.(?:insert|update|remove)/.test(src), 'Guard no escribe ni fusiona entidades');
check('EXPOSED_TEST_API', src.includes('D.op2CanonicalName = canonical') && src.includes('D.op2NamesNear = near') && src.includes('D.op2NamesExactCanonical = exactCanonical'), 'API de normalización disponible para pruebas');
check('PROBABLE_UPDATE_GUARD', src.includes('actualizacion_probable_requiere_confirmacion') && src.includes("type:'probable_update'"), 'Actualización probable queda bloqueada');

let writes = 0;
const makeResult = () => {
  const candidates = [
    { sourceSheet:'Compañía Ficticia', identityName:'Compañía Ficticia', country:'CO' },
    { sourceSheet:'Compañía Ficticia 1.0', identityName:'Compañía Ficticia 1.0', country:'CO' },
    { sourceSheet:'Seguros Gamma', identityName:'Seguros Gamma', country:'GT' },
    { sourceSheet:'Seguros Gammx', identityName:'Seguros Gammx', country:'GT' },
    { sourceSheet:'Compañía Ficticia Exterior', identityName:'Compañía Ficticia', country:'GT' },
    { sourceSheet:'Seguros Omego', identityName:'Seguros Omego', country:'GT' },
    { sourceSheet:'Aseguradora Delta', identityName:'Aseguradora Delta', country:'GT' }
  ];
  const operations = candidates.map(candidate => ({
    action:candidate.sourceSheet === 'Seguros Omego' || candidate.sourceSheet === 'Aseguradora Delta' ? 'update' : 'insert',
    id:candidate.sourceSheet === 'Seguros Omego' ? 'existing_omega' : candidate.sourceSheet === 'Aseguradora Delta' ? 'existing_delta' : '',
    sourceSheet:candidate.sourceSheet,
    data:{ id:'op_' + candidate.sourceSheet, pais:candidate.country, validacionAlertas:[], validationStatus:'validado', requiereValidacion:false }
  }));
  return {
    candidates,
    report:{
      _operations:operations,
      totals:{}, sheetSummary:candidates.map(x => ({ sheet:x.sourceSheet, alerts:[] }))
    }
  };
};
const importer = {
  parseMatrices(){ return makeResult(); },
  async parseFile(){ return makeResult(); }
};
const existing = [
  { id:'existing_demo', nombre:'Aseguradora Delta Norte', pais:'GT' },
  { id:'existing_omega', nombre:'Aseguradora Omega', pais:'GT' },
  { id:'existing_delta', nombre:'Aseguradora Delta', pais:'GT' }
];
const sandbox = {
  window:{ Orbit:{ insurerDirectoryImport:importer, store:{
    all(){ return existing; },
    insert(){ writes++; }, update(){ writes++; }, remove(){ writes++; }
  } } },
  Orbit:null,
  console
};
sandbox.Orbit = sandbox.window.Orbit;
vm.createContext(sandbox);
try { vm.runInContext(src, sandbox, { filename:file }); }
catch (error) { fail.push({ id:'VM_LOAD', message:String(error && error.stack || error), file }); }

if (sandbox.Orbit.insurerDirectoryImport.op2CanonicalName) {
  const D = sandbox.Orbit.insurerDirectoryImport;
  check('VERSION_CANONICAL', D.op2CanonicalName('Compañía Ficticia 1.0') === D.op2CanonicalName('Compañía Ficticia'), 'Versión numérica sin prefijo se normaliza con su original');
  check('ONE_LETTER_NEAR', D.op2NamesNear('Seguros Gamma','Seguros Gammx') === true, 'Diferencia de una letra queda como coincidencia probable');
  check('EXACT_CANONICAL', D.op2NamesExactCanonical('Aseguradora Delta','Seguros Delta') === true, 'Prefijos jurídicos no impiden coincidencia exacta');
  check('PROBABLE_NOT_EXACT', D.op2NamesExactCanonical('Seguros Omego','Aseguradora Omega') === false, 'Variante probable no se trata como identidad exacta');
  check('COUNTRY_SCOPE_INPUT', D.op2NamesNear('Compañía Ficticia','Compañía Ficticia') === true, 'Similitud se calcula separada del alcance país');

  const result = D.parseMatrices({});
  const reviews = result.report.duplicateReview || [];
  const within = reviews.filter(x => x.type === 'within_file');
  const probableUpdates = reviews.filter(x => x.type === 'probable_update');
  check('TWO_WITHIN_PAIRS', within.length === 2, 'Solo las dos parejas probables del mismo país quedan en revisión');
  check('VERSION_PAIR_BLOCKED', within.some(x => x.sheets.includes('Compañía Ficticia') && x.sheets.includes('Compañía Ficticia 1.0')), 'Original y versión quedan bloqueados');
  check('TYPO_PAIR_BLOCKED', within.some(x => x.sheets.includes('Seguros Gamma') && x.sheets.includes('Seguros Gammx')), 'Variante de una letra queda bloqueada');
  check('CROSS_COUNTRY_NOT_MERGED', !within.some(x => x.sheets.includes('Compañía Ficticia Exterior')), 'Mismo nombre en otro país no se mezcla');
  check('ONE_PROBABLE_UPDATE', probableUpdates.length === 1 && probableUpdates[0].sheet === 'Seguros Omego', 'Solo la actualización no exacta queda en revisión');

  const operations = result.report._operations;
  const versionOps = operations.filter(op => /Compañía Ficticia(?: 1\.0)?$/.test(op.sourceSheet));
  const typoOps = operations.filter(op => /Seguros Gamm[ax]/.test(op.sourceSheet));
  const probableUpdate = operations.find(op => op.sourceSheet === 'Seguros Omego');
  const exactUpdate = operations.find(op => op.sourceSheet === 'Aseguradora Delta');
  check('VERSION_ALERTS', versionOps.every(op => op.data.requiereValidacion && op.data.validacionAlertas.includes('duplicado_probable_dentro_del_archivo')), 'Ambas versiones reciben alerta bloqueante');
  check('TYPO_ALERTS', typoOps.every(op => op.data.requiereValidacion && op.data.validacionAlertas.includes('duplicado_probable_dentro_del_archivo')), 'Ambas variantes reciben alerta bloqueante');
  check('PROBABLE_UPDATE_ALERT', probableUpdate.data.requiereValidacion && probableUpdate.data.validacionAlertas.includes('actualizacion_probable_requiere_confirmacion'), 'Actualización probable no puede aplicarse automáticamente');
  check('EXACT_UPDATE_ALLOWED', !exactUpdate.data.requiereValidacion && !exactUpdate.data.validacionAlertas.includes('actualizacion_probable_requiere_confirmacion'), 'Identidad canónica exacta conserva actualización validable');
  check('NO_AUTO_WRITE', writes === 0, 'La detección no escribe ni fusiona automáticamente');
}

const syntax = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
check('SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis válida' : String(syntax.stderr || syntax.stdout).trim());

const result = {
  validator:'orbit360-validar-alias-directorios-aseguradoras-v1220',
  generatedAt:new Date().toISOString(),
  summary:{ pass:pass.length, fail:fail.length },
  pass, fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
