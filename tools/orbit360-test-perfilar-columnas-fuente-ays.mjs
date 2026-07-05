#!/usr/bin/env node
/* Orbit 360 A&S — pruebas sintéticas del perfilador de columnas por fuente
   No datos reales, no writes, no deploy.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tool = path.join(root, 'tools', 'orbit360-perfilar-columnas-fuente-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'perfil-columnas-fuente');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];

function writeJson(file, data){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function base(source_type, fields){ return { tenant_id:'alianzas-soluciones', source_type, file:'sintetico.xlsx', file_hash:'sha256:synthetic', country:'GT', currency:'GTQ', schema:{ fields } }; }
function run(id, manifest, expectedExit, needles){
  const file = path.join(tmp, `${id}.manifest.local.json`);
  writeJson(file, manifest);
  const res = spawnSync(process.execPath, [tool, '--manifest', file], { cwd:root, encoding:'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const ok = res.status === expectedExit && needles.every(n => out.includes(n));
  results.push(`${ok ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}

if(!fs.existsSync(tool)){ console.error('No existe perfilador.'); process.exit(1); }

run('banco-listo', base('estado_cuenta_bancario', ['Fecha movimiento','Descripción','Monto','Moneda','País','Referencia']), 0, ['Decision: PERFIL_LISTO']);
run('planilla-comisiones-lista', base('planilla_comisiones', ['Aseguradora','Periodo','Comisión','Moneda','País','Póliza']), 0, ['Decision: PERFIL_LISTO']);
run('polizas-faltante', base('polizas', ['Póliza','Cliente','Aseguradora','Estado','Moneda','País']), 1, ['Decision: PERFIL_BLOQUEADO','prima_neta']);
run('clientes-probable', base('clientes', ['Nombre del cliente','NIT','Whatsapp','Asesor']), 0, ['Decision: PERFIL_LISTO_CON_ADVERTENCIAS']);
run('financiero-listo', base('financiero_historico', ['Fecha','Concepto','Monto','Tipo movimiento','Moneda','País','Rubro']), 0, ['Decision: PERFIL_LISTO']);
run('sin-columnas', base('clientes', []), 1, ['Decision: PERFIL_BLOQUEADO','No hay columnas']);
run('fuente-sin-perfil', base('fuente_desconocida', ['A','B']), 1, ['Decision: PERFIL_BLOQUEADO','Fuente sin perfil']);

const output = [
  '============================================================',
  'ORBIT 360 A&S — TEST PERFIL COLUMNAS POR FUENTE',
  `Fecha: ${new Date().toISOString()}`,
  'Restricciones: sintético, sin datos reales, sin writes, sin deploy.',
  '============================================================',
  '',
  `Casos: ${results.length}`,
  `FAIL: ${failures.length}`,
  '',
  ...results,
  '',
  ...failures,
  '',
  failures.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');
fs.mkdirSync(reports, {recursive:true});
fs.writeFileSync(path.join(reports, 'TEST-PERFIL-COLUMNAS-FUENTE-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
