#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const file = path.join(repo, 'tools', 'orbit360-smoke-visual-aseguradoras-op2.mjs');
const pass = [], fail = [];
function check(id, ok, message) { (ok ? pass : fail).push({ id, message, file:'tools/orbit360-smoke-visual-aseguradoras-op2.mjs' }); }

check('FILE', fs.existsSync(file), 'Smoke visual presente');
const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
check('VIEW_DECLARED', src.includes('const ROLE=${JSON.stringify(role)}, VIEW=${JSON.stringify(view)}, SCENARIO=${JSON.stringify(scenario)};'), 'VIEW se declara dentro del harness');
check('VIEW_RESULT_EXPLICIT', src.includes('roleAvailable,view:VIEW,route:'), 'El resultado usa view:VIEW explícitamente');
check('NO_BARE_VIEW_RESULT', !src.includes('roleAvailable,view,route:'), 'No existe referencia libre a view dentro del harness');
check('VIEW_ERROR_EXPLICIT', src.includes('roleRequested:ROLE,view:VIEW,errors:'), 'Los errores conservan la vista solicitada');
check('SKIP_VALIDATORS_SUPPORTED', src.includes("const skipValidators = argv.includes('--skip-validators');") && src.includes('const validators = skipValidators ? [] : ['), 'La reanudación puede omitir validadores ya aprobados');
check('SCENARIOS_15', (src.match(/id:'(?:dir|op|ase)-/g) || []).length === 15, 'La matriz conserva 15 escenarios');
check('ACCOUNT_POLICY_ASSERTED', src.includes('accountFull') && src.includes('accountCopy'), 'La matriz valida cuenta completa y copia');
check('CREDENTIAL_POLICY_ASSERTED', src.includes('credentialRevealed') && src.includes('credentialRestricted'), 'La matriz valida credenciales por rol');
const syntax = spawnSync(process.execPath, ['--check', file], { encoding:'utf8' });
check('SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis válida' : String(syntax.stderr || syntax.stdout).trim());

const result = {
  validator:'orbit360-validar-smoke-aseguradoras-op2-v1218',
  generatedAt:new Date().toISOString(),
  summary:{ pass:pass.length, fail:fail.length },
  pass, fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
