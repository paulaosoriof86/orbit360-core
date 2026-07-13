#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const file = path.join(repo, 'tools', 'orbit360-smoke-op2-plataformas-focused-v1221.mjs');
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const pass = [];
const fail = [];
const check = (id, ok, message) => (ok ? pass : fail).push({ id, message, file:'tools/orbit360-smoke-op2-plataformas-focused-v1221.mjs' });

check('FILE', fs.existsSync(file), 'Smoke v1.221 presente');
check('THREE_SCENARIOS', (source.match(/dir-plataformas-desktop|op-plataformas-tablet|ase-plataformas-mobile/g) || []).length >= 3, 'Conserva exactamente las tres vistas de Plataformas');
check('SCOPED_ROW_SELECTION', source.includes("rows.find(x=>(x.innerText||'').includes('Portal Ficticio'))"), 'Selecciona la tarjeta concreta del portal');
check('SCOPED_BUTTON', source.includes("row&&row.querySelector('[data-op2-view-credential]')"), 'El botón se busca dentro de la tarjeta seleccionada');
check('SCOPED_USERNAME', source.includes("row.querySelector('[data-op2-username]')"), 'El usuario revelado se valida dentro de la misma tarjeta');
check('SCOPED_PASSWORD', source.includes("row.querySelector('[data-op2-password]')"), 'La contraseña revelada se valida dentro de la misma tarjeta');
check('BOTH_VALUES_VISIBLE', source.includes("rowText.includes(user)&&rowText.includes(secret)"), 'La visibilidad exige usuario y contraseña en la tarjeta');
check('DIRECT_PROVIDER_GATE', source.includes('revealed&&direct&&secretVisible&&policy.credentialsVisible===true'), 'La aprobación exige UI, proveedor y política');
check('ADVISOR_RESTRICTION', source.includes("restricted&&!buttons&&!secretVisible&&policy.credentialsVisible===false"), 'Asesor conserva restricción sin secretos');
check('TEMP_PROFILE', source.includes("path.join(os.tmpdir(), `o2p21-"), 'Perfiles fuera de evidencia');
check('PROFILE_CLEANUP', source.includes('removeProfile(profileRoot)'), 'Limpieza automática de perfiles');
check('NO_DEPLOY', !/firebase(?:\.cmd)?\s+deploy|git\s+(?:commit|push|merge)/i.test(source), 'Sin deploy, commit, push ni merge');

const syntax = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
check('NODE_SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis Node válida' : String(syntax.stderr || syntax.stdout).trim());

const result = {
  validator:'orbit360-validar-smoke-op2-plataformas-focused-v1221',
  generatedAt:new Date().toISOString(),
  summary:{ pass:pass.length, fail:fail.length },
  pass,
  fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
