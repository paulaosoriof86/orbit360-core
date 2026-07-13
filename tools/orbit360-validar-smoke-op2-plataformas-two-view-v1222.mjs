#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const file = path.join(repo, 'tools', 'orbit360-smoke-op2-plataformas-two-view-v1222.mjs');
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const pass = [];
const fail = [];
const check = (id, ok, message) => (ok ? pass : fail).push({ id, message, file:'tools/orbit360-smoke-op2-plataformas-two-view-v1222.mjs' });

check('FILE', fs.existsSync(file), 'Smoke delta v1.222 presente');
check('ONLY_TWO_CASES', source.includes("['dir-plataformas-desktop', 'Dirección', 1366, 900]") && source.includes("['op-plataformas-tablet', 'Operativo', 768, 950]") && !source.includes("['ase-plataformas-mobile'"), 'Ejecuta solo Dirección y Operativo');
check('ADVISOR_REUSED', source.includes('Asesor movil se reutiliza') && source.includes('ni Asesor movil'), 'Asesor queda explícitamente reutilizado');
check('SCOPED_ROW', source.includes("rows.find(x=>(x.innerText||'').includes('Portal Ficticio'))"), 'Selecciona la tarjeta concreta');
check('SCOPED_BUTTON', source.includes("row&&row.querySelector('[data-op2-view-credential]')"), 'Botón dentro de la tarjeta');
check('SCOPED_USERNAME', source.includes("row.querySelector('[data-op2-username]')"), 'Usuario dentro de la tarjeta');
check('SCOPED_PASSWORD', source.includes("row.querySelector('[data-op2-password]')"), 'Contraseña dentro de la tarjeta');
check('VISUAL_AND_DIRECT', source.includes('revealed&&direct&&buttons&&secretVisible&&policy.credentialsVisible===true'), 'Aprobación exige UI, proveedor, botones y política');
check('TWO_RESULT_SUMMARY', source.includes('Resumen delta: ${2 - failures}/2 escenarios aprobados.'), 'Resumen exige 2/2');
check('TEMP_PROFILE', source.includes("path.join(os.tmpdir(), `o2p22-"), 'Perfiles temporales fuera de evidencia');
check('PROFILE_CLEANUP', source.includes('removeProfile(profileRoot)'), 'Limpieza automática de perfiles');
check('NO_DEPLOY', !/firebase(?:\.cmd)?\s+deploy|git\s+(?:commit|push|merge)/i.test(source), 'Sin deploy, commit, push ni merge');

const syntax = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
check('NODE_SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis Node válida' : String(syntax.stderr || syntax.stdout).trim());

const result = {
  validator:'orbit360-validar-smoke-op2-plataformas-two-view-v1222',
  generatedAt:new Date().toISOString(),
  summary:{ pass:pass.length, fail:fail.length },
  pass,
  fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
