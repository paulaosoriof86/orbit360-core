#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const file = path.join(repo, 'orbit360-platform', 'core', 'insurer-directory-import-v1202-security.js');
const pass = [], fail = [];
const check = (id, ok, message) => (ok ? pass : fail).push({ id, message, file:'orbit360-platform/core/insurer-directory-import-v1202-security.js' });

check('FILE', fs.existsSync(file), 'Guard de copy y escritura presente');
const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
check('FRIENDLY_ERROR_MAP', src.includes('const ERROR_COPY') && src.includes('friendlyError'), 'Códigos conocidos tienen mensajes operativos');
check('UNKNOWN_CODE_FAILS_CLOSED', src.includes("if (/^[a-z0-9_]+$/i.test(key))"), 'Código desconocido no se muestra en crudo');
check('VISIBLE_COPY_SANITIZER', src.includes('function friendlyVisibleText') && src.includes('function cleanVisibleCopy'), 'Copy visible se sanitiza');
check('NO_INNER_HTML_REWRITE', !src.includes('node.innerHTML ='), 'Sanitización usa texto y no inyecta HTML');
check('MUTATION_WATCH', src.includes('characterData:true'), 'Cambios tardíos de texto también se revisan');
check('APPLY_BLOCKED_WITH_FRIENDLY_COPY', src.includes("errors:[ERROR_COPY.backend_operativo_requerido_para_aplicar_datos_reales]"), 'Aplicación bloqueada devuelve copy operativo');

let applyCalls = 0;
const fakeImporter = {
  applyApproved(){ applyCalls++; return { ok:false, errors:['confirmacion_reforzada_requerida','codigo_interno_desconocido'] }; },
  open(){ return true; }
};
const sandbox = {
  window:{ OrbitBackend:{ status(){ return {}; } } },
  Orbit:{
    insurerDirectoryImport:fakeImporter,
    store:{ raw(){ return {}; } },
    ui:{ toast(){} }
  },
  document:{ getElementById(){ return null; } },
  MutationObserver:function(){},
  setTimeout(fn){ fn(); }
};
sandbox.window.Orbit = sandbox.Orbit;
sandbox.OrbitBackend = sandbox.window.OrbitBackend;
vm.createContext(sandbox);
try { vm.runInContext(src, sandbox, { filename:file }); }
catch (error) { fail.push({ id:'VM_LOAD', message:String(error && error.stack || error), file }); }

const D = sandbox.Orbit.insurerDirectoryImport;
if (D && D.friendlyImportError) {
  const blocked = D.applyApproved({}, {});
  check('BACKEND_BLOCKED', blocked && blocked.ok === false && applyCalls === 0, 'Sin conexión segura no se llama la aplicación base');
  check('BLOCKED_COPY_HUMAN', blocked.errors && blocked.errors[0] === 'La conexión segura de la organización aún no está disponible.', 'Bloqueo no expone código técnico');
  check('KNOWN_ERROR_HUMAN', D.friendlyImportError('confirmacion_reforzada_requerida').includes('motivo'), 'Error conocido se traduce');
  check('UNKNOWN_ERROR_HUMAN', D.friendlyImportError('codigo_interno_desconocido') === 'La operación requiere una revisión adicional antes de continuar.', 'Error desconocido usa mensaje seguro');
  const visible = D.__backendWriteGuardV1220.friendlyVisibleText('credentialRef/accountRef = backend_required en Orbit.store');
  check('VISIBLE_TECH_REMOVED', !/Orbit\.store|credentialRef|accountRef|backend_required/i.test(visible), 'Copy técnico se elimina de la vista');
  const fileCopy = D.__backendWriteGuardV1220.friendlyVisibleText('El archivo se procesa en el navegador. No se sube al repositorio.');
  check('FILE_COPY_OPERATIONAL', fileCopy === 'El archivo se revisa de forma segura y solo se conserva el resultado de la revisión.', 'Mensaje del archivo es operativo');
  const rawCode = D.__backendWriteGuardV1220.friendlyVisibleText('No se pudo procesar el Excel: xlsx_no_disponible');
  check('RAW_CODE_REMOVED', !/xlsx_no_disponible/i.test(rawCode), 'Error de lectura no muestra código');
}

const forbidden = ['Orbit.store','credentialRef','accountRef','backend_required','Firestore','Firebase','LAB','localStorage','mock'];
const mappedText = src.match(/ERROR_COPY\s*=\s*\{([\s\S]*?)\n\s*\};/)?.[1] || '';
check('ERROR_COPY_NO_FORBIDDEN_TERMS', forbidden.every(term => !mappedText.toLowerCase().includes(term.toLowerCase())), 'Mensajes de error no contienen términos técnicos');

const syntax = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
check('SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis válida' : String(syntax.stderr || syntax.stdout).trim());

const result = {
  validator:'orbit360-validar-copy-importador-aseguradoras-v1220',
  generatedAt:new Date().toISOString(),
  summary:{ pass:pass.length, fail:fail.length },
  pass, fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
