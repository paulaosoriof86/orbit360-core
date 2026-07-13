#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] || process.cwd());
const runner = path.join(repo, 'tools', 'orbit360-run-aseguradoras-op2-plataformas-resume.ps1');
const pass = [];
const fail = [];
const check = (id, ok, message) => (ok ? pass : fail).push({
  id,
  message,
  file: 'tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1'
});
const src = fs.existsSync(runner) ? fs.readFileSync(runner, 'utf8') : '';
const has = pattern => typeof pattern === 'string' ? src.includes(pattern) : pattern.test(src);
const indexOfAny = values => {
  const indexes = values.map(value => src.indexOf(value)).filter(index => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
};

const crmScenarios = [
  'dir-clientes-desktop','dir-cliente-desktop','dir-calidad-desktop','dir-poliza-desktop',
  'op-cliente-tablet','op-calidad-tablet','ase-cliente-mobile','ase-calidad-mobile',
  'ase-poliza-mobile','dir-portal-mobile'
];
const approvedOp2 = [
  'dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop',
  'dir-documentos-desktop','dir-tarifas-desktop','op-directorio-tablet','op-resumen-tablet',
  'op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile'
];
const pendingOp2 = ['dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile'];

check('FILE', fs.existsSync(runner), 'Reanudador focalizado presente');
check('JSONL_READER', has('function Read-JsonLines'), 'Evidencia se lee desde results.jsonl');
check(
  'NO_REPORT_WORDING_DEPENDENCY',
  !has(/Select-String|HasScenarios|\$t\s*-match\s*['"]12\/15['"]/i),
  'No depende de frases, tildes o codificación del reporte'
);
check(
  'CRM_JSONL_DIRECTORY',
  has(/Get-ChildItem\s+\$Reports\s+-Directory\s+-Filter\s+['"]VISUAL-CRM-OP1-\*['"]/),
  'CRM se localiza por carpeta de evidencia'
);
check(
  'OP2_JSONL_DIRECTORY',
  has(/Get-ChildItem\s+\$Reports\s+-Directory\s+-Filter\s+['"]VISUAL-ASEGURADORAS-OP2-\*['"]/),
  'OP2 parcial se localiza por carpeta de evidencia'
);
check('CRM_EXPECTED_10', crmScenarios.every(id => has(`'${id}'`)), 'CRM exige los diez escenarios');
check('OP2_APPROVED_12', approvedOp2.every(id => has(`'${id}'`)), 'OP2 reutiliza exactamente los doce aprobados');
check('OP2_PENDING_3', pendingOp2.every(id => has(`'${id}'`)), 'OP2 conserva únicamente tres pendientes');
check('BOOLEAN_OK', has(/\$ByScenario\[\$Id\]\.ok\s+-ne\s+\$true/), 'La aprobación usa booleano JSON y no texto visible');
check(
  'SCREENSHOT_GATE',
  has('function Test-ScreenshotSet') && has(/\(\$Id\s*\+\s*['"]\.png['"]\)/),
  'Evidencia exige capturas físicas'
);
check(
  'FOCUSED_SMOKE_ONLY',
  has('orbit360-smoke-op2-plataformas-focused-v1218.mjs') &&
    !has('orbit360-smoke-visual-aseguradoras-op2.mjs'),
  'Ejecuta solo el smoke focalizado y no repite la matriz completa'
);
const reuseIndex = indexOfAny([
  "Step '4. Reuse approved evidence without repeating scenarios'",
  "Step '4. Verificar evidencia reutilizable sin repetir escenarios'"
]);
const browserIndex = indexOfAny([
  "Step '6. Run only the 3 pending Platform views'",
  "Step '6. Ejecutar solo las 3 vistas pendientes de Plataformas'"
]);
check(
  'REUSE_BEFORE_BROWSER',
  reuseIndex >= 0 && browserIndex >= 0 && reuseIndex < browserIndex &&
    src.indexOf('Find-CrmEvidence') < browserIndex && src.indexOf('Find-Op2PartialEvidence') < browserIndex,
  'Verifica evidencia reutilizable antes del navegador'
);
check(
  'AUTO_PORT',
  has('function Resolve-Port') && has(/5000;\s*\$Port\s+-le\s+5040/),
  'Puerto se elige automáticamente'
);
check('NO_STOP_PROCESS', !has(/Stop-Process/i), 'No cierra otras aplicaciones');
check(
  'SAFE_SYNC',
  has('function Sync-BranchSafe') &&
    has(/['"]fetch['"].*['"]origin['"].*\$Branch/s) &&
    has(/['"]merge['"].*['"]--ff-only['"].*origin\/\$Branch/s),
  'Sincroniza únicamente por avance rápido'
);
check(
  'SAFE_INTEGRATION',
  has('orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1') &&
    has(/idempotent local integration with backup|integración local idempotente con backup/i),
  'Integra con pipeline seguro antes del smoke'
);
check(
  'V1220_VALIDATORS',
  has('orbit360-validar-aseguradoras-op2-v1220.mjs') &&
    has('orbit360-validar-alias-directorios-aseguradoras-v1219.mjs') &&
    has('orbit360-validar-copy-importador-aseguradoras-v1220.mjs'),
  'Ejecuta contratos vigentes v1.220'
);
check(
  'FINAL_JSONL_COMBINE',
  has(/Verify JSONL and combine OP2 closure 15\/15|Verificar JSONL y combinar cierre 15\/15/i) &&
    pendingOp2.every(id => has(`'${id}'`)) &&
    has(/12 reused \+ 3 focused = 15\/15|12 reutilizados \+ 3 focalizados = 15\/15/i),
  'Cierre combinado depende del JSONL focalizado'
);
check(
  'NO_AUTOMATIC_COMMIT_PUSH_DEPLOY',
  !/git[^\r\n]+(?:commit|push)|firebase(?:\.cmd)?\s+deploy/i.test(src),
  'No hace commit, push ni deploy'
);
check(
  'CAPTURED_NATIVE_EXIT_CODE',
  has('Start-Process') && has('RedirectStandardOutput') && has('RedirectStandardError') && has(/\.ExitCode\s+-ne\s+0/),
  'Procesos nativos se evalúan por exit code y conservan stdout/stderr'
);

const psCandidates = process.platform === 'win32' ? ['powershell.exe', 'powershell'] : ['pwsh'];
let syntax = null;
for (const candidate of psCandidates) {
  const attempt = spawnSync(candidate, [
    '-NoProfile',
    '-Command',
    `[void][scriptblock]::Create([IO.File]::ReadAllText('${runner.replace(/'/g, "''")}'))`
  ], { encoding: 'utf8' });
  if (!attempt.error || attempt.error.code !== 'ENOENT') {
    syntax = attempt;
    break;
  }
}
check(
  'POWERSHELL_SYNTAX',
  syntax && syntax.status === 0,
  syntax && syntax.status === 0
    ? 'Sintaxis PowerShell válida'
    : String((syntax && (syntax.stderr || syntax.stdout)) || 'PowerShell no disponible').trim()
);

const result = {
  validator: 'orbit360-validar-resume-evidence-op1-op2-v1220',
  generatedAt: new Date().toISOString(),
  summary: { pass: pass.length, fail: fail.length },
  pass,
  fail
};
console.log(JSON.stringify(result, null, 2));
process.exit(fail.length ? 1 : 0);
