#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, '_orbit360_reports');
fs.mkdirSync(outDir, { recursive: true });

const steps = [
  ['check-integraciones', ['node', '--check', 'orbit360-platform/core/integraciones-panel.js']],
  ['check-conciliaciones', ['node', '--check', 'orbit360-platform/modules/conciliaciones.js']],
  ['check-inicio', ['node', '--check', 'orbit360-platform/modules/inicio.js']],
  ['check-portal-fix', ['node', '--check', 'orbit360-platform/modules/portal-v1142-copyfix.js']],
  ['modelo-clientes', ['node', 'tools/orbit360-test-validar-modelo-clientes-ays.mjs']],
  ['modelo-polizas', ['node', 'tools/orbit360-test-validar-modelo-polizas-recibos-cartera-ays.mjs']],
  ['modelo-cobros', ['node', 'tools/orbit360-test-validar-modelo-cobros-pagos-conciliacion-ays.mjs']],
  ['modelo-documentos', ['node', 'tools/orbit360-test-validar-modelo-documentos-storage-adjuntos-ays.mjs']],
  ['revision-roles', ['node', 'tools/orbit360-validar-revision-roles-ays.mjs']]
];

const results = [];
for (const [id, cmd] of steps) {
  const file = cmd[cmd.length - 1];
  if (!fs.existsSync(path.join(root, file))) {
    results.push({ id, status: 1, note: 'archivo no encontrado: ' + file });
    continue;
  }
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: root, encoding: 'utf8' });
  results.push({ id, status: r.status ?? 1, stdout: (r.stdout || '').slice(-2500), stderr: (r.stderr || '').slice(-2500) });
}

const failed = results.filter(r => r.status !== 0);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const json = path.join(outDir, `VALIDACIONES-ACUMULADAS-AYS-${stamp}.json`);
const txt = json.replace(/\.json$/, '.txt');
const report = { created_at: new Date().toISOString(), decision: failed.length ? 'BLOQUEADO' : 'OK', total: results.length, failed: failed.length, results };
fs.writeFileSync(json, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(txt, [
  'ORBIT 360 A&S - VALIDACIONES ACUMULADAS',
  `Fecha: ${report.created_at}`,
  `Decision: ${report.decision}`,
  `Total: ${report.total}`,
  `Fallidos: ${report.failed}`,
  '',
  ...results.map(r => `${r.status === 0 ? 'OK' : 'FAIL'} ${r.id}`),
  '',
  failed.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n'), 'utf8');
console.log(fs.readFileSync(txt, 'utf8'));
process.exit(failed.length ? 1 : 0);
