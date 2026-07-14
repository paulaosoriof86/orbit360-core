#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { appendProtectedChecks } from './orbit360-protected-baseline.mjs';

const root = path.resolve(process.argv[2] || path.join(process.cwd(), 'orbit360-platform'));
const file = path.join(root, 'modules', 'aseguradoras-op2-operational-resources.js');
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const pass = [];
const fail = [];
const check = (id, ok, message) => (ok ? pass : fail).push({ id, message, file:'modules/aseguradoras-op2-operational-resources.js' });

check('FILE', fs.existsSync(file), 'Módulo operativo presente');
check('VERSION', source.includes('recursos operativos v1.223'), 'Versión v1.223 documentada');
check('TRANSIENT_SCOPED_KEY', source.includes('function credentialTransientKey') && source.includes("clean(a && a.id) + '|' + String(index)"), 'Estado temporal aislado por aseguradora e índice');
check('NO_INDEX_ONLY_TRANSIENT', !/transient\.(?:get|set|delete)\(index\)/.test(source), 'No usa índice global como clave temporal');
check('RERENDER_PRESERVES_VISIBLE_VALUES', source.includes('const active = transient.get(credentialTransientKey(a, index)) || {}') && source.includes('active.password ? clean(active.password)'), 'Re-render conserva credencial temporal visible');
check('LIVE_ROW_LOOKUP', source.includes('function livePlatformRow') && source.includes("document.getElementById('host')") && source.includes('data-op2-platform'), 'Reubica la tarjeta viva después de auditoría');
check('SET_BEFORE_ENHANCE', source.indexOf('transient.set(key, values)') < source.indexOf("enhance(document.getElementById('host'))"), 'Guarda estado temporal antes de reconciliar la ficha');
check('LIVE_PAINT', source.includes('const row = livePlatformRow(index, fallbackRow)') && source.includes('paintCredential(row, values, key, index)'), 'Pinta sobre tarjeta viva');
check('LIVE_BUTTON_ENABLE', source.includes('const liveButton = liveRow && liveRow.querySelector') && source.includes('liveButton.disabled = false'), 'Reactiva botón vivo');
check('TTL_DELETE', source.includes('transient.delete(key)') && source.includes('15000'), 'Borra secreto temporal a los 15 segundos');
check('NO_BROWSER_STORAGE', !/\b(?:window\s*\.\s*)?(?:localStorage|sessionStorage)\s*(?:\.|\[)/.test(source), 'No persiste secretos en almacenamiento del navegador');
check('NO_STORE_SECRET_WRITE', !/Orbit\.store\.(?:insert|update)\([^\n]*(?:password|contrasena|secret)/i.test(source), 'No escribe secretos en Orbit.store');

const syntax = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
check('NODE_SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis válida' : String(syntax.stderr || syntax.stdout).trim());
appendProtectedChecks(pass, fail, root);

const result = {
  validator:'orbit360-validar-aseguradoras-op2-rerender-v1223',
  generatedAt:new Date().toISOString(),
  root,
  summary:{ pass:pass.length, fail:fail.length },
  pass,
  fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
