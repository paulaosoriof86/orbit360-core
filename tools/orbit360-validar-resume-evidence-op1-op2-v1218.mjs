#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const runner = path.join(repo, 'tools', 'orbit360-run-aseguradoras-op2-plataformas-resume.ps1');
const pass = [], fail = [];
const check = (id, ok, message) => (ok ? pass : fail).push({ id, message, file:'tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1' });
const src = fs.existsSync(runner) ? fs.readFileSync(runner, 'utf8') : '';

check('FILE', fs.existsSync(runner), 'Reanudador focalizado presente');
check('JSONL_READER', src.includes('function Read-JsonLines'), 'Evidencia se lee desde results.jsonl');
check('NO_REPORT_WORDING_DEPENDENCY', !src.includes("$t-match'12/15'") && !src.includes("HasScenarios $t $failed 'FALLÓ'"), 'No depende de frases, tildes o codificación del reporte');
check('CRM_JSONL_DIRECTORY', src.includes("Get-ChildItem $Reports -Directory -Filter 'VISUAL-CRM-OP1-*'"), 'CRM se localiza por carpeta de evidencia');
check('OP2_JSONL_DIRECTORY', src.includes("Get-ChildItem $Reports -Directory -Filter 'VISUAL-ASEGURADORAS-OP2-*'"), 'OP2 parcial se localiza por carpeta de evidencia');
check('CRM_EXPECTED_10', (src.match(/'dir-clientes-desktop'|'dir-cliente-desktop'|'dir-calidad-desktop'|'dir-poliza-desktop'|'op-cliente-tablet'|'op-calidad-tablet'|'ase-cliente-mobile'|'ase-calidad-mobile'|'ase-poliza-mobile'|'dir-portal-mobile'/g) || []).length >= 10, 'CRM exige los diez escenarios');
check('OP2_APPROVED_12', src.includes("'dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop'") && src.includes("'op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile'"), 'OP2 reutiliza exactamente los doce aprobados');
check('OP2_PENDING_3', src.includes("$Pending = @('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')"), 'OP2 conserva únicamente tres pendientes');
check('BOOLEAN_OK', src.includes("$ByScenario[$Id].ok -ne $true"), 'La aprobación usa booleano JSON y no texto visible');
check('SCREENSHOT_GATE', src.includes('function Test-ScreenshotSet') && src.includes("($Id + '.png')"), 'Evidencia exige capturas físicas');
check('NO_REPEAT_APPROVED', src.includes('Runs only 3 pending platform scenarios') && src.includes('Previously approved evidence remains valid and was not rerun'), 'No repite escenarios aprobados');
check('AUTO_PORT', src.includes('function Resolve-Port') && src.includes('5000; $Port -le 5040'), 'Puerto se elige automáticamente');
check('NO_STOP_PROCESS', !src.includes('Stop-Process'), 'No cierra otras aplicaciones');
check('FINAL_JSONL_COMBINE', src.includes('Verify focused JSONL evidence and combine 15/15') && src.includes('12 reused + 3 focused = 15/15'), 'Cierre combinado depende de JSONL focalizado');

const ps = process.platform === 'win32' ? 'powershell' : 'pwsh';
const syntax = spawnSync(ps, ['-NoProfile','-Command',`[void][scriptblock]::Create([IO.File]::ReadAllText('${runner.replace(/'/g,"''")}'))`], { encoding:'utf8' });
check('POWERSHELL_SYNTAX', syntax.status === 0, syntax.status === 0 ? 'Sintaxis PowerShell válida' : String(syntax.stderr || syntax.stdout).trim());

const result = {
  validator:'orbit360-validar-resume-evidence-op1-op2-v1218',
  generatedAt:new Date().toISOString(),
  summary:{ pass:pass.length, fail:fail.length },
  pass, fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
