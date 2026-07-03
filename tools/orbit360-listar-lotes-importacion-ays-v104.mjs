#!/usr/bin/env node
/* Orbit 360 · Listar lotes importación A&S v1.104
   Lista payloads locales en _orbit360_exports para trazabilidad previa a rollback/carga.
   Sin red, sin Firebase, sin escritura remota. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exportDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, '_orbit360_exports');
const reportDir = path.join(root, '_orbit360_reports');
const reportPath = path.join(reportDir, 'LOTES-IMPORTACION-AYS-V104.txt');
const rows = [];
const warnings = [];

function listFiles(dir){
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(x => x.isFile() && /^payload-importacion-ays-lab-v104-.*\.json$/.test(x.name))
    .map(x => path.join(dir, x.name));
}

if (!fs.existsSync(exportDir)) warnings.push(`No existe carpeta de exports: ${exportDir}`);
for (const file of listFiles(exportDir)) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const collections = data.collections || {};
    const counts = Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
    const total = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);
    rows.push({
      file: path.relative(root, file).replaceAll(path.sep, '/'),
      batchId: data.batchId || '',
      tenantId: data.tenantId || '',
      dryRun: data.dryRun !== false,
      total,
      collections: counts
    });
  } catch (e) {
    warnings.push(`${file}: no se pudo leer payload: ${e.message}`);
  }
}

const lines = [
  '============================================================',
  'ORBIT 360 - LOTES IMPORTACION A&S v1.104',
  `Fecha: ${new Date().toISOString()}`,
  `ExportDir: ${exportDir}`,
  'Restricciones: sin red, sin Firebase, sin escritura remota.',
  '============================================================',
  '',
  `Lotes encontrados: ${rows.length}`,
  ...rows.map(r => `LOTE: ${r.batchId} | tenant=${r.tenantId} | dryRun=${r.dryRun} | filas=${r.total} | archivo=${r.file} | colecciones=${JSON.stringify(r.collections)}`),
  '',
  `Warnings: ${warnings.length}`,
  ...warnings.map(w => `WARN: ${w}`),
  '',
  'RESULTADO: OK'
];
const output = lines.join('\n');
console.log(output);
try { fs.mkdirSync(reportDir, { recursive: true }); fs.writeFileSync(reportPath, output, 'utf8'); } catch {}
