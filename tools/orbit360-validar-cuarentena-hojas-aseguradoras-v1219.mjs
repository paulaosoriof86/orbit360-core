#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const file = path.join(repo, 'orbit360-platform', 'core', 'aseguradoras-op2-sheet-quarantine.js');
const pass = [], fail = [];
function check(id, ok, message) { (ok ? pass : fail).push({ id, message, file:'orbit360-platform/core/aseguradoras-op2-sheet-quarantine.js' }); }

check('FILE', fs.existsSync(file), 'Guard de cuarentena presente');
const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
check('PRE_PARSE_WRAP', src.includes('const originalParseMatrices = D.parseMatrices.bind(D)') && src.includes('quarantineMatrices(matrices)'), 'Filtra matrices antes del parser base');
check('PARSE_FILE_REIMPLEMENTED', src.includes('D.parseFile = async function') && src.includes('captureSecure:true'), 'Archivo se relee con cuarentena antes de capturar sensibles');
check('NO_RAW_VALUES_REPORT', src.includes('rawValuesExposed:false') && src.includes('secureCaptureAttempted:false'), 'Reporte de cuarentena no expone valores');
check('TECH_MARKERS', src.includes('firebase\\s*config') && src.includes('service\\s*account') && src.includes('api\\s*key'), 'Detecta señales técnicas fuertes');
check('PERSONNEL_MARKER', src.includes('hoja_personal_interno'), 'Excluye directorios internos no aseguradora');

let lastMatrices = null;
const fakeImporter = {
  parseMatrices(matrices, options) {
    lastMatrices = matrices;
    return {
      excluded:[],
      candidates:Object.keys(matrices).map(sourceSheet => ({ sourceSheet })),
      report:{ reportId:'dry_test', securityWarnings:[] },
      options
    };
  },
  async parseFile() { throw new Error('original_parse_file_should_not_run'); }
};
const sandbox = {
  window:{ Orbit:{ insurerDirectoryImport:fakeImporter } },
  Orbit:null,
  document:{ querySelector(){ return null; }, head:{ appendChild(){} }, createElement(){ return {}; } },
  URL,
  console,
  setTimeout,
  clearTimeout
};
sandbox.Orbit = sandbox.window.Orbit;
vm.createContext(sandbox);
try { vm.runInContext(src, sandbox, { filename:file }); }
catch (error) { fail.push({ id:'VM_LOAD', message:String(error && error.stack || error), file }); }

if (sandbox.Orbit.insurerDirectoryImport.quarantineDirectoryMatrices) {
  const matrices = {
    'Aseguradora Ficticia':[
      ['ASEGURADORA FICTICIA'],
      ['NOMBRE','CARGO','EMAIL'],
      ['Contacto Demo','Operaciones','contacto@example.invalid'],
      ['ACCESO AL SISTEMA EN LINEA'],
      ['PRODUCTO','LINK','USUARIO','CONTRASEÑA'],
      ['Portal','https://example.invalid','usuario.demo','clave-demo']
    ],
    'Hoja Técnica Renombrada':[
      ['CONFIGURACION DE SERVICIO'],
      ['Firebase config'],
      ['Project ID','proyecto-ficticio'],
      ['SYNTHETIC_PRIVATE_MARKER','no-exportar']
    ],
    'Personal':[
      ['DIRECTORIO DE PERSONAL'],
      ['NOMBRE','CARGO','EMAIL']
    ],
    'Índice':[['Resumen de hojas']]
  };

  const q = sandbox.Orbit.insurerDirectoryImport.quarantineDirectoryMatrices(matrices);
  check('LEGITIMATE_PRESERVED', Object.prototype.hasOwnProperty.call(q.filtered, 'Aseguradora Ficticia'), 'Una hoja operativa con usuario/contraseña de portal no se confunde con configuración técnica');
  check('TECH_EXCLUDED', q.excluded.some(x => x.sheet === 'Hoja Técnica Renombrada' && x.reason === 'hoja_tecnica_sensible'), 'Hoja técnica renombrada queda excluida por contenido');
  check('PERSONNEL_EXCLUDED', q.excluded.some(x => x.sheet === 'Personal' && x.reason === 'hoja_personal_interno'), 'Directorio interno queda excluido');
  check('INDEX_EXCLUDED', q.excluded.some(x => x.sheet === 'Índice' && x.reason === 'hoja_soporte_por_nombre'), 'Índice queda excluido por nombre');

  const result = sandbox.Orbit.insurerDirectoryImport.parseMatrices(matrices, { country:'GT', captureSecure:true });
  check('BASE_RECEIVES_FILTERED_ONLY', lastMatrices && Object.keys(lastMatrices).length === 1 && lastMatrices['Aseguradora Ficticia'], 'El parser base recibe solo hojas permitidas');
  check('SUMMARY_COUNTS', result.report && result.report.quarantineSummary && result.report.quarantineSummary.excludedSheets === 3, 'Resumen registra conteos sin valores');
  check('SECURITY_WARNING', result.report.securityWarnings.includes('archivo_contiene_hojas_tecnicas_excluidas'), 'Dry-run advierte que el archivo contenía hojas técnicas');
  check('NO_PRIVATE_MARKER_LEAK', !JSON.stringify(result).includes('SYNTHETIC_PRIVATE_MARKER'), 'El resultado no filtra contenido técnico excluido');
}

const syntax = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
check('SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis válida' : String(syntax.stderr || syntax.stdout).trim());

const result = {
  validator:'orbit360-validar-cuarentena-hojas-aseguradoras-v1219',
  generatedAt:new Date().toISOString(),
  summary:{ pass:pass.length, fail:fail.length },
  pass, fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
