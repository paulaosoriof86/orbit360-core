#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const file = path.join(repo, 'tools', 'orbit360-smoke-op2-plataformas-live-v1223.mjs');
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const pass = [];
const fail = [];
const check = (id, ok, message) => (ok ? pass : fail).push({ id, message, file:'tools/orbit360-smoke-op2-plataformas-live-v1223.mjs' });

check('FILE', fs.existsSync(file), 'Smoke vivo v1.223 presente');
check('ONLY_TWO_SCENARIOS', source.includes("['dir-plataformas-desktop','Dirección',1366,900]") && source.includes("['op-plataformas-tablet','Operativo',768,950]") && !source.includes("['ase-plataformas-mobile'"), 'Ejecuta solo Dirección y Operativo');
check('LIVE_ROW_FUNCTION', source.includes('const findRow=()=>') && source.includes("d.querySelectorAll('[data-op2-platform]')"), 'Reubica tarjeta viva en cada lectura');
check('LIVE_REVEAL_WAIT', source.includes('const current=findRow()') && source.includes('row=current;return true'), 'Espera revelado sobre tarjeta actual');
check('CONNECTED_DOM', source.includes('d.documentElement.contains(liveRow)') && source.includes('connected&&secretVisible'), 'Exige tarjeta conectada al DOM');
check('DIRECT_PROVIDER', source.includes("await R.revealCredential('cred_smoke_op2_v1223'") && source.includes('directOut.username===username'), 'Confirma proveedor seguro además de UI');
check('POLICY_GATE', source.includes('policy.credentialsVisible===true'), 'Respeta política de credenciales');
check('NO_ADVISOR_REPEAT', source.includes('Sin deploy, datos reales ni repetición de CRM/12 vistas/Asesor.'), 'No repite Asesor ni matrices aprobadas');
check('TEMP_PROFILES', source.includes("path.join(os.tmpdir(), `o2p23-") && source.includes('remove(profiles)'), 'Perfiles fuera de evidencia y con limpieza');
check('TWO_OF_TWO', source.includes('Resumen delta vivo: ${2-failures}/2 escenarios aprobados.'), 'Cierre exige 2/2');
check('NO_DEPLOY', !/firebase(?:\.cmd)?\s+deploy|git\s+(?:commit|push|merge)/i.test(source), 'Sin deploy, commit, push ni merge');

const syntax = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
check('NODE_SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis Node válida' : String(syntax.stderr || syntax.stdout).trim());

const result = {
  validator:'orbit360-validar-smoke-op2-plataformas-live-v1223',
  generatedAt:new Date().toISOString(),
  summary:{ pass:pass.length, fail:fail.length },
  pass,
  fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
