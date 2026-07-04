#!/usr/bin/env node
/* Test seguro del contrato canónico de fuentes A&S. No usa datos reales. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const script = path.join(root, 'tools', 'orbit360-generar-contrato-fuentes-ays.mjs');
const res = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
const out = `${res.stdout || ''}\n${res.stderr || ''}`;
const needles = [
  'CONTRATO CANONICO DE FUENTES',
  'Tipos: 12',
  'Errores: 0',
  'financiero_historico',
  'documentos_soporte',
  'planilla_comisiones',
  'No mezclar fuentes'
];
const ok = res.status === 0 && needles.every(n => out.includes(n));
if (!ok) {
  console.error('Fallo test contrato fuentes A&S');
  console.error(out);
  process.exit(1);
}
console.log('OK - contrato canónico de fuentes A&S generado y validado.');
